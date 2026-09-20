<script setup>
/**
 * 友好空状态：大图标 + 标题 + 描述 + 可选操作（slot）
 * 用于空错题本、无记录的统计页等边界场景
 */
defineProps({
  icon: { type: [Object, Function], required: true },
  title: { type: String, required: true },
  desc: { type: String, default: '' },
});
</script>

<template>
  <div class="card p-8 md:p-12 flex flex-col items-center text-center gap-3">
    <div class="w-16 h-16 rounded-full bg-cream flex items-center justify-center">
      <component :is="icon" class="w-8 h-8 text-ink-soft" />
    </div>
    <div class="font-black text-lg">{{ title }}</div>
    <div v-if="desc" class="text-sm text-ink-soft leading-relaxed max-w-xs">
      {{ desc }}
    </div>
    <slot />
  </div>
</template>
