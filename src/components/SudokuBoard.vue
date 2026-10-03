<script setup>
/**
 * 数独棋盘（单层扁平 grid 实现）
 *
 * 【动效设计】
 * - 用户数字：Vue Transition name="num"（enter=弹性落格 / leave=缩小上浮淡出），
 *   覆盖重填时旧数字飞出 + 新数字落下同帧进行；
 *   数字 span 以 user 值为 key，每次改值都会重放入场动画。
 * - 格子：用户填数后加 .cell-fill-pop（外圈淡蓝涟漪，伪元素一次性动画）；
 * - 选中格：.animate-breath-glow（2s 呼吸光晕，opacity 脉动伪元素）；
 * - 填错：数字 span 摇摆下沉（.animate-error-in，随 key 重放），格子红晕闪两下（.cell-error-flash）；
 * - 提示：sparkIndex 命中的格子喷 5 颗星火（transform 放射 + 淡出）；
 * - 通关：celebrate=true 时每格按（行+列）对角线次序弹跳（扫描波）；
 * - 笔记：逐个 stagger 淡入。
 * 全部只动 transform / opacity。
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

const props = defineProps({
  size: { type: Number, required: true }, // 4 / 6 / 9
  puzzle: { type: Array, required: true }, // 题面（0=空）
  user: { type: Array, required: true }, // 用户填的数（0=空）
  errors: { type: Array, required: true }, // 错误标红位
  notes: { type: Array, default: () => [] }, // 每格铅笔笔记（数字数组）
  selected: { type: Number, default: -1 },
  sparkIndex: { type: Number, default: -1 }, // 提示星火命中的格子（仅视觉层）
  celebrate: { type: Boolean, default: false }, // 通关扫描波开关（仅视觉层）
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
 * 单格样式：选中 > 错误 > 同数字 > 同行列宫 > 白底；文字色按归属三色。
 * 错误红晕（cell-error-flash）独立于选中态叠加：报错时红晕临时接管 ::before，
 * 恢复正常后呼吸光晕自动回归。
 */
function cellClass(idx) {
  const given = props.puzzle[idx] !== 0;
  const err = props.errors[idx] && !!props.user[idx];
  let bg;
  let extra = '';
  if (idx === props.selected) {
    // 选中格：粉底 + 描边 + 呼吸光晕
    bg = 'bg-[#FFE4EA] ring-2 ring-[#E05C75] z-10';
    extra = 'animate-breath-glow';
  } else if (err) {
    bg = 'bg-[#FFE4EA]';
  } else if (selValue.value && (props.puzzle[idx] || props.user[idx]) === selValue.value) {
    bg = 'bg-[#FFF3CE]'; // 同数字：奶油黄
  } else if (peerSet.value.has(idx)) {
    bg = 'bg-[#F7F2FF]'; // 同行/列/宫：淡紫
  } else {
    bg = 'bg-white';
  }
  if (err) extra = 'cell-error-flash'; // 红晕脉冲（摇摆由数字 span 承担，每次填错重放）
  const tc = err
    ? 'text-[#FF5A76]'
    : given
      ? 'text-[#5B4A54]'
      : 'text-[#4E8DF5]';
  return `${bg} ${tc} ${extra}`;
}

/** 用户填过数的格子：落格涟漪（伪元素一次性动画，类随挂载触发） */
function fillPopClass(idx) {
  return props.user[idx] !== 0 ? 'cell-fill-pop' : '';
}

/** 通关扫描波延迟：按（行+列）对角线次序铺开 */
function waveDelay(idx) {
  const n = props.size;
  const r = Math.floor(idx / n);
  const c = idx % n;
  return `${(r + c) * 45}ms`;
}

/** 宫分隔线：宫右/下边界 3px 淡紫粗线，其余 1px 极浅细线 */
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

/** 四角格子外圆角：与外框内缘半径（22px 外框 - 5px 内边距 = 17px）对齐 */
function cornerClass(idx) {
  const n = props.size;
  const r = Math.floor(idx / n);
  const c = idx % n;
  const last = n - 1;
  if (r === 0 && c === 0) return 'rounded-tl-[17px]';
  if (r === 0 && c === last) return 'rounded-tr-[17px]';
  if (r === last && c === 0) return 'rounded-bl-[17px]';
  if (r === last && c === last) return 'rounded-br-[17px]';
  return '';
}

/** 该格展示的数字：题面优先，其次用户值 */
function displayValue(idx) {
  return props.puzzle[idx] || props.user[idx] || '';
}

/** 该格是否展示铅笔笔记：未填数且有笔记时展示 */
function noteList(idx) {
  if ((props.puzzle[idx] || props.user[idx]) !== 0) return [];
  return props.notes[idx] || [];
}

/** 提示星火的放射参数（5 颗，均匀角度，两档半径，马卡龙深色） */
const SPARK_COLORS = ['#B07E10', '#E05C75', '#3D6FB5', '#7A55C0', '#2E8B62'];
function sparkStyle(i) {
  const angle = -Math.PI / 2 + ((i - 1) * 2 * Math.PI) / 5;
  const radius = 22 + (i % 2) * 9;
  return {
    '--sx': `${Math.round(Math.cos(angle) * radius)}px`,
    '--sy': `${Math.round(Math.sin(angle) * radius)}px`,
    background: SPARK_COLORS[(i - 1) % SPARK_COLORS.length],
    animationDelay: `${(i - 1) * 45}ms`,
  };
}

function ariaLabel(idx) {
  const n = props.size;
  const r = Math.floor(idx / n) + 1;
  const c = (idx % n) + 1;
  const v = displayValue(idx);
  const tag = noteList(idx).length ? '，有笔记' : '';
  return v ? `第${r}行第${c}列，值 ${v}` : `第${r}行第${c}列，空格${tag}`;
}

// ---- 字号自适应：同步首测 + ResizeObserver/resize 双通道更新 ----
// onMounted 里 getBoundingClientRect 强制同步布局，不依赖渲染帧，首帧即正确
const boardEl = ref(null);
const cellFont = ref(16);

function measure() {
  const el = boardEl.value;
  if (!el) return;
  const w = el.getBoundingClientRect().width - 10; // 减去左右 p-[5px]
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
      class="grid aspect-square w-full gap-0 rounded-[17px] bg-[#F3EDFC]"
      :style="{
        gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${size}, minmax(0, 1fr))`,
      }"
    >
      <button
        v-for="idx in total"
        :key="idx - 1"
        type="button"
        class="relative flex min-w-0 min-h-0 items-center justify-center rounded-[4px] font-bold leading-none cursor-pointer select-none transition-colors duration-200 active:scale-95"
        :class="[
          cellClass(idx - 1),
          edgeClass(idx - 1),
          cornerClass(idx - 1),
          fillPopClass(idx - 1),
          celebrate ? 'animate-wave' : '',
        ]"
        :style="{ fontSize: cellFont + 'px', '--wd': waveDelay(idx - 1) }"
        :aria-label="ariaLabel(idx - 1)"
        @click="emit('select', idx - 1)"
      >
        <!-- 题目给定数字：仅首次渲染 300ms 淡入（只看题面，避免与用户分支重复渲染） -->
        <span v-if="puzzle[idx - 1]" class="animate-fade-in">
          {{ puzzle[idx - 1] }}
        </span>
        <!-- 用户数字：外层承担落格/离场过渡（key=值，覆盖重填时旧出+新进），
             内层承担填错摇摆（随外层重挂载而重放） -->
        <Transition name="num" appear :duration="{ enter: 220, leave: 180 }">
          <span v-if="!puzzle[idx - 1] && user[idx - 1]" :key="user[idx - 1]" class="relative inline-block">
            <span :class="errors[idx - 1] ? 'animate-error-in' : ''" class="inline-block">
              {{ user[idx - 1] }}
            </span>
          </span>
        </Transition>
        <!-- 铅笔笔记：小号淡紫数字，逐个 stagger 淡入 -->
        <span
          v-if="!displayValue(idx - 1) && noteList(idx - 1).length"
          class="pointer-events-none absolute inset-0 flex flex-wrap items-center justify-center gap-x-[0.14em] overflow-hidden font-bold leading-none text-lilac-deep/70"
          style="font-size: 0.36em"
        >
          <span
            v-for="(d, i) in noteList(idx - 1)"
            :key="d"
            class="animate-note-in"
            :style="{ '--i': i }"
          >
            {{ d }}
          </span>
        </span>
        <!-- 提示星火：5 颗马卡龙色小圆点放射 -->
        <template v-if="sparkIndex === idx - 1">
          <span
            v-for="i in 5"
            :key="'spark' + i"
            class="spark-dot"
            :style="sparkStyle(i)"
          />
        </template>
      </button>
    </div>
  </div>
</template>
