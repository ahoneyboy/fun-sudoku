<script setup>
/**
 * 数字统计卡：图标圆片 + 大数字（count-up 滚动）+ 标签
 * （首页概览 / 统计页顶部共用）
 */
import CountNumber from './CountNumber.vue';

const props = defineProps({
  label: { type: String, required: true },
  value: { type: [Number, String], required: true },
  icon: { type: [Object, Function], required: true },
  tone: { type: String, default: 'mint' }, // mint/butter/azure/lilac/blossom/peach
});

// 数值型才做 count-up 滚动，文本直接展示
const isNumeric = typeof props.value === 'number' && Number.isFinite(props.value);

// Tailwind JIT 需要字面量类名，tone → class 用静态映射
const TONE = {
  mint: 'bg-mint-soft text-mint-deep',
  butter: 'bg-butter-soft text-butter-deep',
  azure: 'bg-azure-soft text-azure-deep',
  lilac: 'bg-lilac-soft text-lilac-deep',
  blossom: 'bg-blossom-soft text-blossom-deep',
  peach: 'bg-peach-soft text-peach-deep',
};
</script>

<template>
  <div class="card p-4 md:p-5 flex items-center gap-3 md:gap-4">
    <div
      class="w-11 h-11 md:w-12 md:h-12 rounded-2xl flex items-center justify-center shrink-0"
      :class="TONE[tone] || TONE.mint"
    >
      <component :is="icon" class="w-6 h-6" />
    </div>
    <div class="min-w-0">
      <div class="text-2xl md:text-3xl font-black leading-tight">
        <CountNumber v-if="isNumeric" :value="value" />
        <template v-else>{{ value }}</template>
      </div>
      <div class="text-xs md:text-sm font-bold text-ink-soft truncate">
        {{ label }}
      </div>
    </div>
  </div>
</template>
