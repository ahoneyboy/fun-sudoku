<script setup>
/**
 * 通关弹窗
 * - 24 条马卡龙色 CSS 彩带（随机横漂/旋转/时长/延迟，重力下落 1.2-1.8s）
 * - 星星 pop + 旋转入场 + 金色光晕绽放
 * - 卡片缩放入场（scale 0.8→1 + fade，300ms，略微延后让棋盘扫描波先亮相）
 * - 成绩数字 count-up（rAF 滚动，reduced-motion 直接显示终值）
 * 星级公式在 game store（失误+提示：0→3 星，≤4→2 星，其余 1 星），这里只展示。
 */
import { Star, Timer, Heart, Lightbulb, RotateCcw, House } from 'lucide-vue-next';
import { fmtTime } from '../core/format';
import CountNumber from './CountNumber.vue';

defineProps({
  open: { type: Boolean, default: false },
  stars: { type: Number, required: true },
  sec: { type: Number, required: true },
  mistakes: { type: Number, required: true },
  hintsUsed: { type: Number, required: true },
  redo: { type: Boolean, default: false }, // 错题重练通关：特别祝贺
  daily: { type: Boolean, default: false }, // 每日挑战通关
  streak: { type: Number, default: 0 },
});
const emit = defineEmits(['again', 'home']);

// 彩带参数：挂载时随机一次即可（马卡龙五色 deep 色板）
const MACARON = ['#2E8B62', '#B07E10', '#3D6FB5', '#7A55C0', '#E05C75'];
const CONFETTI = Array.from({ length: 24 }, (_, i) => ({
  left: `${(i * 41 + ((i * 17) % 23)) % 100}%`,
  color: MACARON[i % MACARON.length],
  '--cx': `${Math.round((Math.random() - 0.5) * 160)}px`,
  '--cr': `${Math.round(360 + Math.random() * 540)}deg`,
  '--cd': `${(1.2 + Math.random() * 0.6).toFixed(2)}s`,
  '--cdel': `${(Math.random() * 0.5).toFixed(2)}s`,
  '--cw': `${Math.round(6 + Math.random() * 5)}px`,
  '--ch': `${Math.round(9 + Math.random() * 7)}px`,
}));
</script>

<template>
  <Teleport to="body">
    <Transition name="modal" :duration="200">
      <div
        v-if="open"
        class="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-6 overflow-hidden"
        @click.self
      >
        <!-- 彩带层：纯装饰，不拦截点击 -->
        <div class="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <span
            v-for="(p, i) in CONFETTI"
            :key="i"
            class="confetti-piece"
            :style="{ left: p.left, background: p.color, '--cx': p['--cx'], '--cr': p['--cr'], '--cd': p['--cd'], '--cdel': p['--cdel'], '--cw': p['--cw'], '--ch': p['--ch'] }"
          />
        </div>

        <div class="modal-card card w-full max-w-sm p-6 md:p-8 text-center animate-modal-pop">
          <!-- 星星逐个弹出：pop + 旋转入场 + 金色光晕 -->
          <div class="flex items-center justify-center gap-2 mb-4">
            <span
              v-for="i in 3"
              :key="i"
              class="relative inline-flex animate-star-pop"
              :style="{ animationDelay: `${(i - 1) * 0.25}s` }"
            >
              <span
                v-if="i <= stars"
                class="star-halo"
                :style="{ animationDelay: `${(i - 1) * 0.25 + 0.2}s` }"
              />
              <Star
                class="w-11 h-11 md:w-12 md:h-12"
                :class="
                  i <= stars
                    ? 'text-[#FFC53D] fill-[#FFC53D]'
                    : 'text-[#EBDFD0]'
                "
              />
            </span>
          </div>

          <h2 class="text-2xl md:text-3xl font-black mb-1">
            {{ redo ? '错题被你打败啦！' : '通关啦，太棒啦！' }}
          </h2>
          <p class="text-sm text-ink-soft font-bold mb-5">
            {{
              redo
                ? '重练成功，这道题已经自动移出错题本咯'
                : daily
                  ? `每日挑战完成，已连续打卡 ${streak} 天！`
                  : stars === 3
                    ? '零失误零提示，完美通关！'
                    : '又进步了一点点，继续加油！'
            }}
          </p>

          <!-- 成绩回顾：数字 count-up 滚动 -->
          <div class="flex items-center justify-center gap-2 md:gap-3 mb-6">
            <div class="flex-1 rounded-2xl bg-cream px-2 py-3">
              <Timer class="w-5 h-5 mx-auto text-azure-deep" />
              <div class="mt-1 text-base md:text-lg font-black">
                <CountNumber :value="sec" :format="fmtTime" />
              </div>
              <div class="text-[11px] font-bold text-ink-soft">用时</div>
            </div>
            <div class="flex-1 rounded-2xl bg-cream px-2 py-3">
              <Heart class="w-5 h-5 mx-auto text-blossom-deep" />
              <div class="mt-1 text-base md:text-lg font-black">
                <CountNumber :value="mistakes" />
              </div>
              <div class="text-[11px] font-bold text-ink-soft">小失误</div>
            </div>
            <div class="flex-1 rounded-2xl bg-cream px-2 py-3">
              <Lightbulb class="w-5 h-5 mx-auto text-butter-deep" />
              <div class="mt-1 text-base md:text-lg font-black">
                <CountNumber :value="hintsUsed" />
              </div>
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
