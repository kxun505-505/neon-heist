/*
 * 1-40 关的难度曲线（生成器和验收共用）。依据见 docs/original-analysis.md，规则见 docs/level-rules.md。
 *
 * 每一项：
 *   pieces  零件数（环 + 直杆）范围
 *   par     最少拖动次数范围（求解器算出）
 *   trap    第一步“走错”的比例下限：走了以后最少步数变多，或者走进解不开的死局
 *   tpl     用 tools/levelgen/levelgen.js 里的手工模板（结构固定，只随机角度）
 *   grow    用程序生成：hubs 闭合根环个数、knobs 被扣环带凸钉的比例、bars 直杆个数、
 *           bridges 同时被两个主环扣住的零件个数、lattice 网格（tri 三角 / sq 方格 / any）
 *   new     这一关第一次出现的机制（每关最多 1 个，配一句提示；只在普通关引入，困难关只组合已经学过的机制）
 *   hard    困难关（每 5 关的最后一关，见 src/chapters.js 的 isHard）
 *
 * 原则：零件数涨得慢（每章最多 +6），难度主要靠布局推理（凸钉卡位、空夹套挡路、桥、先后顺序、第一步陷阱）。
 */
(function (root) {
  'use strict';
  const G = (o) => Object.assign({ hubs: [1, 2], knobs: 0.3, bars: [0, 0], bridges: [0, 1], lattice: 'any' }, o);
  root.RRCurve = [
    // ---- 第 1 章 SUNSET COAST（1-20）：教会全部基础机制 ----
    { n: 1, pieces: [2, 2], par: [1, 1], trap: 0, tpl: 'L1', new: '把缺口转到夹套处' },
    { n: 2, pieces: [4, 4], par: [3, 3], trap: 0, tpl: 'L2', new: '主环要等它扣着的环先走' },
    { n: 3, pieces: [5, 5], par: [4, 5], trap: 0, tpl: 'L3', new: '闭合环转不动；凸钉会撞' },
    { n: 4, pieces: [7, 8], par: [6, 8], trap: 0.1, tpl: 'L4', new: '桥：一个环被两个主环扣住' },
    { n: 5, hard: true, pieces: [9, 10], par: [8, 12], trap: 0.3, tpl: 'L5' },
    { n: 6, pieces: [9, 10], par: [7, 10], trap: 0.1, tpl: 'L6' },
    { n: 7, pieces: [9, 10], par: [7, 10], trap: 0.15, tpl: 'L7' },
    { n: 8, pieces: [10, 11], par: [8, 11], trap: 0.15, tpl: 'L8', new: '多个闭合底座' },
    { n: 9, pieces: [10, 11], par: [8, 11], trap: 0.15, tpl: 'L9', new: '直杆：沿自身方向推拉' },
    { n: 10, hard: true, pieces: [10, 12], par: [8, 14], trap: 0.3, grow: G({ knobs: 0.4, bars: [1, 2], bridges: [1, 2] }) },
    { n: 11, pieces: [9, 11], par: [7, 11], trap: 0.15, grow: G({ knobs: 0.25, bars: [0, 1] }) },
    { n: 12, pieces: [10, 11], par: [8, 12], trap: 0.2, grow: G({ bars: [1, 2] }) },
    { n: 13, pieces: [11, 12], par: [8, 13], trap: 0.2, tpl: 'BIG', new: '大环里套着零件' },
    { n: 14, pieces: [11, 12], par: [9, 13], trap: 0.25, grow: G({ bars: [1, 2], bridges: [1, 2] }) },
    { n: 15, hard: true, pieces: [11, 13], par: [10, 15], trap: 0.35, grow: G({ knobs: 0.45, bars: [0, 2], bridges: [1, 2] }) },
    { n: 16, pieces: [10, 12], par: [8, 12], trap: 0.2, grow: G({ hubs: [2, 3], knobs: 0.25 }) },
    { n: 17, pieces: [11, 12], par: [9, 13], trap: 0.25, grow: G({ knobs: 0.35, bars: [1, 2] }) },
    { n: 18, pieces: [11, 13], par: [9, 14], trap: 0.25, grow: G({ hubs: [2, 3], bridges: [1, 2] }) },
    { n: 19, pieces: [12, 13], par: [10, 15], trap: 0.3, grow: G({ knobs: 0.4, bars: [1, 2], bridges: [1, 2] }) },
    { n: 20, hard: true, pieces: [12, 14], par: [11, 17], trap: 0.4, grow: G({ hubs: [2, 3], knobs: 0.45, bars: [1, 2], bridges: [2, 3] }) },
    // ---- 第 2 章 NEON CITY（21-40）：组合机制，零件数慢慢涨到 17 ----
    { n: 21, pieces: [11, 13], par: [9, 14], trap: 0.25, grow: G({ knobs: 0.3, bars: [0, 1] }) },
    { n: 22, pieces: [12, 13], par: [10, 15], trap: 0.25, grow: G({ bars: [1, 2], bridges: [1, 2] }) },
    { n: 23, pieces: [12, 14], par: [10, 15], trap: 0.3, grow: G({ hubs: [2, 3], knobs: 0.4 }) },
    { n: 24, pieces: [12, 14], par: [10, 16], trap: 0.3, grow: G({ knobs: 0.35, bars: [1, 3], bridges: [1, 2] }) },
    { n: 25, hard: true, pieces: [13, 15], par: [11, 18], trap: 0.4, grow: G({ hubs: [2, 3], knobs: 0.5, bars: [1, 2], bridges: [2, 3] }) },
    { n: 26, pieces: [12, 14], par: [10, 15], trap: 0.25, grow: G({ knobs: 0.3, bars: [1, 2] }) },
    { n: 27, pieces: [13, 14], par: [11, 16], trap: 0.3, grow: G({ hubs: [2, 3], bridges: [2, 3] }) },
    { n: 28, pieces: [13, 15], par: [11, 17], trap: 0.3, grow: G({ knobs: 0.4, bars: [2, 3] }) },
    { n: 29, pieces: [13, 15], par: [11, 17], trap: 0.35, grow: G({ knobs: 0.45, bars: [1, 2], bridges: [2, 3] }) },
    { n: 30, hard: true, pieces: [14, 16], par: [12, 19], trap: 0.4, grow: G({ hubs: [2, 3], knobs: 0.5, bars: [1, 3], bridges: [2, 3] }) },
    { n: 31, pieces: [13, 14], par: [11, 16], trap: 0.25, grow: G({ knobs: 0.3, bars: [1, 2] }) },
    { n: 32, pieces: [13, 15], par: [11, 17], trap: 0.3, grow: G({ hubs: [2, 3], bridges: [2, 3] }) },
    { n: 33, pieces: [14, 15], par: [12, 18], trap: 0.3, grow: G({ knobs: 0.4, bars: [2, 3] }) },
    { n: 34, pieces: [14, 16], par: [12, 18], trap: 0.35, grow: G({ knobs: 0.45, bars: [1, 2], bridges: [2, 3] }) },
    { n: 35, hard: true, pieces: [14, 16], par: [13, 20], trap: 0.45, grow: G({ hubs: [2, 3], knobs: 0.5, bars: [1, 3], bridges: [2, 4] }) },
    { n: 36, pieces: [13, 15], par: [11, 17], trap: 0.3, grow: G({ knobs: 0.35, bars: [1, 2] }) },
    { n: 37, pieces: [14, 16], par: [12, 18], trap: 0.35, grow: G({ hubs: [2, 3], knobs: 0.4, bridges: [2, 3] }) },
    { n: 38, pieces: [14, 16], par: [12, 19], trap: 0.35, grow: G({ knobs: 0.45, bars: [2, 3], bridges: [1, 2] }) },
    { n: 39, pieces: [15, 16], par: [13, 19], trap: 0.4, grow: G({ hubs: [2, 3], knobs: 0.45, bars: [1, 2], bridges: [2, 3] }) },
    { n: 40, hard: true, pieces: [15, 17], par: [14, 21], trap: 0.45, grow: G({ hubs: [2, 3], knobs: 0.5, bars: [2, 3], bridges: [2, 4] }) },
  ];
})(typeof window !== 'undefined' ? window : globalThis);
