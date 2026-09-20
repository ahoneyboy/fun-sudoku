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

export const useRecordsStore = defineStore('records', {
  state: () => ({
    list: [], // newest first
    limit: 500,
    hydrated: false,
  }),
  getters: {
    totalCount: (s) => s.list.length,
    totalStars: (s) => s.list.reduce((a, r) => a + (Number(r.stars) || 0), 0),
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
    /** 启动恢复：iterate 全量读入内存并排序截断（幂等） */
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
      } catch (e) {
        this.list = [];
      }
      this.hydrated = true;
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
