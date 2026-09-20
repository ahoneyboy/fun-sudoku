/**
 * 错题本 store
 * 每条：{ sig, diffKey, puzzle(编码串), solution(编码串), addedAt }
 * IndexedDB wrongbook 分区，key = sig 指纹；同题去重、最新在前，上限 50 条
 */
import { defineStore } from 'pinia';
import { db } from './db';
import { DIFFS, decode } from '../core/sudoku';

export const useWrongbookStore = defineStore('wrongbook', {
  state: () => ({
    list: [], // newest first
    limit: 50,
    hydrated: false,
  }),
  getters: {
    /** 按指纹查题（错题重练入口用） */
    bySig: (s) => (sig) => s.list.find((i) => i.sig === sig) || null,
  },
  actions: {
    async hydrate() {
      if (this.hydrated) return;
      try {
        await db.ready;
        const rows = [];
        await db.wrong.iterate((v) => {
          if (v && typeof v === 'object' && v.sig) rows.push(v);
        });
        rows.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
        this.list = rows.slice(0, this.limit);
      } catch (e) {
        this.list = [];
      }
      this.hydrated = true;
    },
    /** 收录一题：同 sig 去重（移到最前并刷新收录时间），超限淘汰最旧 */
    async add(item) {
      if (!item || !item.sig) return;
      // 同题已存在：先移除旧位置，实现"最新在前"
      this.list = this.list.filter((i) => i.sig !== item.sig);
      const entry = {
        sig: item.sig,
        diffKey: item.diffKey,
        puzzle: item.puzzle,
        solution: item.solution,
        addedAt: item.addedAt || Date.now(),
      };
      this.list.unshift(entry);
      if (this.list.length > this.limit) {
        const dropped = this.list.splice(this.limit);
        dropped.forEach((d) => db.wrong.removeItem(d.sig).catch(() => {}));
      }
      try {
        await db.wrong.setItem(entry.sig, entry);
      } catch (e) {
        /* 内存降级时静默 */
      }
    },
    /** 错题重练通关后移除 */
    async remove(sig) {
      this.list = this.list.filter((i) => i.sig !== sig);
      try {
        await db.wrong.removeItem(sig);
      } catch (e) {
        /* 忽略 */
      }
    },
    async clearAll() {
      await db.wrong.clear().catch(() => {});
      this.list = [];
    },
    /** 导入数据：逐条校验（难度合法 + 盘面串长度匹配）后全量覆盖 */
    async replaceAll(rows) {
      const clean = (Array.isArray(rows) ? rows : [])
        .filter((r) => {
          if (!r || typeof r !== 'object') return false;
          const d = DIFFS[r.diffKey];
          if (!d || typeof r.sig !== 'string' || !r.sig) return false;
          if (typeof r.puzzle !== 'string' || r.puzzle.length !== d.size * d.size)
            return false;
          // 盘面串必须能解码成合法数字数组（0-9）
          return /^[0-9]+$/.test(r.puzzle);
        })
        .map((r) => ({
          sig: r.sig,
          diffKey: r.diffKey,
          puzzle: r.puzzle,
          solution:
            typeof r.solution === 'string' &&
            r.solution.length === r.puzzle.length &&
            /^[0-9]+$/.test(r.solution)
              ? r.solution
              : null,
          addedAt: Number(r.addedAt) || Date.now(),
        }))
        // 没带终盘的旧数据无法做提示/校验，直接丢弃 solution 为空之外仍保留？
        // 简化策略：solution 缺失的条目不导入（重练需要终盘判题）
        .filter((r) => r.solution)
        .sort((a, b) => b.addedAt - a.addedAt)
        .slice(0, this.limit);
      await this.clearAll();
      this.list = clean;
      for (const r of clean) {
        db.wrong.setItem(r.sig, r).catch(() => {});
      }
    },
    /** 调试/导入校验用：盘面串能否解码出合法长度 */
    validPuzzle(entry) {
      try {
        return decode(entry.puzzle).length > 0;
      } catch (e) {
        return false;
      }
    },
  },
});
