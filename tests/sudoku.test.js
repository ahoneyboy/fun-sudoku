/**
 * 数独引擎自测（npm test）
 * 核心断言：四种难度各现场生成 100 题，
 * 1. 挖空数精确达标（easy4=8 / easy6=14 / normal9=36 / hard9=50）
 * 2. 题面给定数字与终盘完全一致（题面 ⊆ 终盘）
 * 3. countSolutions(cfg, puzzle, 2) === 1，即 100% 唯一解
 * 另覆盖 encode/decode 往返、signature 稳定性、多解/非法盘面的计数边界
 */
import { describe, it, expect } from 'vitest';
import {
  DIFFS,
  generate,
  getCfg,
  countSolutions,
  encode,
  decode,
  signature,
} from '../src/core/sudoku';

describe('数独引擎', () => {
  // 验收清单第 1 条：每难度 100 题全部唯一解
  for (const key of Object.keys(DIFFS)) {
    it(
      `${key}：现场生成 100 题全部唯一解，且题面与终盘一致`,
      () => {
        for (let i = 0; i < 100; i++) {
          const g = generate(key);
          const n = DIFFS[key].size;

          expect(g.diffKey).toBe(key);
          expect(g.size).toBe(n);
          expect(g.hints).toBe(DIFFS[key].hints);

          // 挖空数精确达标
          expect(g.puzzle.filter((v) => v === 0)).toHaveLength(DIFFS[key].holes);
          expect(g.puzzle).toHaveLength(n * n);

          // 题面给定数字必须是终盘的子集
          for (let idx = 0; idx < g.puzzle.length; idx++) {
            if (g.puzzle[idx] !== 0) {
              expect(g.puzzle[idx]).toBe(g.solution[idx]);
            }
          }

          // 终盘必须是合法完整盘：行/列/宫都恰好出现 1..n
          const cfg = getCfg(n);
          for (let r = 0; r < n; r++) {
            expect(new Set(g.solution.slice(r * n, r * n + n)).size).toBe(n);
          }
          for (let c = 0; c < n; c++) {
            const col = [];
            for (let r = 0; r < n; r++) col.push(g.solution[r * n + c]);
            expect(new Set(col).size).toBe(n);
          }
          for (let b = 0; b < n; b++) {
            const box = [];
            for (let i = 0; i < n * n; i++) {
              if (boxIndexMatches(cfg, i, b)) box.push(g.solution[i]);
            }
            expect(box).toHaveLength(n); // 每宫恰好 n 格
            expect(new Set(box).size).toBe(n);
          }

          // 唯一解（解数统计器上限 2，找到第 2 个解即剪枝）
          expect(countSolutions(cfg, g.puzzle, 2)).toBe(1);
        }
      },
      300000,
    );
  }

  it('encode/decode 往返一致，0 表示空格', () => {
    const grid = [1, 0, 3, 0, 2, 4, 0, 1, 0];
    expect(encode(grid)).toBe('103024010');
    expect(decode(encode(grid))).toEqual(grid);
  });

  it('signature 稳定，且能区分不同盘面与不同难度', () => {
    const g1 = [1, 2, 3, 4];
    const g2 = [1, 2, 4, 3];
    expect(signature('easy4', g1)).toBe(signature('easy4', g1));
    expect(signature('easy4', g1)).not.toBe(signature('easy4', g2));
    expect(signature('easy6', g1)).not.toBe(signature('easy4', g1));
  });

  it('countSolutions 边界：空盘多解返回 limit；非法盘面返回 0', () => {
    const empty4 = new Array(16).fill(0);
    // 空的 4 宫盘面显然多解：达到上限 2 即返回
    expect(countSolutions(getCfg(4), empty4, 2)).toBe(2);
    // 同行两个 1：初始盘面冲突，0 解
    const illegal = empty4.slice();
    illegal[0] = 1;
    illegal[1] = 1;
    expect(countSolutions(getCfg(4), illegal, 2)).toBe(0);
    // 已完成盘面恰好 1 解
    const full = generate('easy4').solution;
    expect(countSolutions(getCfg(4), full, 2)).toBe(1);
  });
});

/** 测试辅助：一维下标是否属于宫 b（与引擎 boxIndex 的编号规则一致） */
function boxIndexMatches(cfg, i, b) {
  const r = Math.floor(i / cfg.size);
  const c = i % cfg.size;
  return (
    Math.floor(r / cfg.boxH) * (cfg.size / cfg.boxW) + Math.floor(c / cfg.boxW) ===
    b
  );
}
