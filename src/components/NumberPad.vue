<script setup>
/**
 * 数字键盘：显示每个数字剩余可填数量；
 * 剩余为 0 的数字置灰禁填（防止无效重复）。
 *
 * 【动效】
 * - 点按：active 缩到 0.92，松开以 --ease-bounce 回弹（自带 1.05 过冲观感，200ms）；
 * - "剩 N"：数值变化时旧值绕 X 轴翻出、新值翻入（Vue Transition out-in，约 250ms）；
 * - 用完置灰：scale 0.9 + 轻微下沉 150ms；恢复可用时以弹性缓动弹回。
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

// 列数不能拼字符串（Tailwind JIT 需要字面量），按难度映射写死。
// 移动端尽量单行铺满（省纵向空间给棋盘），md 起恢复大键位
const colsClass = computed(() => {
  if (props.size === 4) return 'grid-cols-4';
  if (props.size === 6) return 'grid-cols-6 md:grid-cols-3';
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
        class="flex flex-col items-center justify-center rounded-2xl bg-white py-1.5 sm:py-2 md:py-2.5 shadow-candy-sm transition-transform duration-200 [transition-timing-function:var(--ease-bounce)] active:scale-90 disabled:pointer-events-none disabled:opacity-40 disabled:scale-90 disabled:translate-y-0.5 cursor-pointer select-none"
        :aria-label="`填入 ${v}`"
        :disabled="remaining[v - 1] <= 0"
        @click="emit('input', v)"
      >
        <span
          class="text-xl sm:text-2xl md:text-3xl font-black leading-none text-azure-deep"
          >{{ v }}</span
        >
        <span class="mt-0.5 text-[10px] md:text-xs font-bold text-ink-soft">
          <!-- 剩 N：绕 X 轴翻转换值 -->
          <span class="inline-block" style="perspective: 160px">
            <Transition name="flip" mode="out-in" :duration="{ enter: 150, leave: 100 }">
              <span :key="remaining[v - 1]" class="inline-block">
                剩 {{ remaining[v - 1] }}
              </span>
            </Transition>
          </span>
        </span>
      </button>
    </div>
  </div>
</template>
