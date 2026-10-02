/**
 * 做题记录 store
 * 每条记录：{ id, diffKey, sec, stars, mistakes, hintsUsed, finishedAt }
 * IndexedDB records 分区，key = 记录 id（uuid），内存列表为唯一可信视图，
 * 上限 500 条，超出按 finishedAt 淘汰最旧
 */
import { defineStore } from 'pinia';
import { db } from './db';
import { todayKey, fmtDay, uuid } from '../core/format';
import { DIFFS } from '../core/sudoku';
import { useUiStore } from './ui';

/** 成就定义：check 基于记录库状态计算，解锁后用 seen 列表去重提示 */
export const ACHIEVEMENTS = [
  { id: 'first-win', name: '初来乍到', desc: '完成第一局数独', icon: 'Medal', tone: 'mint' },
  { id: 'perfect', name: '零失误大师', desc: '拿下一局满分三星', icon: 'Crown', tone: 'butter' },
  { id: 'ten-wins', name: '小神算手', desc: '累计通关 10 局', icon: 'Sparkles', tone: 'azure' },
  { id: 'thirty-wins', name: '锲而不舍', desc: '累计通关 30 局', icon: 'Target', tone: 'lilac' },
  { id: 'star-20', name: '星星收藏家', desc: '累计摘星 20 颗', icon: 'Star', tone: 'butter' },
  { id: 'all-diffs', name: '六宫全通', desc: '每种难度都通关过', icon: 'Layers', tone: 'mint' },
  { id: 'streak-3', name: '连击三日', desc: '每日挑战连续 3 天', icon: 'Flame', tone: 'blossom' },
  { id: 'streak-7', name: '一周不断', desc: '每日挑战连续 7 天', icon: 'CalendarCheck', tone: 'peach' },
];

/** 昨天的日期键（连胜允许"今天还没做"不断签） */
function yesterdayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return todayKey(d.getTime());
}

export const useRecordsStore = defineStore('records', {
  state: () => ({
    list: [], // newest first
    limit: 500,
    hydrated: false,
    dailyLog: {}, // { 'YYYY-MM-DD': diffKey } 每日挑战完成记录
    seenAchievements: [], // 已提示过的成就 id（避免重复弹toast）
  }),
  getters: {
    totalCount: (s) => s.list.length,
    totalStars: (s) => s.list.reduce((a, r) => a + (Number(r.stars) || 0), 0),
    /** 每日挑战连胜天数：从今天（未做则从昨天）向前连续计数 */
    streak: (s) => {
      let streak = 0;
      const cursor = new Date();
      if (!s.dailyLog[todayKey(cursor.getTime())]) {
        cursor.setDate(cursor.getDate() - 1); // 今天还没做不打断连胜
      }
      while (s.dailyLog[todayKey(cursor.getTime())]) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      }
      return streak;
    },
    todayDailyDone: (s) => !!s.dailyLog[todayKey(Date.now())],
    /** 当前已解锁的成就（含定义） */
    unlockedAchievements: (s) => {
      const dist = {};
      for (const k of Object.keys(DIFFS)) dist[k] = 0;
      for (const r of s.list) {
        if (dist[r.diffKey] !== undefined) dist[r.diffKey] += 1;
      }
      const stats = {
        totalCount: s.list.length,
        totalStars: s.list.reduce((a, r) => a + (Number(r.stars) || 0), 0),
        streak: (() => {
          let n = 0;
          const cursor = new Date();
          if (!s.dailyLog[todayKey(cursor.getTime())]) cursor.setDate(cursor.getDate() - 1);
          while (s.dailyLog[todayKey(cursor.getTime())]) {
            n++;
            cursor.setDate(cursor.getDate() - 1);
          }
          return n;
        })(),
        hasPerfect: s.list.some((r) => r.stars === 3),
        dist,
      };
      return ACHIEVEMENTS.filter((a) => {
        switch (a.id) {
          case 'first-win': return stats.totalCount >= 1;
          case 'perfect': return stats.hasPerfect;
          case 'ten-wins': return stats.totalCount >= 10;
          case 'thirty-wins': return stats.totalCount >= 30;
          case 'star-20': return stats.totalStars >= 20;
          case 'all-diffs': return Object.keys(DIFFS).every((k) => stats.dist[k] > 0);
          case 'streak-3': return stats.streak >= 3;
          case 'streak-7': return stats.streak >= 7;
          default: return false;
        }
      });
    },
    /** 今日完成数（本地时区的"今天"） */
    todayCount: (s) => {
      const key = todayKey(Date.now());
      return s.list.filter((r) => todayKey(r.finishedAt) === key).length;
    },
    /** 各难度通关分布 { easy4: n, ... }（缺失难度补 0，方便图表固定类目） */
    diffDist: (s) => {
      const m = {};
      for (const k of Object.keys(DIFFS)) m[k] = 0;
      for (const r of s.list) {
        if (m[r.diffKey] === undefined) m[r.diffKey] = 0;
        m[r.diffKey] += 1;
      }
      return m;
    },
    /** 各难度最佳用时（秒）{ easy4: sec, ... } */
    bestByDiff: (s) => {
      const m = {};
      for (const r of s.list) {
        if (typeof r.sec !== 'number') continue;
        if (m[r.diffKey] === undefined || r.sec < m[r.diffKey]) {
          m[r.diffKey] = r.sec;
        }
      }
      return m;
    },
    /**
     * 近 N 天做题量（含今天）→ [{ label: 'MM-DD', count }]
     * 返回函数式 getter，让组件传 7/30 切换
     */
    dailyCounts: (s) => (days) => {
      const out = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = todayKey(d.getTime());
        out.push({
          label: fmtDay(key),
          count: s.list.filter((r) => todayKey(r.finishedAt) === key).length,
        });
      }
      return out;
    },
    /** 近 N 天平均用时（按日聚合，无记录的日期为 null 让折线断开） */
    dailyAvgSec: (s) => (days) => {
      const out = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = todayKey(d.getTime());
        const rows = s.list.filter((r) => todayKey(r.finishedAt) === key);
        out.push({
          label: fmtDay(key),
          avg: rows.length
            ? Math.round(rows.reduce((a, r) => a + r.sec, 0) / rows.length)
            : null,
        });
      }
      return out;
    },
  },
  actions: {
    /** 启动恢复：iterate 全量读入内存并排序截断；同时恢复每日记录与成就 seen 列表（幂等） */
    async hydrate() {
      if (this.hydrated) return;
      try {
        await db.ready;
        const rows = [];
        await db.records.iterate((v) => {
          if (v && typeof v === 'object') rows.push(v);
        });
        rows.sort((a, b) => (b.finishedAt || 0) - (a.finishedAt || 0));
        this.list = rows.slice(0, this.limit);
        this.dailyLog = (await db.meta.getItem('daily_log')) || {};
        this.seenAchievements = (await db.meta.getItem('achievements_seen')) || [];
      } catch (e) {
        this.list = [];
      }
      this.hydrated = true;
    },
    /** 每日挑战完成登记（meta 持久化，连胜/成就的数据源） */
    async markDaily(dateKey, diffKey) {
      this.dailyLog = { ...this.dailyLog, [dateKey]: diffKey };
      try {
        await db.meta.setItem('daily_log', this.dailyLog);
      } catch (e) {
        /* 内存降级静默 */
      }
    },
    /** 通关后评估成就：新解锁的弹提示并记入 seen（重复触发不重复弹） */
    evaluateAchievements() {
      const ui = useUiStore();
      const unlockedIds = this.unlockedAchievements.map((a) => a.id);
      const fresh = unlockedIds.filter((id) => !this.seenAchievements.includes(id));
      if (fresh.length === 0) return;
      this.seenAchievements = [
        ...this.seenAchievements,
        ...fresh,
      ];
      db.meta.setItem('achievements_seen', this.seenAchievements).catch(() => {});
      fresh.forEach((id, i) => {
        const a = ACHIEVEMENTS.find((x) => x.id === id);
        if (a) {
          setTimeout(() => {
            ui.toast(`解锁新成就：${a.name}！`, 'success', 3200);
          }, 600 + i * 900);
        }
      });
    },
    /** 通关时写入一条记录；先更内存后落盘 */
    async addRecord(rec) {
      const item = {
        id: rec.id || uuid(),
        diffKey: rec.diffKey,
        sec: Math.max(0, Math.round(Number(rec.sec) || 0)),
        stars: Math.min(3, Math.max(1, Number(rec.stars) || 1)),
        mistakes: Math.max(0, Number(rec.mistakes) || 0),
        hintsUsed: Math.max(0, Number(rec.hintsUsed) || 0),
        finishedAt: Number(rec.finishedAt) || Date.now(),
      };
      this.list.unshift(item);
      // 淘汰最旧：内存 splice + 磁盘删除
      if (this.list.length > this.limit) {
        const dropped = this.list.splice(this.limit);
        dropped.forEach((d) => db.records.removeItem(d.id).catch(() => {}));
      }
      try {
        await db.records.setItem(item.id, item);
      } catch (e) {
        /* 内存降级时静默 */
      }
      this.evaluateAchievements();
    },
    async clearAll() {
      await db.records.clear().catch(() => {});
      this.list = [];
    },
    /** 导入数据：清洗校验后全量覆盖（同 id 以导入为准） */
    async replaceAll(rows) {
      const clean = (Array.isArray(rows) ? rows : [])
        .filter(
          (r) =>
            r &&
            typeof r === 'object' &&
            DIFFS[r.diffKey] &&
            Number.isFinite(Number(r.sec)),
        )
        .map((r) => ({
          id: typeof r.id === 'string' && r.id ? r.id : uuid(),
          diffKey: r.diffKey,
          sec: Math.max(0, Math.round(Number(r.sec))),
          stars: Math.min(3, Math.max(1, Number(r.stars) || 1)),
          mistakes: Math.max(0, Number(r.mistakes) || 0),
          hintsUsed: Math.max(0, Number(r.hintsUsed) || 0),
          finishedAt: Number(r.finishedAt) || Date.now(),
        }))
        .sort((a, b) => b.finishedAt - a.finishedAt)
        .slice(0, this.limit);
      await this.clearAll();
      this.list = clean;
      for (const r of clean) {
        db.records.setItem(r.id, r).catch(() => {});
      }
    },
  },
});
