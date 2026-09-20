<script setup>
/**
 * 数独学堂：图解教学（规则 + 解题三招）+ 随堂测验
 *
 * 测验固定使用两张已验证的合法终盘：
 *   A = 1234341221434321（第 1 题挖 idx3 答案 4；第 3 题挖 idx15 答案 1）
 *   B = 2341413214233214（第 2 题挖 idx0/idx1，提问 idx1 答案 3）
 * 答对弹出庆祝与讲解；答错棋盘轻微摇头并鼓励；全对显示毕业庆祝卡。
 */
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import {
  BookOpen,
  Lightbulb,
  Search,
  Footprints,
  PartyPopper,
  Play,
  Check,
} from 'lucide-vue-next';
import { decode } from '../core/sudoku';
import { sfx } from '../core/audio';
import { useSettingsStore } from '../stores/settings';
import { useUiStore } from '../stores/ui';
import MiniBoard from '../components/MiniBoard.vue';

const router = useRouter();
const settings = useSettingsStore();
const ui = useUiStore();

// ---- 演示盘数据 ----
const SOL_A = '1234341221434321';
const SOL_B = '2341413214233214';

function dug(sol, holes) {
  const g = decode(sol);
  holes.forEach((i) => (g[i] = 0));
  return g;
}

const lessonBoard = decode(SOL_A); // 第一课：完整 4 宫演示盘
const demo1 = dug(SOL_A, [3]); // 只差一个：第 1 行缺 4
const demo2 = dug(SOL_B, [0, 1]); // 排除法：第 1 列缺 3
const demo3 = decode(SOL_A); // 先易后难：强调数字 4
const COL1_IDXS = [1, 5, 9, 13]; // B 盘第 1 列（0 基）

const lessons = [
  {
    icon: Lightbulb,
    tone: 'bg-butter-soft text-butter-deep',
    title: '第一招：只差一个',
    board: demo1,
    questionIdx: 3,
    highlightIdxs: [0, 1, 2, 3],
    desc: '第 1 行已经有 1、2、3，空格只缺一个数——那一定是 4！',
  },
  {
    icon: Search,
    tone: 'bg-azure-soft text-azure-deep',
    title: '第二招：排除法',
    board: demo2,
    questionIdx: 1,
    highlightIdxs: COL1_IDXS,
    desc: '行里定不下来就看列：这一列已经有 1、4、2，空格只能是 3！',
  },
  {
    icon: Footprints,
    tone: 'bg-mint-soft text-mint-deep',
    title: '第三招：先易后难',
    board: demo3,
    questionIdx: -1,
    highlightIdxs: [],
    highlightValue: 4,
    desc: '先把快凑齐的数字填完（黄色都是 4），卡住的地方先跳过，别硬磕！',
  },
];

// ---- 随堂小测验 ----
const QUIZ = [
  {
    sol: SOL_A,
    digs: [3],
    ask: 3,
    answer: 4,
    explain: '只差一个：第 1 行已经有 1、2、3，空格正正好是 4！',
  },
  {
    sol: SOL_B,
    digs: [0, 1],
    ask: 1,
    answer: 3,
    explain: '看列排除：这一列已经有 1、4、2，空格只能是 3！',
  },
  {
    sol: SOL_A,
    digs: [15],
    ask: 15,
    answer: 1,
    explain: '宫内不重复：右下角的宫里已经有 2、3、4，还缺 1！',
  },
];

const current = ref(0);
const status = ref('answering'); // answering | right
const shakeTick = ref(0); // 答错时递增，作为 key 重新挂载棋盘 → 重放摇头动画
const graduated = ref(false);

const quiz = computed(() => QUIZ[current.value]);
const quizValues = computed(() => dug(quiz.value.sol, quiz.value.digs));

function choose(v) {
  if (status.value === 'right') return;
  if (v === quiz.value.answer) {
    status.value = 'right';
    if (settings.sound) sfx.ok();
    ui.toast('答对啦，你就是数独小天才！', 'success');
  } else {
    shakeTick.value++;
    if (settings.sound) sfx.err();
    ui.toast('再想一想，你可以的！', 'warn');
  }
}

function next() {
  if (current.value < QUIZ.length - 1) {
    current.value++;
    status.value = 'answering';
  } else {
    graduated.value = true;
    if (settings.sound) sfx.win();
  }
}

function goPlay() {
  router.push({ path: '/game', query: { diff: 'easy4' } });
}
</script>

<template>
  <div class="w-full max-w-3xl mx-auto px-4 pt-5 pb-28 md:px-8 md:pt-8 md:pb-10 space-y-6">
    <div>
      <h1 class="text-2xl md:text-3xl font-black">数独学堂</h1>
      <p class="text-sm font-bold text-ink-soft mt-1">
        三分钟学会数独，还能拿毕业证书哦！
      </p>
    </div>

    <!-- 第一课：规则 -->
    <section class="card p-5 md:p-7">
      <div class="flex items-center gap-2 font-black text-lg mb-4">
        <span class="w-9 h-9 rounded-2xl bg-lilac-soft text-lilac-deep flex items-center justify-center">
          <BookOpen class="w-5 h-5" />
        </span>
        第一课 · 数独的规则
      </div>
      <div class="flex flex-col sm:flex-row gap-5 items-center">
        <div class="w-full sm:w-56 shrink-0">
          <MiniBoard :size="4" :values="lessonBoard" show-digits digit-class="text-base md:text-lg" />
          <p class="text-[11px] font-bold text-ink-soft text-center mt-2">
            一张完整的四宫数独
          </p>
        </div>
        <ul class="space-y-3 text-sm md:text-base font-bold flex-1">
          <li class="flex gap-3 items-start">
            <span class="w-6 h-6 rounded-full bg-mint-soft text-mint-deep flex items-center justify-center shrink-0 text-xs font-black">1</span>
            每一行：1、2、3、4 各出现一次
          </li>
          <li class="flex gap-3 items-start">
            <span class="w-6 h-6 rounded-full bg-butter-soft text-butter-deep flex items-center justify-center shrink-0 text-xs font-black">2</span>
            每一列：1、2、3、4 各出现一次
          </li>
          <li class="flex gap-3 items-start">
            <span class="w-6 h-6 rounded-full bg-blossom-soft text-blossom-deep flex items-center justify-center shrink-0 text-xs font-black">3</span>
            每个宫（2×2 的小方块）：1、2、3、4 各出现一次
          </li>
          <li class="text-ink-soft font-bold text-xs md:text-sm pl-9">
            六宫格用 1～6、九宫格用 1～9，规则一模一样！
          </li>
        </ul>
      </div>
    </section>

    <!-- 第二课：解题三招 -->
    <section>
      <h2 class="text-lg md:text-xl font-black mb-3 px-1">第二课 · 解题三招</h2>
      <div class="space-y-3 md:space-y-4">
        <div
          v-for="(ls, i) in lessons"
          :key="ls.title"
          class="card p-5 md:p-6 flex flex-col sm:flex-row gap-5 items-center"
        >
          <div class="w-full sm:w-44 shrink-0 order-2 sm:order-1">
            <MiniBoard
              :size="4"
              :values="ls.board"
              show-digits
              :question-idx="ls.questionIdx"
              :highlight-idxs="ls.highlightIdxs"
              :highlight-value="ls.highlightValue || 0"
              digit-class="text-base md:text-lg"
            />
          </div>
          <div class="order-1 sm:order-2 flex-1">
            <div class="flex items-center gap-2 font-black text-base md:text-lg mb-1.5">
              <span class="w-8 h-8 rounded-xl flex items-center justify-center" :class="ls.tone">
                <component :is="ls.icon" class="w-4 h-4" />
              </span>
              {{ ls.title }}
            </div>
            <p class="text-sm md:text-base font-bold text-ink-soft leading-relaxed">
              {{ ls.desc }}
            </p>
            <div v-if="i === 2" class="text-xs font-bold text-ink-soft mt-2">
              黄色格子 = 数字 4 所在的位置
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 随堂小测验 -->
    <section class="card p-5 md:p-7">
      <div class="flex items-center gap-2 font-black text-lg mb-4">
        <span class="w-9 h-9 rounded-2xl bg-blossom-soft text-blossom-deep flex items-center justify-center">
          <Check class="w-5 h-5" />
        </span>
        随堂小测验
        <span class="pill bg-cream text-ink-soft ml-auto">
          {{ graduated ? '全部完成' : `第 ${current + 1} / ${QUIZ.length} 题` }}
        </span>
      </div>

      <!-- 毕业庆祝卡 -->
      <div v-if="graduated" class="text-center py-4 animate-fade-up">
        <div class="w-20 h-20 mx-auto rounded-full bg-butter-soft text-butter-deep flex items-center justify-center mb-4 animate-pop">
          <PartyPopper class="w-10 h-10" />
        </div>
        <h3 class="text-2xl font-black mb-2">恭喜毕业！</h3>
        <p class="text-sm md:text-base font-bold text-ink-soft leading-relaxed mb-6">
          三道题全部答对，你已经掌握数独的基本功啦。<br />
          去挑战一道真正的数独吧！
        </p>
        <button
          type="button"
          class="btn-candy px-8 py-3 bg-mint-deep text-white"
          @click="goPlay"
        >
          <Play class="w-4 h-4" />
          去挑战真的数独
        </button>
      </div>

      <div v-else class="flex flex-col sm:flex-row gap-5 items-center">
        <div class="w-full sm:w-52 shrink-0">
          <!-- 答错时换 key 重挂载，重放摇头动画 -->
          <div :key="shakeTick" :class="shakeTick ? 'animate-shake' : ''">
            <MiniBoard
              :size="4"
              :values="quizValues"
              show-digits
              :question-idx="status === 'right' ? -1 : quiz.ask"
              :answer-idx="status === 'right' ? quiz.ask : -1"
              digit-class="text-base md:text-lg"
            />
          </div>
          <p class="text-[11px] font-bold text-ink-soft text-center mt-2">
            粉色格子里应该填几？
          </p>
        </div>
        <div class="flex-1 w-full">
          <div class="grid grid-cols-4 gap-2 md:gap-3">
            <button
              v-for="v in [1, 2, 3, 4]"
              :key="v"
              type="button"
              class="btn-candy py-4 md:py-5 text-xl md:text-2xl bg-blossom-soft text-blossom-deep"
              :aria-label="`回答 ${v}`"
              @click="choose(v)"
            >
              {{ v }}
            </button>
          </div>
          <div
            v-if="status === 'right'"
            class="mt-4 rounded-2xl bg-mint-soft px-4 py-3 animate-fade-up"
          >
            <div class="flex items-center gap-2 font-black text-mint-deep mb-1">
              <Check class="w-4 h-4" />
              答对啦！
            </div>
            <p class="text-sm font-bold text-ink leading-relaxed">{{ quiz.explain }}</p>
            <button
              type="button"
              class="btn-candy mt-3 px-5 py-2.5 bg-mint-deep text-white text-sm"
              @click="next"
            >
              {{ current < QUIZ.length - 1 ? '下一题' : '领取毕业证书' }}
            </button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
