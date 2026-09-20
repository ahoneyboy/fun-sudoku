<script setup>
/**
 * 游戏页（核心交互）
 *
 * 布局：
 * - 手机/Pad：顶栏信息条 → 棋盘 → 数字键盘 → 工具栏（单列居中）
 * - PC（lg+）：左右两栏，右侧信息面板（本局信息 + 快捷键 + 小贴士）
 *
 * 交互：点击选格 / PC 键盘增强（≥lg）/ 提示讲解 / 检查收录错题本 /
 *      填满自动判题 / 通关弹窗 / 首次游玩引导 / 重置二次确认
 */
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  ChevronLeft,
  Clock,
  Heart,
  Lightbulb,
  BarChart3,
  Keyboard,
  GraduationCap,
  Sparkles,
} from 'lucide-vue-next';
import { DIFFS } from '../core/sudoku';
import { fmtTime } from '../core/format';
import { sfx } from '../core/audio';
import { useGameStore } from '../stores/game';
import { useSettingsStore } from '../stores/settings';
import { useRecordsStore } from '../stores/records';
import { useWrongbookStore } from '../stores/wrongbook';
import { useUiStore } from '../stores/ui';
import SudokuBoard from '../components/SudokuBoard.vue';
import NumberPad from '../components/NumberPad.vue';
import GameToolbar from '../components/GameToolbar.vue';
import WinModal from '../components/WinModal.vue';
import ConfirmDialog from '../components/ConfirmDialog.vue';

const route = useRoute();
const router = useRouter();
const game = useGameStore();
const settings = useSettingsStore();
const records = useRecordsStore();
const wrongbook = useWrongbookStore();
const ui = useUiStore();

const resetOpen = ref(false);
const guideOpen = ref(false);

const diffMeta = computed(() => DIFFS[game.diffKey] || DIFFS.easy4);
// Tailwind JIT 需要字面量类名
const TONE = {
  mint: 'bg-mint-soft text-mint-deep',
  butter: 'bg-butter-soft text-butter-deep',
  azure: 'bg-azure-soft text-azure-deep',
  lilac: 'bg-lilac-soft text-lilac-deep',
};

/** 开局：等 hydrate 完成后再取题（sig 重练要查错题本） */
async function init() {
  await Promise.all([
    settings.hydrate(),
    records.hydrate(),
    wrongbook.hydrate(),
  ]);
  const q = route.query;
  if (q.diff && !DIFFS[q.diff]) {
    router.replace('/'); // 未知难度回首页
    return;
  }
  const diff = DIFFS[q.diff] ? q.diff : 'easy4';
  if (q.sig) {
    game.newGame({ diff, sig: String(q.sig) });
    return;
  }
  // 从别处切回且同一难度还有进行中的对局 → 保留，不重开
  if (game.active && !game.finished && !game.redoMode && game.diffKey === diff) {
    return;
  }
  game.newGame({ diff });
  maybeShowGuide();
}

/** 首次游玩（没有任何通关记录）温柔引导，之后不再打扰 */
function maybeShowGuide() {
  if (!records.totalCount && !settings.guideShown && !game.redoMode) {
    guideOpen.value = true;
  }
}
function closeGuide(goLearn) {
  guideOpen.value = false;
  settings.setGuideShown();
  if (goLearn) router.push('/learn');
}

async function onHint() {
  const r = game.useHint();
  if (r) ui.toast(r.text, 'info', 4200);
}
function onReset() {
  resetOpen.value = true;
}
function doReset() {
  game.resetSelf();
  ui.toast('已重置，重新开始！', 'success');
}
function playAgain() {
  // 同难度直接换新题（缓存池/现场生成），不需要重新导航
  game.newGame({ diff: game.diffKey });
}
function onSelect(idx) {
  game.select(idx);
  if (settings.sound) sfx.tap();
}

// ---- PC 键盘增强（≥lg 启用） ----
function onKey(e) {
  if (window.innerWidth < 1024) return;
  if (!game.active || game.finished) return;
  if (resetOpen.value || guideOpen.value) return;
  const k = e.key;
  if (k === 'ArrowUp') {
    e.preventDefault();
    game.moveSelection(-1, 0);
  } else if (k === 'ArrowDown') {
    e.preventDefault();
    game.moveSelection(1, 0);
  } else if (k === 'ArrowLeft') {
    e.preventDefault();
    game.moveSelection(0, -1);
  } else if (k === 'ArrowRight') {
    e.preventDefault();
    game.moveSelection(0, 1);
  } else if (/^[1-9]$/.test(k)) {
    const v = Number(k);
    if (v <= game.size) game.inputDigit(v);
  } else if (k === 'Backspace' || k === 'Delete') {
    e.preventDefault();
    game.eraseCell();
  } else if (k === 'h' || k === 'H') {
    onHint();
  } else if (k === 'c' || k === 'C') {
    game.runCheck();
  }
}

watch(
  () => [route.query.diff, route.query.sig],
  () => {
    if (route.name === 'game') init();
  },
);

onMounted(() => {
  init();
  window.addEventListener('keydown', onKey);
});
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey);
});
</script>

<template>
  <div class="w-full max-w-6xl mx-auto px-4 pt-4 pb-28 md:px-8 md:pt-6 md:pb-10">
    <!-- 骨架：newGame 是异步的（读缓存池），未就绪前不闪空盘 -->
    <div v-if="!game.active" class="max-w-[440px] mx-auto mt-10">
      <div class="card aspect-square animate-pulse bg-[#F7F2FB]" />
    </div>

    <template v-else>
      <!-- 顶部信息条：返回 / 难度 / 失误 / 计时 -->
      <div
        class="max-w-[560px] lg:max-w-none mx-auto card px-3 py-2.5 md:px-5 md:py-3 flex items-center gap-2 md:gap-3"
      >
        <button
          type="button"
          class="md:hidden w-9 h-9 rounded-full bg-cream flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
          aria-label="返回首页"
          @click="router.push('/')"
        >
          <ChevronLeft class="w-5 h-5" />
        </button>

        <span class="pill" :class="TONE[diffMeta.tone]">
          <BarChart3 class="w-3.5 h-3.5" />
          {{ game.redoMode ? '错题重练 · ' : '' }}{{ diffMeta.label }}
        </span>

        <span
          class="pill"
          :class="
            game.mistakes === 0 ? 'bg-mint-soft text-mint-deep' : 'bg-[#FFE4EA] text-[#E05C75]'
          "
        >
          <Heart class="w-3.5 h-3.5" />
          {{ game.mistakes === 0 ? '零失误' : `${game.mistakes} 次小失误` }}
        </span>

        <span class="flex-1" />

        <button
          type="button"
          class="pill bg-cream text-ink cursor-pointer active:scale-95 transition-transform"
          :aria-label="game.showTime ? '隐藏计时' : '显示计时'"
          @click="game.toggleTimeVisible()"
        >
          <Clock class="w-3.5 h-3.5" />
          <!-- 隐藏时显示占位符，后台仍在计时，成绩不受影响 -->
          <span class="tabular-nums">
            {{ game.showTime ? fmtTime(game.elapsedSec) : '--:--' }}
          </span>
        </button>
      </div>

      <!-- 主体：lg 双栏 -->
      <div class="mt-4 lg:flex lg:items-start lg:justify-center lg:gap-8">
        <div
          class="mx-auto w-full max-w-[440px] md:max-w-[560px] lg:max-w-[520px] flex flex-col gap-4"
        >
          <SudokuBoard
            :size="game.size"
            :puzzle="game.puzzle"
            :user="game.user"
            :errors="game.errors"
            :selected="game.selected"
            @select="onSelect"
          />
          <NumberPad
            :size="game.size"
            :remaining="game.remainingCounts"
            @input="game.inputDigit($event)"
          />
          <GameToolbar
            :hints-left="game.hintsLeft"
            @hint="onHint"
            @erase="game.eraseCell()"
            @reset="onReset"
            @check="game.runCheck()"
          />
        </div>

        <!-- PC 右侧信息面板 -->
        <aside class="hidden lg:flex flex-col gap-4 w-[300px] shrink-0">
          <div class="card p-5 space-y-3">
            <div class="font-black text-lg mb-1">本局信息</div>
            <div class="flex items-center justify-between text-sm font-bold">
              <span class="flex items-center gap-2 text-ink-soft">
                <Clock class="w-4 h-4" /> 用时
              </span>
              <span class="tabular-nums">{{ fmtTime(game.elapsedSec) }}</span>
            </div>
            <div class="flex items-center justify-between text-sm font-bold">
              <span class="flex items-center gap-2 text-ink-soft">
                <Heart class="w-4 h-4" /> 小失误
              </span>
              <span>{{ game.mistakes }} 次</span>
            </div>
            <div class="flex items-center justify-between text-sm font-bold">
              <span class="flex items-center gap-2 text-ink-soft">
                <Lightbulb class="w-4 h-4" /> 剩余提示
              </span>
              <span>{{ game.hintsLeft }} / {{ diffMeta.hints }}</span>
            </div>
            <div class="flex items-center justify-between text-sm font-bold">
              <span class="flex items-center gap-2 text-ink-soft">
                <BarChart3 class="w-4 h-4" /> 难度
              </span>
              <span>{{ diffMeta.label }}（{{ game.size }} 宫）</span>
            </div>
          </div>

          <div class="card p-5">
            <div class="flex items-center gap-2 font-black text-lg mb-3">
              <Keyboard class="w-5 h-5 text-azure-deep" />
              键盘快捷键
            </div>
            <ul class="space-y-2 text-sm font-bold text-ink-soft">
              <li class="flex justify-between"><span>移动选中格</span><span>方向键</span></li>
              <li class="flex justify-between"><span>填数字</span><span>1 - 9</span></li>
              <li class="flex justify-between"><span>擦除</span><span>Backspace</span></li>
              <li class="flex justify-between"><span>提示</span><span>H</span></li>
              <li class="flex justify-between"><span>检查</span><span>C</span></li>
            </ul>
          </div>

          <div class="card p-5 bg-butter-soft border border-[#F2E2B4]">
            <div class="flex items-center gap-2 font-black mb-1 text-butter-deep">
              <Sparkles class="w-4 h-4" />
              小贴士
            </div>
            <p class="text-sm font-bold text-ink leading-relaxed">
              填错没有关系，那叫"小失误"！改过来就好，你一定可以的。
            </p>
          </div>
        </aside>
      </div>
    </template>

    <!-- 重置二次确认 -->
    <ConfirmDialog
      v-model:open="resetOpen"
      title="要重新开始这道题吗？"
      desc="盘面会恢复初始，本局的失误、用时和提示次数都会清零。"
      confirm-text="重新开始"
      @confirm="doReset"
    />

    <!-- 首次游玩引导 -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="guideOpen"
          class="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-6"
          @click.self="closeGuide(false)"
        >
          <div class="modal-card card w-full max-w-sm p-6 md:p-8 text-center animate-fade-up">
            <div class="w-14 h-14 mx-auto rounded-full bg-azure-soft text-azure-deep flex items-center justify-center mb-3">
              <GraduationCap class="w-8 h-8" />
            </div>
            <h3 class="text-xl font-black mb-2">第一次玩数独？</h3>
            <p class="text-sm text-ink-soft leading-relaxed mb-6">
              没关系！数独学堂有图解小教程，三分钟就能学会，先去看看吗？
            </p>
            <div class="flex gap-3">
              <button
                type="button"
                class="btn-candy flex-1 py-3 bg-cream text-ink"
                @click="closeGuide(false)"
              >
                先玩一局
              </button>
              <button
                type="button"
                class="btn-candy flex-1 py-3 bg-azure-deep text-white"
                @click="closeGuide(true)"
              >
                去看教程
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- 通关弹窗 -->
    <WinModal
      :open="game.finished"
      :stars="game.stars"
      :sec="game.elapsedSec"
      :mistakes="game.mistakes"
      :hints-used="game.hintsUsed"
      :redo="game.redoMode"
      @again="playAgain"
      @home="router.push('/')"
    />
  </div>
</template>
