<script setup>
/**
 * 迷你盘面预览：
 * - 错题本：只区分题目格（薄荷）/空格（白）两色，不显示数字
 * - 数独学堂：可显示数字，支持提问格（粉 ？）、揭示格（薄荷）、
 *   行/列强调格（淡紫）、同数字强调（奶油黄）等演示形态
 */
import { computed } from 'vue';

const props = defineProps({
  size: { type: Number, required: true },
  values: { type: Array, required: true }, // 一维数组，0=空格
  showDigits: { type: Boolean, default: false },
  questionIdx: { type: Number, default: -1 }, // 粉色提问格（显示 ？）
  answerIdx: { type: Number, default: -1 }, // 答对后的揭示格
  highlightIdxs: { type: Array, default: () => [] }, // 淡紫强调格
  highlightValue: { type: Number, default: 0 }, // 同数字强调
  digitClass: { type: String, default: 'text-[11px]' },
});

const idxs = computed(() =>
  Array.from({ length: props.size * props.size }, (_, i) => i),
);

function cellClass(i) {
  if (i === props.questionIdx) return 'bg-[#FFE4EA] text-[#E05C75]';
  if (i === props.answerIdx) return 'bg-mint-soft text-mint-deep';
  if (props.highlightValue && props.values[i] === props.highlightValue)
    return 'bg-[#FFF3CE] text-butter-deep';
  if (props.highlightIdxs.includes(i)) return 'bg-[#EFE5FF] text-lilac-deep';
  return props.values[i]
    ? 'bg-[#E0F6EA] text-mint-deep' // 题目格
    : 'bg-white'; // 空格
}
</script>

<template>
  <div
    class="grid gap-[2px] rounded-xl bg-[#EFE5FF] p-[3px] w-full"
    :style="{ gridTemplateColumns: `repeat(${size}, 1fr)` }"
    role="img"
    :aria-label="`${size}宫数独盘面预览`"
  >
    <div
      v-for="i in idxs"
      :key="i"
      class="aspect-square rounded-[4px] flex items-center justify-center font-bold leading-none select-none"
      :class="cellClass(i)"
    >
      <template v-if="showDigits">
        <span v-if="i === questionIdx" :class="digitClass">？</span>
        <span v-else-if="values[i]" :class="digitClass">{{ values[i] }}</span>
      </template>
    </div>
  </div>
</template>
