<script setup>
/**
 * 统计页（Web 增强）：数字卡 + ECharts 图表
 * 近 7/30 天做题量柱状图（可切换）、各难度通关分布饼图、
 * 平均用时趋势折线（按日聚合）、各难度最佳用时列表。
 * 图表容器随窗口自适应（vue-echarts autoresize），无手写媒体查询。
 */
import { ref, computed, onMounted } from 'vue';
import VChart from 'vue-echarts';
import {
  CalendarCheck,
  Star,
  Trophy,
  BarChart3,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
} from 'lucide-vue-next';
import '../core/echarts'; // 按需注册副作用
import { DIFFS } from '../core/sudoku';
import { fmtTime } from '../core/format';
import { useRecordsStore } from '../stores/records';
import StatCard from '../components/StatCard.vue';
import EmptyState from '../components/EmptyState.vue';

const records = useRecordsStore();
const range = ref(7); // 柱状图时间窗：7 / 30 天

// 难度主题色（与首页马卡龙一致）
const DIFF_HEX = { easy4: '#2E8B62', easy6: '#B07E10', normal9: '#3D6FB5', hard9: '#7A55C0' };
const AXIS_LABEL = { color: '#9A8893', fontSize: 11, fontWeight: 'bold' };
const SPLIT_LINE = { lineStyle: { color: '#F5EDE0' } };

const barOption = computed(() => {
  const days = records.dailyCounts(range.value);
  return {
    grid: { left: 6, right: 6, top: 20, bottom: 0, containLabel: true },
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: days.map((d) => d.label),
      axisLabel: AXIS_LABEL,
      axisLine: { lineStyle: { color: '#F0E4D2' } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLabel: AXIS_LABEL,
      splitLine: SPLIT_LINE,
    },
    series: [
      {
        type: 'bar',
        name: '完成题数',
        data: days.map((d) => d.count),
        barWidth: '55%',
        itemStyle: { color: '#3D6FB5', borderRadius: [8, 8, 0, 0] },
      },
    ],
  };
});

const pieOption = computed(() => ({
  tooltip: { trigger: 'item', formatter: '{b}：{c} 次（{d}%）' },
  legend: {
    bottom: 0,
    icon: 'circle',
    itemWidth: 10,
    itemHeight: 10,
    textStyle: { color: '#5B4A54', fontSize: 12, fontWeight: 'bold' },
  },
  series: [
    {
      type: 'pie',
      radius: ['42%', '68%'],
      center: ['50%', '44%'],
      label: { show: false },
      data: Object.keys(DIFFS)
        .map((k) => ({
          name: DIFFS[k].label,
          value: records.diffDist[k] || 0,
          itemStyle: { color: DIFF_HEX[k] },
        }))
        .filter((d) => d.value > 0),
    },
  ],
}));

const lineOption = computed(() => {
  const days = records.dailyAvgSec(30);
  return {
    grid: { left: 6, right: 6, top: 20, bottom: 0, containLabel: true },
    tooltip: {
      trigger: 'axis',
      valueFormatter: (v) => (v == null ? '无记录' : `${v} 秒`),
    },
    xAxis: {
      type: 'category',
      data: days.map((d) => d.label),
      axisLabel: { ...AXIS_LABEL, interval: 4 },
      axisLine: { lineStyle: { color: '#F0E4D2' } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: { ...AXIS_LABEL, formatter: '{value}s' },
      splitLine: SPLIT_LINE,
    },
    series: [
      {
        type: 'line',
        name: '平均用时',
        data: days.map((d) => d.avg),
        smooth: true,
        connectNulls: false, // 无记录的日期断开，不造数据
        symbolSize: 6,
        lineStyle: { width: 3, color: '#E05C75' },
        itemStyle: { color: '#E05C75' },
        areaStyle: { color: 'rgba(224, 92, 117, 0.10)' },
      },
    ],
  };
});

const bestRows = computed(() =>
  Object.keys(DIFFS).map((k) => ({
    key: k,
    label: DIFFS[k].label,
    tone: DIFFS[k].tone,
    best: records.bestByDiff[k],
  })),
);

// Tailwind JIT 需要字面量类名
const TONE = {
  mint: 'bg-mint-soft text-mint-deep',
  butter: 'bg-butter-soft text-butter-deep',
  azure: 'bg-azure-soft text-azure-deep',
  lilac: 'bg-lilac-soft text-lilac-deep',
};

onMounted(() => records.hydrate());
</script>

<template>
  <div class="w-full max-w-5xl mx-auto px-4 pt-5 pb-28 md:px-8 md:pt-8 md:pb-10 space-y-6">
    <div>
      <h1 class="text-2xl md:text-3xl font-black">我的统计</h1>
      <p class="text-sm font-bold text-ink-soft mt-1">每一步成长都算数！</p>
    </div>

    <!-- 顶部数字卡 -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
      <StatCard label="今日完成" :value="records.todayCount" :icon="CalendarCheck" tone="mint" />
      <StatCard label="累计星星" :value="records.totalStars" :icon="Star" tone="butter" />
      <StatCard label="累计通关" :value="records.totalCount" :icon="Trophy" tone="blossom" />
    </div>

    <!-- 加载骨架 -->
    <div v-if="!records.hydrated" class="grid lg:grid-cols-2 gap-4">
      <div v-for="i in 4" :key="i" class="card h-64 animate-pulse bg-[#F7F2FB]" />
    </div>

    <!-- 空数据友好状态 -->
    <EmptyState
      v-else-if="!records.totalCount"
      :icon="BarChart3"
      title="还没有做题记录"
      desc="完成第一局之后，这里就会出现属于你的图表啦！"
    >
      <router-link to="/" class="btn-candy mt-2 px-6 py-3 bg-mint-deep text-white">
        去完成第一局
      </router-link>
    </EmptyState>

    <!-- 图表区 -->
    <div v-else class="grid lg:grid-cols-2 gap-3 md:gap-4">
      <!-- 近 7/30 天做题量 -->
      <div class="card p-4 md:p-5">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2 font-black">
            <BarChart3 class="w-5 h-5 text-azure-deep" />
            做题量
          </div>
          <div class="flex gap-1.5">
            <button
              v-for="n in [7, 30]"
              :key="n"
              type="button"
              class="pill cursor-pointer transition-colors"
              :class="
                range === n ? 'bg-azure-deep text-white' : 'bg-cream text-ink-soft'
              "
              @click="range = n"
            >
              近 {{ n }} 天
            </button>
          </div>
        </div>
        <VChart class="h-64" :option="barOption" autoresize />
      </div>

      <!-- 各难度通关分布 -->
      <div class="card p-4 md:p-5">
        <div class="flex items-center gap-2 font-black mb-2">
          <PieChartIcon class="w-5 h-5 text-blossom-deep" />
          各难度通关分布
        </div>
        <VChart class="h-64" :option="pieOption" autoresize />
      </div>

      <!-- 平均用时趋势 -->
      <div class="card p-4 md:p-5">
        <div class="flex items-center gap-2 font-black mb-2">
          <LineChartIcon class="w-5 h-5 text-blossom-deep" />
          平均用时趋势（近 30 天）
        </div>
        <VChart class="h-64" :option="lineOption" autoresize />
      </div>

      <!-- 各难度最佳用时 -->
      <div class="card p-4 md:p-5">
        <div class="flex items-center gap-2 font-black mb-3">
          <Trophy class="w-5 h-5 text-butter-deep" />
          各难度最佳用时
        </div>
        <ul class="space-y-2.5">
          <li
            v-for="row in bestRows"
            :key="row.key"
            class="flex items-center gap-3 rounded-2xl bg-cream px-4 py-3"
          >
            <span
              class="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
              :class="TONE[row.tone]"
            >
              <Trophy class="w-4 h-4" />
            </span>
            <span class="font-bold flex-1">{{ row.label }}</span>
            <span class="font-black tabular-nums">
              {{ typeof row.best === 'number' ? fmtTime(row.best) : '—' }}
            </span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
