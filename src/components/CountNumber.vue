<script setup>
/**
 * CountNumber：数字从当前值滚动到目标值（800ms ease-out）
 * - 全站唯一允许的 JS 动画：requestAnimationFrame，只写文本不碰布局；
 * - prefers-reduced-motion 时直接显示终值；
 * - value 变化时从当前显示值续滚（首页 hydrate 后 0→N 也平滑）。
 */
import { onBeforeUnmount, ref, watch } from 'vue';

const props = defineProps({
  value: { type: Number, required: true },
  duration: { type: Number, default: 800 },
  /** 可选格式化（如用时秒 → mm:ss） */
  format: { type: Function, default: null },
});

const display = ref(props.value);
let rafId = null;

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function animateTo(target) {
  if (rafId) cancelAnimationFrame(rafId);
  if (prefersReducedMotion() || !Number.isFinite(target)) {
    display.value = target;
    return;
  }
  const from = Number(display.value) || 0;
  const start = performance.now();
  const tick = (now) => {
    const p = Math.min(1, (now - start) / props.duration);
    const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
    display.value = Math.round(from + (target - from) * eased);
    if (p < 1) rafId = requestAnimationFrame(tick);
  };
  rafId = requestAnimationFrame(tick);
}

watch(() => props.value, (v) => animateTo(v), { immediate: true });
onBeforeUnmount(() => {
  if (rafId) cancelAnimationFrame(rafId);
});
</script>

<template>
  <span class="tabular-nums">{{ format ? format(display) : display }}</span>
</template>
