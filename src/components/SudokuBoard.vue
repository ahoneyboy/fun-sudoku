<script setup>
/**
 * 数独棋盘（单层扁平 grid 实现）
 *
 * 【为什么是单层 grid】旧版用"外层宫 grid + 内层格子 grid"嵌套，
 * 嵌套 1fr 轨道 + aspect-square 单元格在浏览器里会产生环形尺寸传递，
 * 实测最右侧宫的格子会按整个棋盘宽去解析宽度，越出容器右缘。
 *
 * 新结构：
 *   外层淡紫厚框 bg-[#CDB9F0] p-[5px]（宫线底色 / 粗线）
 *   → 内层 aspect-square 容器，行列都是 repeat(size, minmax(0,1fr))
 *     → 格子天然正方形、绝不过溢（minmax(0,1fr) 封死最小尺寸）
 *   → 宫边界用 3px 淡紫描边（粗线），宫内用 1px 极浅描边（细线）
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

const props = defineProps({
  size: { type: Number, required: true }, // 4 / 6 / 9
  puzzle: { type: Array, required: true }, // 题面（0=空）
  user: { type: Array, required: true }, // 用户填的数（0=空）
  errors: { type: Array, required: true }, // 错误标红位
  selected: { type: Number, default: -1 },
});
const emit = defineEmits(['select']);

/** 宫几何（与引擎 getCfg 一致）：宫宽/宫高 */
const geo = computed(() => {
  if (props.size === 4) return { boxW: 2, boxH: 2 };
  if (props.size === 6) return { boxW: 3, boxH: 2 };
  return { boxW: 3, boxH: 3 };
});

const total = computed(() => props.size * props.size);

/** 选中格的同行/同列/同宫集合（淡色高亮） */
const peerSet = computed(() => {
  const s = new Set();
  if (props.selected < 0) return s;
  const n = props.size;
  const r = Math.floor(props.selected / n);
  const c = props.selected % n;
  for (let i = 0; i < n; i++) {
    s.add(r * n + i);
    s.add(i * n + c);
  }
  const br = Math.floor(r / geo.value.boxH) * geo.value.boxH;
  const bc = Math.floor(c / geo.value.boxW) * geo.value.boxW;
  for (let dr = 0; dr < geo.value.boxH; dr++) {
    for (let dc = 0; dc < geo.value.boxW; dc++) {
      s.add((br + dr) * n + (bc + dc));
    }
  }
  return s;
});

/** 选中格的数字（用于"同数字另一色高亮"），0 表示未选中或空格 */
const selValue = computed(() => {
  if (props.selected < 0) return 0;
  return props.puzzle[props.selected] || props.user[props.selected];
});

/**
 * 单格样式：错误 > 选中 > 同数字 > 同行列宫 > 白底；文字色按归属三色
 */
function cellClass(idx) {
  const given = props.puzzle[idx] !== 0;
  const err = props.errors[idx] && !!props.user[idx];
  let bg;
  let extra = '';
  if (err && idx !== props.selected) {
    bg = 'bg-[#FFE4EA]';
    extra = 'animate-shake';
  } else if (idx === props.selected) {
    // 选中格：粉底 + 粉色描边
    bg = 'bg-[#FFE4EA] ring-2 ring-[#E05C75] z-10';
  } else if (selValue.value && (props.puzzle[idx] || props.user[idx]) === selValue.value) {
    bg = 'bg-[#FFF3CE]'; // 同数字：奶油黄
  } else if (peerSet.value.has(idx)) {
    bg = 'bg-[#F7F2FF]'; // 同行/列/宫：淡紫
  } else {
    bg = 'bg-white';
  }
  const tc = err
    ? 'text-[#FF5A76]'
    : given
      ? 'text-[#5B4A54]'
      : 'text-[#4E8DF5]';
  return `${bg} ${tc} ${extra}`;
}

/**
 * 宫分隔线：处于宫右边界的格画 3px 淡紫粗线，其余非末列画 1px 极浅细线；
 * 底边同理。末行/末列交给外框，避免线重叠。
 */
function edgeClass(idx) {
  const n = props.size;
  const r = Math.floor(idx / n);
  const c = idx % n;
  const { boxW, boxH } = geo.value;
  let cls = '';
  if (c < n - 1) {
    cls +=
      (c + 1) % boxW === 0
        ? ' border-r-[3px] border-r-[#CDB9F0]'
        : ' border-r-[1px] border-r-[#F0EAFB]';
  }
  if (r < n - 1) {
    cls +=
      (r + 1) % boxH === 0
        ? ' border-b-[3px] border-b-[#CDB9F0]'
        : ' border-b-[1px] border-b-[#F0EAFB]';
  }
  return cls;
}

function displayValue(idx) {
  return props.puzzle[idx] || props.user[idx] || '';
}

function ariaLabel(idx) {
  const n = props.size;
  const r = Math.floor(idx / n) + 1;
  const c = (idx % n) + 1;
  const v = displayValue(idx);
  return v ? `第${r}行第${c}列，值 ${v}` : `第${r}行第${c}列，空格`;
}

// ---- 字号自适应：同步首测 + ResizeObserver/resize 双通道更新 ----
// 字号 = 格宽（板宽/size）的 52%。
// 为什么 onMounted 里同步 getBoundingClientRect：它强制同步布局，
// 不依赖渲染帧（ResizeObserver 回调要等渲染帧，个别环境不可见时不派发），
// 保证任何环境下首帧字号即正确。
const boardEl = ref(null);
const cellFont = ref(16);

function measure() {
  const el = boardEl.value;
  if (!el) return;
  // 减去左右 p-[5px] 内边距得到格子可用宽度
  const w = el.getBoundingClientRect().width - 10;
  if (w > 0) cellFont.value = Math.max(11, Math.round((w / props.size) * 0.52));
}

let ro = null;
onMounted(() => {
  measure();
  if (typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(() => measure());
    ro.observe(boardEl.value);
  }
  window.addEventListener('resize', measure);
});
onBeforeUnmount(() => {
  if (ro) ro.disconnect();
  window.removeEventListener('resize', measure);
});
// 切换难度时 size 变化，格子变宽/变窄，字号需重算
watch(() => props.size, () => measure());
</script>

<template>
  <div
    ref="boardEl"
    class="w-full rounded-[22px] bg-[#CDB9F0] p-[5px] shadow-[0_10px_24px_rgba(122,85,192,0.18)]"
    role="grid"
    :aria-label="`${size}宫数独棋盘`"
  >
    <!-- 单层 grid：行列均分且 minmax(0,1fr) 封死最小尺寸，格子恒为正方形 -->
    <div
      class="grid aspect-square w-full gap-0 rounded-[14px] bg-[#F3EDFC]"
      :style="{
        gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${size}, minmax(0, 1fr))`,
      }"
    >
      <button
        v-for="idx in total"
        :key="`${idx - 1}-${user[idx - 1]}`"
        type="button"
        class="flex min-w-0 min-h-0 items-center justify-center rounded-[4px] font-bold leading-none cursor-pointer select-none transition-colors duration-100 active:scale-95"
        :class="[cellClass(idx - 1), edgeClass(idx - 1)]"
        :style="{ fontSize: cellFont + 'px' }"
        :aria-label="ariaLabel(idx - 1)"
        @click="emit('select', idx - 1)"
      >
        {{ displayValue(idx - 1) }}
      </button>
    </div>
  </div>
</template>
