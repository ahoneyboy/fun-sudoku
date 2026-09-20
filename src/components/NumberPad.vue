<script setup>
/**
 * 数字键盘：显示每个数字剩余可填数量；
 * 剩余为 0 的数字置灰禁填（防止无效重复）。
 */
import { computed } from 'vue';

const props = defineProps({
  size: { type: Number, required: true },
  remaining: { type: Array, required: true }, // 下标 v-1 → 数字 v 剩余数量
});
const emit = defineEmits(['input']);

const digits = computed(() =>
  Array.from({ length: props.size }, (_, i) => i + 1),
);

// 列数不能拼字符串（Tailwind JIT 需要字面量），按难度映射写死
const colsClass = computed(() => {
  if (props.size === 4) return 'grid-cols-4';
  if (props.size === 6) return 'grid-cols-3';
  return 'grid-cols-5 sm:grid-cols-9';
});
</script>

<template>
  <div class="w-full" role="group" aria-label="数字键盘">
    <div class="grid gap-2 sm:gap-3" :class="colsClass">
      <button
        v-for="v in digits"
        :key="v"
        type="button"
        class="flex flex-col items-center justify-center rounded-2xl bg-white py-2 sm:py-2.5 shadow-candy-sm transition-all duration-150 active:translate-y-0.5 active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer select-none"
        :aria-label="`填入 ${v}`"
        :disabled="remaining[v - 1] <= 0"
        @click="emit('input', v)"
      >
        <span
          class="text-2xl md:text-3xl font-black leading-none text-azure-deep"
          >{{ v }}</span
        >
        <span class="mt-0.5 text-[10px] md:text-xs font-bold text-ink-soft">
          剩 {{ remaining[v - 1] }}
        </span>
      </button>
    </div>
  </div>
</template>
