/**
 * 数独引擎 —— 纯函数模块，与 UI 完全解耦（便于单测与复用）
 *
 * 【为什么用位掩码】行/列/宫各持有一个 int，第 v-1 位为 1 表示数字 v 已出现。
 * 冲突判断只需一次按位与/或（O(1)），而挖空阶段要对每一步做唯一解校验、
 * 每次校验又是整轮回溯，位掩码把常数项压到最低。
 *
 * 【为什么用 MRV 回溯】每次都挑"候选数字最少"的空格先填，搜索树宽度最小，
 * 生成 9 宫完整终盘通常只需个位数回退，单题耗时 <5ms，无需 Web Worker。
 *
 * 【唯一解如何保证】逐格挖空：每挖一格立即用"解数统计器"（上限 2）验证
 * 剩余盘面解数仍为 1，不唯一就把数字放回。任何代码路径产出的题目都 100% 唯一解。
 */

/** 难度参数表（必须与产品规格精确一致） */
export const DIFFS = {
  easy4: { label: '四宫入门', size: 4, holes: 8, hints: 3, tone: 'mint', desc: '2×2 宫，8 个空格' },
  easy6: { label: '六宫简单', size: 6, holes: 14, hints: 3, tone: 'butter', desc: '2×3 宫，14 个空格' },
  normal9: { label: '九宫普通', size: 9, holes: 36, hints: 3, tone: 'azure', desc: '3×3 宫，36 个空格' },
  hard9: { label: '九宫困难', size: 9, holes: 50, hints: 3, tone: 'lilac', desc: '3×3 宫，50 个空格' },
};

/** 宫几何：4 宫=2×2；6 宫=2×3（宫宽 3、宫高 2）；9 宫=3×3。
 *  full 是"全部数字已用"的位掩码，供候选计算使用 */
export function getCfg(size) {
  if (size === 4) return { size: 4, boxW: 2, boxH: 2, full: 0b1111 };
  if (size === 6) return { size: 6, boxW: 3, boxH: 2, full: 0b111111 };
  if (size === 9) return { size: 9, boxW: 3, boxH: 3, full: 0x1ff };
  throw new Error(`不支持的数独边长：${size}`);
}

/** 一维下标 → 宫编号：先按宫行再按宫列（与棋盘渲染分组保持一致） */
function boxIndex(cfg, r, c) {
  return (
    Math.floor(r / cfg.boxH) * (cfg.size / cfg.boxW) + Math.floor(c / cfg.boxW)
  );
}

/** 二进制中 1 的个数（候选数量） */
function popcount(x) {
  let n = 0;
  while (x) {
    x &= x - 1;
    n++;
  }
  return n;
}

/** 位掩码 → 数字数组（低位在前，即数字从小到大） */
function maskToDigits(mask) {
  const out = [];
  for (let v = 1; mask; v++, mask >>= 1) {
    if (mask & 1) out.push(v);
  }
  return out;
}

/** Fisher-Yates 原地洗牌（rand 可注入，便于测试复现） */
function shuffle(arr, rand = Math.random) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** 盘面 → 字符串（0 表示空格） */
export function encode(grid) {
  return grid.join('');
}

/** 字符串 → 盘面 */
export function decode(str) {
  return String(str).split('').map(Number);
}

/** 错题去重指纹：难度 + 盘面哈希（djb2）。
 *  为什么不直接用整串盘面做 key：9 宫 key 长达 90+ 字符，
 *  哈希成 36 进制短串更适合做 IndexedDB 主键；错题本内同时存有原盘面，无碰撞风险担忧 */
export function signature(diffKey, puzzle) {
  const s = diffKey + '|' + encode(puzzle);
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  }
  return `${diffKey}_${h.toString(36)}`;
}

/**
 * 解数统计器：统计盘面的解的个数，找到 limit 个即提前剪枝返回。
 * @param {object} cfg getCfg 的宫几何配置
 * @param {number[]} grid 盘面（0 为空格）
 * @param {number} limit 解数上限（挖空校验固定传 2：1=唯一解，2=多解即淘汰）
 * @returns {number} 实际找到的解数（不超过 limit）
 */
export function countSolutions(cfg, grid, limit = 2) {
  const { size, full } = cfg;
  const n2 = size * size;
  const rows = new Array(size).fill(0);
  const cols = new Array(size).fill(0);
  const boxes = new Array(size).fill(0);
  // 不污染调用方盘面
  const g = grid.slice();

  // 冲突预检 + 初始化位掩码：初始盘面自身冲突直接 0 解
  for (let i = 0; i < n2; i++) {
    const v = g[i];
    if (!v) continue;
    const bit = 1 << (v - 1);
    const r = Math.floor(i / size);
    const c = i % size;
    const b = boxIndex(cfg, r, c);
    if (rows[r] & bit || cols[c] & bit || boxes[b] & bit) return 0;
    rows[r] |= bit;
    cols[c] |= bit;
    boxes[b] |= bit;
  }

  let count = 0;

  function dfs() {
    if (count >= limit) return;
    // MRV：线性扫描找出候选最少的空格（候选 0 = 死路即回退）
    let best = -1;
    let bestMask = 0;
    let bestN = size + 1;
    for (let i = 0; i < n2; i++) {
      if (g[i]) continue;
      const r = Math.floor(i / size);
      const c = i % size;
      const mask = full & ~(rows[r] | cols[c] | boxes[boxIndex(cfg, r, c)]);
      const n = popcount(mask);
      if (n === 0) return;
      if (n < bestN) {
        bestN = n;
        best = i;
        bestMask = mask;
        if (n === 1) break; // 裸格直接定，剪枝
      }
    }
    if (best === -1) {
      count++; // 没有空格了：找到一个完整解
      return;
    }
    const r = Math.floor(best / size);
    const c = best % size;
    const b = boxIndex(cfg, r, c);
    let mask = bestMask;
    while (mask) {
      const bit = mask & -mask; // 取最低位的候选
      mask ^= bit;
      g[best] = Math.log2(bit) + 1;
      rows[r] |= bit;
      cols[c] |= bit;
      boxes[b] |= bit;
      dfs();
      // 回溯还原
      g[best] = 0;
      rows[r] &= ~bit;
      cols[c] &= ~bit;
      boxes[b] &= ~bit;
      if (count >= limit) return; // 达到上限，逐层退出
    }
  }

  dfs();
  return count;
}

/**
 * 回溯生成一张随机完整终盘：候选数字随机乱序保证每局不同
 */
function generateFull(cfg, rand) {
  const { size, full } = cfg;
  const n2 = size * size;
  const g = new Array(n2).fill(0);
  const rows = new Array(size).fill(0);
  const cols = new Array(size).fill(0);
  const boxes = new Array(size).fill(0);

  function dfs() {
    let best = -1;
    let bestMask = 0;
    let bestN = size + 1;
    for (let i = 0; i < n2; i++) {
      if (g[i]) continue;
      const r = Math.floor(i / size);
      const c = i % size;
      const mask = full & ~(rows[r] | cols[c] | boxes[boxIndex(cfg, r, c)]);
      const n = popcount(mask);
      if (n === 0) return false;
      if (n < bestN) {
        bestN = n;
        best = i;
        bestMask = mask;
        if (n === 1) break;
      }
    }
    if (best === -1) return true; // 全部填满：终盘生成成功
    const r = Math.floor(best / size);
    const c = best % size;
    const b = boxIndex(cfg, r, c);
    // 关键随机源：同一格的候选数字乱序尝试 → 终盘分布均匀、每局不同
    const digits = shuffle(maskToDigits(bestMask), rand);
    for (const v of digits) {
      const bit = 1 << (v - 1);
      g[best] = v;
      rows[r] |= bit;
      cols[c] |= bit;
      boxes[b] |= bit;
      if (dfs()) return true;
      g[best] = 0;
      rows[r] &= ~bit;
      cols[c] &= ~bit;
      boxes[b] &= ~bit;
    }
    return false;
  }

  dfs();
  return g;
}

/**
 * 随机顺序逐格挖空：每挖一格立即校验唯一解，不唯一则放回。
 * 这一步是"任何题目 100% 唯一解"的唯一入口，不可简化。
 */
function digHoles(cfg, solution, holes, rand) {
  const puzzle = solution.slice();
  const order = shuffle(
    Array.from({ length: solution.length }, (_, i) => i),
    rand,
  );
  let removed = 0;
  for (const idx of order) {
    if (removed >= holes) break;
    const backup = puzzle[idx];
    if (!backup) continue;
    puzzle[idx] = 0;
    if (countSolutions(cfg, puzzle, 2) === 1) {
      removed++;
    } else {
      puzzle[idx] = backup; // 多解了：把数字放回
    }
  }
  return puzzle;
}

/**
 * 生成一道题目
 * @param {string} diffKey DIFFS 中的难度键
 * @param {() => number} rand 随机源（默认 Math.random，测试可注入）
 * @returns {{diffKey: string, size: number, puzzle: number[], solution: number[], hints: number}}
 */
export function generate(diffKey, rand = Math.random) {
  const d = DIFFS[diffKey];
  if (!d) throw new Error(`未知难度：${diffKey}`);
  const cfg = getCfg(d.size);
  // 挖空 50 这种高目标在随机顺序下偶尔一轮挖不满（个别格一挖就多解），
  // 换一张终盘重试兜底；实测几乎总是首轮达标
  for (let attempt = 0; attempt < 30; attempt++) {
    const solution = generateFull(cfg, rand);
    const puzzle = digHoles(cfg, solution, d.holes, rand);
    if (puzzle.filter((v) => v === 0).length === d.holes) {
      return { diffKey, size: d.size, puzzle, solution, hints: d.hints };
    }
  }
  // 极端兜底：接受挖空数略少的盘面 —— 它仍然经过逐步唯一解校验，
  // 绝不返回多解题（宁可少挖，不可破规）
  const solution = generateFull(cfg, rand);
  const puzzle = digHoles(cfg, solution, d.holes, rand);
  return { diffKey, size: d.size, puzzle, solution, hints: d.hints };
}
