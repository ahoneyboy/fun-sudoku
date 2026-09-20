/**
 * 游戏 store：一局对局的全部状态与判题逻辑
 *
 * 职责：
 * - 开局取题（优先级：错题重练 sig → 预生成缓存池 FIFO → 现场生成兜底）
 * - 填数/擦除/提示/检查/重置的规则判定（含失误计数的"同格连错只记 1 次"）
 * - 计时器（显隐分离、切后台暂停、通关冻结）
 * - 通关结算（星级公式、写入记录、错题重练自动移出错题本）
 * - 题库缓存池维护（meta 分区 pool_<diffKey>，空闲时补 2 题）
 */
import { defineStore } from 'pinia';
import {
  DIFFS,
  generate,
  encode,
  decode,
  signature,
} from '../core/sudoku';
import { uuid } from '../core/format';
import { sfx } from '../core/audio';
import { db } from './db';
import { useSettingsStore } from './settings';
import { useRecordsStore } from './records';
import { useWrongbookStore } from './wrongbook';
import { useUiStore } from './ui';

const POOL_TARGET = 2; // 池内少于 2 题就补（每次补 2 题）
const poolKey = (diffKey) => `pool_${diffKey}`;

// 定时器 id 放模块级而不是 state：interval 句柄不需要响应式，也不该被 devtools 序列化
let timerId = null;

/** 从缓存池取一题（FIFO：最旧生成、最早消耗） */
async function takeFromPool(diffKey) {
  try {
    const pool = (await db.meta.getItem(poolKey(diffKey))) || [];
    const head = pool.shift();
    if (head && head.p && head.s) {
      db.meta.setItem(poolKey(diffKey), pool).catch(() => {});
      return { puzzle: decode(head.p), solution: decode(head.s) };
    }
  } catch (e) {
    // 存储异常时静默走现场生成兜底
  }
  return null;
}

/** 空闲时给缓存池补 2 题（生成 <5ms，不阻塞交互） */
function refillPool(diffKey) {
  if (typeof window === 'undefined') return;
  const schedule =
    window.requestIdleCallback || ((fn) => setTimeout(fn, 800));
  schedule(() => {
    (async () => {
      try {
        const pool = (await db.meta.getItem(poolKey(diffKey))) || [];
        if (pool.length >= POOL_TARGET) return;
        for (let i = 0; i < 2; i++) {
          const g = generate(diffKey);
          pool.push({ p: encode(g.puzzle), s: encode(g.solution) });
        }
        await db.meta.setItem(poolKey(diffKey), pool);
      } catch (e) {
        // 补池失败无所谓：下次开局会现场生成
      }
    })();
  });
}

export const useGameStore = defineStore('game', {
  state: () => ({
    active: false, // 是否有一局进行中（GameView 依赖它渲染棋盘）
    diffKey: 'easy4',
    size: 4,
    puzzle: [], // 题面（0=空格），给定数字不可改
    solution: [], // 唯一终盘
    user: [], // 用户当前填的数字（0=未填）
    errors: [], // 实时标红位（含检查标红）
    errorCounted: [], // 同格连错去重位：改对后才重置
    selected: -1,
    mistakes: 0, // 小失误数
    hintsLeft: 3, // 本局剩余提示
    hintsUsed: 0, // 本局已用提示（计入星级）
    sig: '', // 本题指纹（错题收录/重练移除用）
    redoMode: false, // 是否错题重练局
    finished: false, // 通关（WinModal 显隐）
    showTime: true, // 顶栏计时显隐（隐藏后后台仍在计时）
    // 计时：片段累计制 —— accumMs 存已完成片段，startAt 为当前片段起点，
    // 切后台只需暂停（冻结片段），回前台续跑，成绩不受影响
    startAt: 0,
    accumMs: 0,
    running: false,
    nowMs: 0,
  }),

  getters: {
    /** 当前用时（秒）。running=false 时只取累计片段 → 通关冻结即最终成绩 */
    elapsedSec(state) {
      const ms = state.running
        ? state.accumMs + (state.nowMs - state.startAt)
        : state.accumMs;
      return Math.max(0, Math.floor(ms / 1000));
    },
    /** 合并盘面（给定 ∪ 用户）是否已填满 */
    isMergedFull(state) {
      return state.puzzle.every((g, i) => (g || state.user[i]) !== 0);
    },
    /** 星级 = 失误数 + 提示数：0 次 → 3 星，≤4 次 → 2 星，其余 1 星 */
    stars(state) {
      const t = state.mistakes + state.hintsUsed;
      if (t === 0) return 3;
      if (t <= 4) return 2;
      return 1;
    },
    /** 数字键盘剩余可填数量：1..size 各剩几个（按当前盘面 已放/应放 统计） */
    remainingCounts(state) {
      const counts = new Array(state.size + 1).fill(0);
      for (let i = 0; i < state.puzzle.length; i++) {
        const v = state.puzzle[i] || state.user[i];
        if (v) counts[v]++;
      }
      const out = [];
      for (let v = 1; v <= state.size; v++) {
        out.push(state.size - counts[v]);
      }
      return out;
    },
  },

  actions: {
    /**
     * 开一局新题（或按 sig 重练错题）
     * @param {{diff?: string, sig?: string}} opts
     */
    async newGame({ diff = 'easy4', sig = '' } = {}) {
      const wrongbook = useWrongbookStore();
      this.stopTimer();

      const item = sig ? wrongbook.bySig(sig) : null;
      let diffKey = DIFFS[diff] ? diff : 'easy4';
      let puzzle;
      let solution;
      let redoMode = false;

      if (item) {
        // 优先级 1：错题重练，按指纹原题还原（含原终盘）
        diffKey = DIFFS[item.diffKey] ? item.diffKey : diffKey;
        puzzle = decode(item.puzzle);
        solution = decode(item.solution);
        redoMode = true;
      } else {
        // 优先级 2：缓存池 FIFO；优先级 3：现场生成兜底（<5ms）
        const cached = await takeFromPool(diffKey);
        const fresh = cached || generate(diffKey);
        puzzle = fresh.puzzle;
        solution = fresh.solution;
      }

      const d = DIFFS[diffKey];
      const n2 = d.size * d.size;
      this.$patch({
        active: true,
        finished: false,
        diffKey,
        size: d.size,
        puzzle,
        solution,
        user: new Array(n2).fill(0),
        errors: new Array(n2).fill(false),
        errorCounted: new Array(n2).fill(false),
        selected: -1,
        mistakes: 0,
        hintsLeft: d.hints,
        hintsUsed: 0,
        sig: item ? item.sig : signature(diffKey, puzzle),
        redoMode,
        // showTime 是用户偏好，跨局保留，不在 $patch 里重置
        accumMs: 0,
        startAt: Date.now(),
        nowMs: Date.now(),
        running: true,
      });
      if (!item) refillPool(diffKey); // 后台空闲补池，不阻塞开局
      this.startTimer();
    },

    /** 同一道题恢复初始：失误/计时/提示次数全部清零（重置按钮） */
    resetSelf() {
      if (!this.active) return;
      const n2 = this.size * this.size;
      this.user = new Array(n2).fill(0);
      this.errors = new Array(n2).fill(false);
      this.errorCounted = new Array(n2).fill(false);
      this.selected = -1;
      this.mistakes = 0;
      this.hintsLeft = DIFFS[this.diffKey].hints;
      this.hintsUsed = 0;
      this.finished = false;
      this.accumMs = 0;
      this.startAt = Date.now();
      this.nowMs = this.startAt;
      this.running = true;
      this.startTimer();
    },

    /** 放弃当前局（恢复出厂等场景调用） */
    abandon() {
      this.stopTimer();
      this.active = false;
      this.finished = false;
      this.selected = -1;
    },

    // ---------- 计时器 ----------

    startTimer() {
      this.stopTimer();
      this.nowMs = Date.now();
      timerId = setInterval(() => {
        this.nowMs = Date.now();
      }, 500);
    },
    stopTimer() {
      if (timerId) {
        clearInterval(timerId);
        timerId = null;
      }
    },
    /** 切后台 / 通关时冻结当前片段（成绩不受影响） */
    pauseTimer() {
      if (!this.running) return;
      this.accumMs += Date.now() - this.startAt;
      this.running = false;
    },
    /** 回前台续跑（已通关或无对局时忽略） */
    resumeTimer() {
      if (this.running || this.finished || !this.active) return;
      this.startAt = Date.now();
      this.nowMs = this.startAt;
      this.running = true;
    },
    /** 顶栏点计时：仅切换显隐，后台继续计时 */
    toggleTimeVisible() {
      this.showTime = !this.showTime;
    },

    // ---------- 交互 ----------

    select(idx) {
      if (!this.active || this.finished) return;
      this.selected = idx;
    },

    /** 键盘/数字键盘统一入口：往选中格填 v */
    inputDigit(v) {
      if (!this.active || this.finished) return;
      const settings = useSettingsStore();
      const ui = useUiStore();
      const idx = this.selected;
      if (idx < 0) {
        ui.toast('先点一个格子，再选数字哦', 'info');
        return;
      }
      if (this.puzzle[idx] !== 0) {
        ui.toast('这是题目给出的数字，不能修改哦', 'info');
        return;
      }
      if (this.user[idx] === v) return; // 重复填同一个数：忽略
      this.user[idx] = v;

      const ok = v === this.solution[idx];
      if (settings.realtime) {
        if (ok) {
          this.errors[idx] = false;
          // 改对后重置该格连错计数：之后再错要重新记 1 次
          this.errorCounted[idx] = false;
          if (settings.sound) sfx.ok();
        } else {
          this.errors[idx] = true;
          // 同一格连续错只记 1 次失误
          if (!this.errorCounted[idx]) {
            this.mistakes++;
            this.errorCounted[idx] = true;
          }
          if (settings.sound) sfx.err();
        }
      } else if (settings.sound) {
        // 实时提示关闭：不标色不计失误，只给中性点选音，正确性交给"检查"
        sfx.tap();
      }

      // 填满判断必须用合并盘面：给定格的 user 恒为 0，只看 user 会漏判
      if (this.isMergedFull) this.autoJudge();
    },

    /** 擦除选中格的用户数字（给定数字不可擦） */
    eraseCell() {
      if (!this.active || this.finished) return;
      const ui = useUiStore();
      const idx = this.selected;
      if (idx < 0) {
        ui.toast('先选一个格子再擦除哦', 'info');
        return;
      }
      if (this.puzzle[idx] !== 0) {
        ui.toast('题目给出的数字不能擦除哦', 'info');
        return;
      }
      if (this.user[idx] === 0 && !this.errors[idx]) return;
      this.user[idx] = 0;
      this.errors[idx] = false;
      // 注意：errorCounted 不重置 —— 只有"改对"才重新计数，擦掉再错仍是同一轮失误
      if (useSettingsStore().sound) sfx.tap();
    },

    /**
     * 提示：随机挑一个"空着或填错"的格填入正确答案，并返回"为什么"讲解。
     * 每局限 DIFFS.hints（3）次。
     * @returns {{idx:number, value:number, text:string}|null}
     */
    useHint() {
      if (!this.active || this.finished) return null;
      const ui = useUiStore();
      if (this.hintsLeft <= 0) {
        ui.toast('本局的提示次数用完啦', 'info');
        return null;
      }
      const cands = [];
      for (let i = 0; i < this.user.length; i++) {
        if (this.puzzle[i] !== 0) continue; // 跳过题目给定
        if (this.user[i] === this.solution[i]) continue; // 跳过已填对的
        cands.push(i);
      }
      if (cands.length === 0) {
        ui.toast('盘面上没有需要提示的地方啦，真棒！', 'success');
        return null;
      }
      const idx = cands[Math.floor(Math.random() * cands.length)];
      const v = this.solution[idx];
      this.user[idx] = v;
      this.errors[idx] = false;
      this.errorCounted[idx] = false; // 提示把格子改对了：重置连错计数
      this.hintsLeft--;
      this.hintsUsed++;
      this.selected = idx;
      if (useSettingsStore().sound) sfx.ok();
      // 提示可能恰好补满盘面 → 走填满自动校验（可能直接通关）
      if (this.isMergedFull) this.autoJudge();
      return { idx, value: v, text: this.hintReason(idx) };
    },

    /**
     * "为什么"讲解：三级递进，教小朋友推理而不是给答案
     */
    hintReason(idx) {
      const n = this.size;
      const r = Math.floor(idx / n);
      const c = idx % n;
      const v = this.solution[idx];
      // 以"该格为空"的视角统计缺失，排除刚被提示填入的数自身
      const merged = this.puzzle.map((g, i) => g || this.user[i]);
      merged[idx] = 0;
      const rowSet = new Set();
      const colSet = new Set();
      const boxSet = new Set();
      for (let i = 0; i < n; i++) {
        if (merged[r * n + i]) rowSet.add(merged[r * n + i]);
        if (merged[i * n + c]) colSet.add(merged[i * n + c]);
      }
      // 宫几何与引擎一致：4 宫=2×2，6 宫=2×3（宽 3 高 2），9 宫=3×3
      const cfgBoxW = n === 4 ? 2 : 3;
      const cfgBoxH = n === 9 ? 3 : 2;
      const br = Math.floor(r / cfgBoxH) * cfgBoxH;
      const bc = Math.floor(c / cfgBoxW) * cfgBoxW;
      for (let dr = 0; dr < cfgBoxH; dr++) {
        for (let dc = 0; dc < cfgBoxW; dc++) {
          const val = merged[(br + dr) * n + (bc + dc)];
          if (val) boxSet.add(val);
        }
      }
      const missingRow = [];
      const missingCol = [];
      const missingBox = [];
      for (let d = 1; d <= n; d++) {
        if (!rowSet.has(d)) missingRow.push(d);
        if (!colSet.has(d)) missingCol.push(d);
        if (!boxSet.has(d)) missingBox.push(d);
      }
      // 第一级：某条线恰好只缺这一个数
      if (missingRow.length === 1) return `第 ${r + 1} 行只缺 ${v}，正正好填上！`;
      if (missingCol.length === 1) return `第 ${c + 1} 列只缺 ${v}，正正好填上！`;
      if (missingBox.length === 1) return `它所在的宫里只缺 ${v}，正正好填上！`;
      // 第二级：行+列+宫合计已出现 n-1 种数字 → 只剩唯一候选
      const seen = new Set([...rowSet, ...colSet, ...boxSet]);
      if (seen.size === n - 1) {
        return `行、列、宫都容不下别的数字，只能填 ${v}！`;
      }
      // 通用文案
      return `这一格应该填 ${v}，数一数它所在的行、列和宫吧！`;
    },

    /**
     * 检查：三种结果 —— 未满无错给鼓励 / 有错标红计失误并收录错题本 / 已满全对即通关
     */
    runCheck() {
      if (!this.active || this.finished) return;
      const ui = useUiStore();
      const settings = useSettingsStore();
      const wrong = [];
      for (let i = 0; i < this.user.length; i++) {
        if (this.user[i] !== 0 && this.user[i] !== this.solution[i]) wrong.push(i);
      }
      if (wrong.length === 0) {
        if (!this.isMergedFull) {
          ui.toast('已填的部分全部正确，继续加油！', 'success');
          if (settings.sound) sfx.ok();
        } else {
          this.finish(); // 已满全对 → 通关
        }
        return;
      }
      // 有错：标红 + 统计新失误（同格去重）+ 收录错题本（同题去重、最新在前）
      wrong.forEach((i) => {
        this.errors[i] = true;
        if (!this.errorCounted[i]) {
          this.mistakes++;
          this.errorCounted[i] = true;
        }
      });
      useWrongbookStore().add({
        sig: this.sig,
        diffKey: this.diffKey,
        puzzle: encode(this.puzzle),
        solution: encode(this.solution),
        addedAt: Date.now(),
      });
      ui.toast(`发现了 ${wrong.length} 处小失误，已帮你收进错题本啦`, 'warn', 3200);
      if (settings.sound) sfx.err();
    },

    /**
     * 填满自动校验：全对直接通关；有错标红 + 温柔提示（不收入错题本）
     */
    autoJudge() {
      const ui = useUiStore();
      const settings = useSettingsStore();
      const wrong = [];
      for (let i = 0; i < this.user.length; i++) {
        if (this.user[i] !== 0 && this.user[i] !== this.solution[i]) wrong.push(i);
      }
      if (wrong.length === 0) {
        this.finish();
        return;
      }
      wrong.forEach((i) => {
        this.errors[i] = true;
        if (!this.errorCounted[i]) {
          this.mistakes++;
          this.errorCounted[i] = true;
        }
      });
      ui.toast(`差一点点！有 ${wrong.length} 处小失误，改一改就成功啦`, 'warn', 3200);
      if (settings.sound) sfx.err();
    },

    /**
     * 通关结算：冻结计时 → 写做题记录 → 错题重练则移出错题本
     */
    finish() {
      this.pauseTimer();
      this.stopTimer();
      this.finished = true;
      useRecordsStore().addRecord({
        id: uuid(),
        diffKey: this.diffKey,
        sec: this.elapsedSec,
        stars: this.stars,
        mistakes: this.mistakes,
        hintsUsed: this.hintsUsed,
        finishedAt: Date.now(),
      });
      if (this.redoMode) {
        useWrongbookStore().remove(this.sig); // 重练成功，自动移出错题本
      }
      if (useSettingsStore().sound) sfx.win();
    },

    /** 键盘方向键移动选中格（越界夹紧） */
    moveSelection(dr, dc) {
      if (!this.active || this.finished) return;
      const n = this.size;
      if (this.selected < 0) {
        this.selected = 0;
        return;
      }
      const r = Math.floor(this.selected / n);
      const c = this.selected % n;
      const nr = Math.min(n - 1, Math.max(0, r + dr));
      const nc = Math.min(n - 1, Math.max(0, c + dc));
      this.selected = nr * n + nc;
    },
  },
});
