<script setup>
/**
 * 通关弹窗：星星逐个弹出动画 + 用时/失误/提示回顾 + 再玩一局 / 返回首页。
 * 星级公式在 game store（失误+提示：0→3 星，≤4→2 星，其余 1 星），这里只展示。
 */
import { Star, Timer, Heart, Lightbulb, RotateCcw, House } from 'lucide-vue-next';
import { fmtTime } from '../core/format';

defineProps({
  open: { type: Boolean, default: false },
  stars: { type: Number, required: true },
  sec: { type: Number, required: true },
  mistakes: { type: Number, required: true },
  hintsUsed: { type: Number, required: true },
  redo: { type: Boolean, default: false }, // 错题重练通关：特别祝贺
});
const emit = defineEmits(['again', 'home']);
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="open"
        class="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-6"
        @click.self
      >
        <div class="modal-card card w-full max-w-sm p-6 md:p-8 text-center animate-fade-up">
          <!-- 星星逐个弹出 -->
          <div class="flex items-center justify-center gap-2 mb-4">
            <Star
              v-for="i in 3"
              :key="i"
              class="w-11 h-11 md:w-12 md:h-12 animate-pop"
              :class="
                i <= stars
                  ? 'text-[#FFC53D] fill-[#FFC53D]'
                  : 'text-[#EBDFD0]'
              "
              :style="{ animationDelay: `${(i - 1) * 0.25}s` }"
            />
          </div>

          <h2 class="text-2xl md:text-3xl font-black mb-1">
            {{ redo ? '错题被你打败啦！' : '通关啦，太棒啦！' }}
          </h2>
          <p class="text-sm text-ink-soft font-bold mb-5">
            {{
              redo
                ? '重练成功，这道题已经自动移出错题本咯'
                : stars === 3
                  ? '零失误零提示，完美通关！'
                  : '又进步了一点点，继续加油！'
            }}
          </p>

          <!-- 成绩回顾 -->
          <div class="flex items-center justify-center gap-2 md:gap-3 mb-6">
            <div class="flex-1 rounded-2xl bg-cream px-2 py-3">
              <Timer class="w-5 h-5 mx-auto text-azure-deep" />
              <div class="mt-1 text-base md:text-lg font-black">{{ fmtTime(sec) }}</div>
              <div class="text-[11px] font-bold text-ink-soft">用时</div>
            </div>
            <div class="flex-1 rounded-2xl bg-cream px-2 py-3">
              <Heart class="w-5 h-5 mx-auto text-blossom-deep" />
              <div class="mt-1 text-base md:text-lg font-black">{{ mistakes }}</div>
              <div class="text-[11px] font-bold text-ink-soft">小失误</div>
            </div>
            <div class="flex-1 rounded-2xl bg-cream px-2 py-3">
              <Lightbulb class="w-5 h-5 mx-auto text-butter-deep" />
              <div class="mt-1 text-base md:text-lg font-black">{{ hintsUsed }}</div>
              <div class="text-[11px] font-bold text-ink-soft">提示</div>
            </div>
          </div>

          <div class="flex gap-3">
            <button
              type="button"
              class="btn-candy flex-1 py-3 bg-cream text-ink"
              @click="emit('home')"
            >
              <House class="w-4 h-4" />
              返回首页
            </button>
            <button
              type="button"
              class="btn-candy flex-1 py-3 bg-mint-deep text-white"
              @click="emit('again')"
            >
              <RotateCcw class="w-4 h-4" />
              再玩一局
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
