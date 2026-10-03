<script setup>
/**
 * 首页：难度入口 + 统计概览 + 各功能入口
 * 单列流式（手机）→ 双列（sm）→ 四列卡片（lg）
 */
import { useRouter } from 'vue-router';
import {
  Sprout,
  Zap,
  Rocket,
  Flame,
  Medal,
  Crown,
  Play,
  BookX,
  GraduationCap,
  BarChart3,
  Settings,
  CalendarCheck,
  Star,
  Trophy,
  ChevronRight,
  Sparkles,
} from 'lucide-vue-next';
import { DIFFS } from '../core/sudoku';
import { fmtTime } from '../core/format';
import { useRecordsStore } from '../stores/records';
import { useWrongbookStore } from '../stores/wrongbook';
import StatCard from '../components/StatCard.vue';

const router = useRouter();
const records = useRecordsStore();
const wrongbook = useWrongbookStore();

const DIFF_ICONS = {
  easy4: Sprout,
  hard4: Medal,
  easy6: Zap,
  hard6: Crown,
  normal9: Rocket,
  hard9: Flame,
};

// 每日挑战：按星期轮换难度（周一到周日固定顺序，同一张日历人人同题）
const DIFF_KEYS = Object.keys(DIFFS);
const dailyDiffKey = DIFF_KEYS[(new Date().getDay() + 6) % DIFF_KEYS.length];
const dailyMeta = DIFFS[dailyDiffKey];

const todayLabel = (() => {
  const d = new Date();
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日`;
})();

// Tailwind JIT 需要字面量类名：难度配色静态映射
const TONE = {
  mint: 'bg-mint-soft text-mint-deep',
  butter: 'bg-butter-soft text-butter-deep',
  azure: 'bg-azure-soft text-azure-deep',
  lilac: 'bg-lilac-soft text-lilac-deep',
  blossom: 'bg-blossom-soft text-blossom-deep',
  peach: 'bg-peach-soft text-peach-deep',
};

function goDaily() {
  router.push({ path: '/game', query: { diff: dailyDiffKey, daily: '1' } });
}

function bestOf(key) {
  const b = records.bestByDiff[key];
  return typeof b === 'number' ? fmtTime(b) : null;
}
function startGame(key) {
  router.push({ path: '/game', query: { diff: key } });
}
</script>

<template>
  <div class="w-full max-w-5xl mx-auto px-4 pt-5 pb-28 md:px-8 md:pt-8 md:pb-10 space-y-6">
    <!-- Hero：欢迎卡片（标题整块上推入场，装饰四宫格慢悬浮摇摆） -->
    <section
      class="card overflow-hidden bg-lilac-soft border border-[#E4D5FA] p-6 md:p-10 flex items-center gap-6"
    >
      <div class="hero-push flex-1 min-w-0">
        <div class="pill bg-white/70 text-lilac-deep mb-3">
          <Sparkles class="w-3.5 h-3.5" />
          6-12 岁专属卡通数独
        </div>
        <h1 class="text-3xl md:text-4xl font-black leading-tight">
          你好呀，<br class="sm:hidden" />准备好动脑筋了吗？
        </h1>
        <p class="mt-2 text-sm md:text-base font-bold text-ink-soft">
          从四宫格开始，一步步变成数独小达人！
        </p>
        <button
          type="button"
          class="btn-candy mt-5 px-6 py-3 bg-mint-deep text-white"
          @click="startGame('easy4')"
        >
          <Play class="w-4 h-4" />
          四宫先来一局
        </button>
      </div>
      <!-- 装饰：马卡龙四宫格（CSS 形状，无 emoji），慢悬浮 + 轻微摇摆 -->
      <div class="hidden sm:grid grid-cols-2 gap-2 animate-floaty-tilt shrink-0">
        <div class="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-white/85 flex items-center justify-center font-black text-xl md:text-2xl text-mint-deep">1</div>
        <div class="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-white/85 flex items-center justify-center font-black text-xl md:text-2xl text-butter-deep">2</div>
        <div class="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-white/85 flex items-center justify-center font-black text-xl md:text-2xl text-azure-deep">3</div>
        <div class="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-white/85 flex items-center justify-center font-black text-xl md:text-2xl text-blossom-deep">4</div>
      </div>
    </section>

    <!-- 每日挑战：按星期轮换难度，同一天全网同题，连胜激励 -->
    <section
      class="stagger-item card overflow-hidden bg-peach-soft border border-[#F5D9BC] p-5 md:p-6 flex items-center gap-4"
      :style="{ '--i': 1 }"
    >
      <span
        class="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white/80 text-peach-deep flex items-center justify-center shrink-0 animate-pulse-soft"
      >
        <CalendarCheck class="w-7 h-7 md:w-8 md:h-8" />
      </span>
      <div class="flex-1 min-w-0">
        <div class="font-black text-base md:text-lg">
          每日挑战
          <span class="pill bg-white/70 text-peach-deep ml-1">{{ todayLabel }}</span>
        </div>
        <p class="text-xs md:text-sm font-bold text-ink-soft mt-1">
          今天的题目：{{ dailyMeta.label }}（{{ dailyMeta.desc }}）
          <template v-if="records.streak > 0">
            · 已连胜 <span class="text-peach-deep">{{ records.streak }}</span> 天
          </template>
        </p>
      </div>
      <button
        type="button"
        class="btn-candy shrink-0 px-4 md:px-6 py-2.5 md:py-3 text-sm md:text-base"
        :class="records.todayDailyDone ? 'bg-white/80 text-peach-deep' : 'bg-peach-deep text-white'"
        @click="goDaily"
      >
        <CalendarCheck class="w-4 h-4" />
        {{ records.todayDailyDone ? '再玩一次' : '去挑战' }}
      </button>
    </section>

    <!-- 难度入口 -->
    <section class="stagger-item" :style="{ '--i': 2 }">
      <h2 class="text-lg md:text-xl font-black mb-3 px-1">选个难度，出发！</h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        <button
          v-for="(d, key) in DIFFS"
          :key="key"
          type="button"
          class="stagger-item card p-5 text-left transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] cursor-pointer"
          :style="{ '--i': 3 + DIFF_KEYS.indexOf(key) }"
          @click="startGame(key)"
        >
          <div class="flex items-center justify-between mb-3">
            <span class="w-11 h-11 rounded-2xl flex items-center justify-center" :class="TONE[d.tone]">
              <component :is="DIFF_ICONS[key]" class="w-6 h-6" />
            </span>
            <span class="pill" :class="TONE[d.tone]">{{ d.holes }} 空</span>
          </div>
          <div class="font-black text-lg">{{ d.label }}</div>
          <div class="text-xs md:text-sm text-ink-soft font-bold mt-0.5">{{ d.desc }}</div>
          <div class="mt-3 flex items-center justify-between text-xs font-bold text-ink-soft">
            <span>最佳 {{ bestOf(key) || '--:--' }}</span>
            <span>通关 {{ records.diffDist[key] || 0 }} 次</span>
          </div>
        </button>
      </div>
    </section>

    <!-- 统计概览 -->
    <section class="stagger-item" :style="{ '--i': 4 }">
      <div class="flex items-center justify-between mb-3 px-1">
        <h2 class="text-lg md:text-xl font-black">我的战绩</h2>
        <router-link
          to="/stats"
          class="pill bg-azure-soft text-azure-deep cursor-pointer"
        >
          查看详细统计
          <ChevronRight class="w-3.5 h-3.5" />
        </router-link>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        <StatCard label="今日完成" :value="records.todayCount" :icon="CalendarCheck" tone="mint" />
        <StatCard label="累计星星" :value="records.totalStars" :icon="Star" tone="butter" />
        <StatCard label="累计通关" :value="records.totalCount" :icon="Trophy" tone="blossom" />
      </div>
    </section>

    <!-- 功能入口 -->
    <section class="stagger-item" :style="{ '--i': 5 }">
      <h2 class="text-lg md:text-xl font-black mb-3 px-1">更多好玩</h2>
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <router-link
          to="/errorbook"
          class="card p-4 md:p-5 flex flex-col items-start gap-2 hover:-translate-y-0.5 transition-transform cursor-pointer"
        >
          <span class="w-10 h-10 rounded-2xl bg-blossom-soft text-blossom-deep flex items-center justify-center">
            <BookX class="w-5 h-5" />
          </span>
          <span class="font-black">错题本</span>
          <span class="text-xs font-bold text-ink-soft">
            {{ wrongbook.list.length ? `收录 ${wrongbook.list.length} 题，等你来挑战` : '目前没有错题，真棒' }}
          </span>
        </router-link>
        <router-link
          to="/learn"
          class="card p-4 md:p-5 flex flex-col items-start gap-2 hover:-translate-y-0.5 transition-transform cursor-pointer"
        >
          <span class="w-10 h-10 rounded-2xl bg-azure-soft text-azure-deep flex items-center justify-center">
            <GraduationCap class="w-5 h-5" />
          </span>
          <span class="font-black">数独学堂</span>
          <span class="text-xs font-bold text-ink-soft">图解规则 + 随堂小测验</span>
        </router-link>
        <router-link
          to="/stats"
          class="card p-4 md:p-5 flex flex-col items-start gap-2 hover:-translate-y-0.5 transition-transform cursor-pointer"
        >
          <span class="w-10 h-10 rounded-2xl bg-mint-soft text-mint-deep flex items-center justify-center">
            <BarChart3 class="w-5 h-5" />
          </span>
          <span class="font-black">统计</span>
          <span class="text-xs font-bold text-ink-soft">做题量与用时趋势</span>
        </router-link>
        <router-link
          to="/settings"
          class="card p-4 md:p-5 flex flex-col items-start gap-2 hover:-translate-y-0.5 transition-transform cursor-pointer"
        >
          <span class="w-10 h-10 rounded-2xl bg-lilac-soft text-lilac-deep flex items-center justify-center">
            <Settings class="w-5 h-5" />
          </span>
          <span class="font-black">设置</span>
          <span class="text-xs font-bold text-ink-soft">音效、提示与数据管理</span>
        </router-link>
      </div>
    </section>
  </div>
</template>
