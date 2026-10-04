<script setup>
/**
 * 游戏工具栏：提示（含剩余次数角标）/ 笔记（可开关）/ 擦除 / 撤销 / 重置 / 检查
 * 3×2 两行布局，单键热区大，适合小朋友手指点按。
 * 只负责展示与事件，规则判定全部在 game store
 */
import { Lightbulb, Pencil, Eraser, Undo2, RotateCcw, CheckCircle } from 'lucide-vue-next';

defineProps({
  hintsLeft: { type: Number, required: true },
  noteMode: { type: Boolean, default: false },
  canUndo: { type: Boolean, default: false },
});
const emit = defineEmits(['hint', 'note', 'erase', 'undo', 'reset', 'check']);

const tools = [
  { key: 'hint', label: '提示', icon: Lightbulb, tone: 'bg-butter-soft text-butter-deep' },
  { key: 'note', label: '笔记', icon: Pencil, tone: 'bg-lilac-soft text-lilac-deep' },
  { key: 'erase', label: '擦除', icon: Eraser, tone: 'bg-azure-soft text-azure-deep' },
  { key: 'undo', label: '撤销', icon: Undo2, tone: 'bg-mint-soft text-mint-deep' },
  { key: 'reset', label: '重置', icon: RotateCcw, tone: 'bg-cream text-ink-soft' },
  { key: 'check', label: '检查', icon: CheckCircle, tone: 'bg-mint-soft text-mint-deep' },
];
</script>

<template>
  <!-- 移动端单行 6 键紧凑排布（省纵向空间），md 起恢复 3×2 大按钮 -->
  <div class="w-full grid grid-cols-6 gap-1.5 md:grid-cols-3 md:gap-3" role="toolbar" aria-label="游戏工具栏">
    <button
      v-for="t in tools"
      :key="t.key"
      type="button"
      class="relative flex flex-col items-center gap-0.5 md:gap-1 rounded-2xl bg-white py-1.5 md:py-3 shadow-candy-sm transition-all duration-150 active:translate-y-0.5 active:scale-95 cursor-pointer select-none"
      :class="{
        'opacity-50': t.key === 'hint' && hintsLeft <= 0,
        'ring-2 ring-lilac-deep bg-lilac-soft': t.key === 'note' && noteMode,
      }"
      :aria-label="t.label"
      :aria-pressed="t.key === 'note' ? noteMode : undefined"
      @click="emit(t.key)"
    >
      <span
        class="w-7 h-7 md:w-9 md:h-9 rounded-full flex items-center justify-center"
        :class="t.tone"
      >
        <component :is="t.icon" class="w-4 h-4 md:w-6 md:h-6" />
      </span>
      <span class="text-[10px] md:text-sm font-bold text-ink">{{ t.label }}</span>
      <!-- 提示剩余次数角标 -->
      <span
        v-if="t.key === 'hint'"
        class="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-blossom-deep text-white text-[10px] md:text-[11px] font-black flex items-center justify-center"
      >
        {{ hintsLeft }}
      </span>
    </button>
  </div>
</template>
