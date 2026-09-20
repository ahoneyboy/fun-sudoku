<script setup>
/**
 * 自定义开关 Toggle：马卡龙配色轨道 + 圆形滑块
 * 为什么不用原生 checkbox：儿童应用需要大热区与明确的视觉反馈
 */
defineProps({
  modelValue: { type: Boolean, default: false },
  label: { type: String, required: true },
  desc: { type: String, default: '' },
  tone: { type: String, default: 'mint' },
});
const emit = defineEmits(['update:modelValue']);

const TONE = {
  mint: 'bg-mint-deep',
  butter: 'bg-butter-deep',
  azure: 'bg-azure-deep',
  lilac: 'bg-lilac-deep',
  blossom: 'bg-blossom-deep',
};
</script>

<template>
  <button
    type="button"
    role="switch"
    :aria-checked="modelValue"
    class="w-full flex items-center justify-between gap-4 py-2 cursor-pointer select-none"
    @click="emit('update:modelValue', !modelValue)"
  >
    <span class="text-left">
      <span class="block font-bold">{{ label }}</span>
      <span v-if="desc" class="block text-xs md:text-sm text-ink-soft mt-0.5">
        {{ desc }}
      </span>
    </span>
    <span
      class="relative shrink-0 w-12 h-7 rounded-full transition-colors duration-200"
      :class="modelValue ? TONE[tone] || TONE.mint : 'bg-[#E9DFD2]'"
    >
      <span
        class="absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform duration-200"
        :class="modelValue ? 'translate-x-5' : 'translate-x-0'"
      />
    </span>
  </button>
</template>
