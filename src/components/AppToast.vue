<script setup>
/**
 * 全局 Toast：顶部居中堆叠，由 ui store 驱动
 * 三种类型各配 lucide 图标与马卡龙色
 */
import { CircleCheck, CircleAlert, Info } from 'lucide-vue-next';
import { useUiStore } from '../stores/ui';

const ui = useUiStore();

function iconFor(type) {
  if (type === 'success') return CircleCheck;
  if (type === 'warn') return CircleAlert;
  return Info;
}
function colorFor(type) {
  if (type === 'success') return 'text-mint-deep';
  if (type === 'warn') return 'text-butter-deep';
  return 'text-azure-deep';
}
</script>

<template>
  <div
    class="fixed top-4 inset-x-0 z-[70] flex flex-col items-center gap-2 px-4 pointer-events-none"
    aria-live="polite"
  >
    <TransitionGroup name="toast">
      <div
        v-for="t in ui.toasts"
        :key="t.id"
        class="pointer-events-auto max-w-[92vw] bg-white/95 backdrop-blur rounded-full px-4 py-2.5 shadow-[0_8px_24px_rgba(91,74,84,0.18)] flex items-center gap-2 text-sm font-bold text-ink animate-fade-up"
      >
        <component
          :is="iconFor(t.type)"
          class="w-5 h-5 shrink-0"
          :class="colorFor(t.type)"
        />
        <span class="leading-snug">{{ t.text }}</span>
      </div>
    </TransitionGroup>
  </div>
</template>
