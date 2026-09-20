<script setup>
/**
 * 数独棋盘
 *
 * 视觉结构（三层）：
 *   外层容器淡紫底 #CDB9F0（宫线底色）
 *   → 宫与宫之间 5px 间隙透出淡紫，形成"粗留白线"
 *   → 每个宫是一张浅紫 #F3EDFC 小卡片，宫内格子间 2px 极浅细线
 *
 * 格子 aspect-square + 网格均分 → 任何断点下都是正方形；
 * 字号用 ResizeObserver 随实际格宽缩放，避免 9 宫在手机上溢出。
 */
import { computed, ref, onMounted, onBeforeUnmount } from 'vue';

const props = defineProps({
  size: { type: Number, required: true }, // 4 / 6 / 9
  puzzle: { type: Array, required: true }, // 题面（0=空）
  user: { type: Array, required: true }, // 用户填的数（0=空）
  errors: { type: Array, required: true }, // 错误标红位
  selected: { type: Number, default: -1 },
});
const emit = defineEmits(['select']);

/** 宫几何：列方向的宫数、行方向的宫数、每宫宽高（与引擎 getCfg 一致） */
const geo = computed(() => {
  if (props.size === 4) return { boxW: 2, boxH: 2, cols: 2, rows: 2 };
  if (props.size === 6) return { boxW: 3, boxH: 2, cols: 2, rows: 3 };
  return { boxW: 3, boxH: 3, cols: 3, rows: 3 };
});

/** 按宫分组的一维下标，用于双层 grid 渲染 */
const boxes = computed(() => {
  const out = [];
  for (let br = 0; br < geo.value.rows; br++) {
    for (let bc = 0; bc < geo.value.cols; bc++) {
      const cells = [];
      for (let r = 0; r < geo.value.boxH; r++) {
        for (let c = 0; c < geo.value.boxW; c++) {
          cells.push((br * geo.value.boxH + r) * props.size + (bc * geo.value.boxW + c));
        }
      }
      out.push(cells);
    }
  }
  return out;
});

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

/** 单格样式：错误 > 选中 > 同数字 > 同行列宫 > 白底；文字色按归属三色 */
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
    bg = 'bg-[#FFE4EA] ring-2 ring-[#E05C75]';
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

// ---- 字号自适应：监听棋盘宽度，格宽 ≈ 宽/size，字号取 52% ----
const boardEl = ref(null);
const cellFont = ref(18);
let ro = null;
onMounted(() => {
  ro = new ResizeObserver((entries) => {
    const w = entries[0] && entries[0].contentRect.width;
    if (w) cellFont.value = Math.max(11, Math.round((w / props.size) * 0.52));
  });
  ro.observe(boardEl.value);
});
onBeforeUnmount(() => {
  if (ro) ro.disconnect();
});
</script>

<template>
  <div
    ref="boardEl"
    class="w-full rounded-[22px] bg-[#CDB9F0] p-[5px] shadow-[0_10px_24px_rgba(122,85,192,0.18)]"
    role="grid"
    :aria-label="`${size}宫数独棋盘`"
  >
    <div
      class="grid gap-[5px]"
      :style="{ gridTemplateColumns: `repeat(${geo.cols}, 1fr)` }"
    >
      <div
        v-for="(box, bi) in boxes"
        :key="bi"
        class="grid gap-[2px] rounded-[10px] bg-[#F3EDFC] p-[3px]"
        :style="{ gridTemplateColumns: `repeat(${geo.boxW}, 1fr)` }"
      >
        <button
          v-for="idx in box"
          :key="`${idx}-${user[idx]}`"
          type="button"
          class="aspect-square flex items-center justify-center rounded-[6px] font-bold leading-none cursor-pointer select-none transition-colors duration-100 active:scale-95"
          :class="cellClass(idx)"
          :style="{ fontSize: cellFont + 'px' }"
          :aria-label="ariaLabel(idx)"
          @click="emit('select', idx)"
        >
          {{ displayValue(idx) }}
        </button>
      </div>
    </div>
  </div>
</template>
