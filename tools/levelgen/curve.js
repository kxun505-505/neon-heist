/*
 * 1-100 关的难度曲线（生成器和验收共用）。依据见 docs/original-analysis.md，规则见 docs/level-rules.md。
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
 * 第 41 关以后：零件数封顶 17，不再加新机制。每 5 关一组锯齿：困难关后面那关是缓冲关（零件少 1-2），
 * 组内逐关略升；4 种结构主题（knob 凸钉多 / bar 直杆多 / bridge 桥多 / mix 混合）轮换，三角和方格网格交替，
 * 相邻关卡长得不一样。依据见 docs/original-analysis.md（原作第 20 关以后同样是高位平台加锯齿）。
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
    // ---- 第 3 章（41-60）：组合机制，零件 11-16，第一步陷阱逐步加重 ----
    { n: 41, pieces: [11, 12], par: [8, 15], trap: 0.2, grow: G({ hubs: [2, 3], knobs: 0.4, bars: [1, 2], bridges: [1, 2], lattice: 'sq' }) }, // mix（困难关后的缓冲关）
    { n: 42, pieces: [12, 14], par: [9, 17], trap: 0.25, grow: G({ hubs: [1, 2], knobs: 0.5, bars: [0, 1], bridges: [0, 1], lattice: 'tri' }) }, // knob
    { n: 43, pieces: [13, 15], par: [10, 18], trap: 0.3, grow: G({ hubs: [1, 2], knobs: 0.25, bars: [2, 3], bridges: [0, 1], lattice: 'sq' }) }, // bar
    { n: 44, pieces: [13, 15], par: [10, 18], trap: 0.3, grow: G({ hubs: [2, 3], knobs: 0.3, bars: [0, 1], bridges: [2, 3], lattice: 'tri' }) }, // bridge
    { n: 45, hard: true, pieces: [14, 15], par: [12, 19], trap: 0.4, grow: G({ hubs: [2, 3], knobs: 0.5, bars: [2, 3], bridges: [2, 3], lattice: 'sq' }) },
    { n: 46, pieces: [12, 13], par: [9, 16], trap: 0.2, grow: G({ hubs: [1, 2], knobs: 0.5, bars: [0, 1], bridges: [0, 1], lattice: 'sq' }) }, // knob（困难关后的缓冲关）
    { n: 47, pieces: [13, 15], par: [10, 18], trap: 0.25, grow: G({ hubs: [1, 2], knobs: 0.25, bars: [2, 3], bridges: [0, 1], lattice: 'tri' }) }, // bar
    { n: 48, pieces: [14, 16], par: [11, 19], trap: 0.3, grow: G({ hubs: [2, 3], knobs: 0.3, bars: [0, 1], bridges: [2, 3], lattice: 'sq' }) }, // bridge
    { n: 49, pieces: [14, 16], par: [11, 19], trap: 0.3, grow: G({ hubs: [2, 3], knobs: 0.4, bars: [1, 2], bridges: [1, 2], lattice: 'tri' }) }, // mix
    { n: 50, hard: true, pieces: [14, 16], par: [12, 20], trap: 0.4, grow: G({ hubs: [2, 3], knobs: 0.5, bars: [1, 2], bridges: [2, 3], lattice: 'sq' }) },
    { n: 51, pieces: [12, 13], par: [9, 16], trap: 0.2, grow: G({ hubs: [1, 2], knobs: 0.25, bars: [2, 3], bridges: [0, 1], lattice: 'sq' }) }, // bar（困难关后的缓冲关）
    { n: 52, pieces: [13, 15], par: [10, 18], trap: 0.25, grow: G({ hubs: [2, 3], knobs: 0.3, bars: [0, 1], bridges: [2, 3], lattice: 'tri' }) }, // bridge
    { n: 53, pieces: [14, 16], par: [11, 19], trap: 0.3, grow: G({ hubs: [2, 3], knobs: 0.4, bars: [1, 2], bridges: [1, 2], lattice: 'sq' }) }, // mix
    { n: 54, pieces: [14, 16], par: [11, 19], trap: 0.3, grow: G({ hubs: [1, 2], knobs: 0.5, bars: [0, 1], bridges: [0, 1], lattice: 'tri' }) }, // knob
    { n: 55, hard: true, pieces: [15, 16], par: [13, 20], trap: 0.4, grow: G({ hubs: [2, 3], knobs: 0.45, bars: [2, 3], bridges: [1, 2], lattice: 'sq' }) },
    { n: 56, pieces: [13, 14], par: [10, 17], trap: 0.2, grow: G({ hubs: [2, 3], knobs: 0.3, bars: [0, 1], bridges: [2, 3], lattice: 'sq' }) }, // bridge（困难关后的缓冲关）
    { n: 57, pieces: [14, 16], par: [11, 19], trap: 0.25, grow: G({ hubs: [2, 3], knobs: 0.4, bars: [1, 2], bridges: [1, 2], lattice: 'tri' }) }, // mix
    { n: 58, pieces: [15, 17], par: [12, 20], trap: 0.3, grow: G({ hubs: [1, 2], knobs: 0.5, bars: [0, 1], bridges: [0, 1], lattice: 'sq' }) }, // knob
    { n: 59, pieces: [15, 17], par: [12, 20], trap: 0.3, grow: G({ hubs: [1, 2], knobs: 0.25, bars: [2, 3], bridges: [0, 1], lattice: 'tri' }) }, // bar
    { n: 60, hard: true, pieces: [15, 17], par: [13, 21], trap: 0.4, grow: G({ hubs: [2, 3], knobs: 0.55, bars: [1, 2], bridges: [2, 4], lattice: 'sq' }) },
    // ---- 第 4 章（61-80）：零件 12-17，陷阱 ≥ 0.25 ----
    { n: 61, pieces: [12, 13], par: [9, 16], trap: 0.25, grow: G({ hubs: [1, 2], knobs: 0.5, bars: [0, 1], bridges: [0, 1], lattice: 'sq' }) }, // knob（困难关后的缓冲关）
    { n: 62, pieces: [13, 15], par: [10, 18], trap: 0.3, grow: G({ hubs: [1, 2], knobs: 0.25, bars: [2, 3], bridges: [0, 1], lattice: 'tri' }) }, // bar
    { n: 63, pieces: [14, 16], par: [11, 19], trap: 0.3, grow: G({ hubs: [2, 3], knobs: 0.3, bars: [0, 1], bridges: [2, 3], lattice: 'sq' }) }, // bridge
    { n: 64, pieces: [14, 16], par: [11, 19], trap: 0.35, grow: G({ hubs: [2, 3], knobs: 0.4, bars: [1, 2], bridges: [1, 2], lattice: 'tri' }) }, // mix
    { n: 65, hard: true, pieces: [14, 16], par: [12, 20], trap: 0.45, grow: G({ hubs: [2, 3], knobs: 0.5, bars: [1, 2], bridges: [2, 3], lattice: 'sq' }) },
    { n: 66, pieces: [12, 13], par: [9, 16], trap: 0.25, grow: G({ hubs: [1, 2], knobs: 0.25, bars: [2, 3], bridges: [0, 1], lattice: 'sq' }) }, // bar（困难关后的缓冲关）
    { n: 67, pieces: [13, 15], par: [10, 18], trap: 0.3, grow: G({ hubs: [2, 3], knobs: 0.3, bars: [0, 1], bridges: [2, 3], lattice: 'tri' }) }, // bridge
    { n: 68, pieces: [14, 16], par: [11, 19], trap: 0.3, grow: G({ hubs: [2, 3], knobs: 0.4, bars: [1, 2], bridges: [1, 2], lattice: 'sq' }) }, // mix
    { n: 69, pieces: [14, 16], par: [11, 19], trap: 0.35, grow: G({ hubs: [1, 2], knobs: 0.5, bars: [0, 1], bridges: [0, 1], lattice: 'tri' }) }, // knob
    { n: 70, hard: true, pieces: [15, 16], par: [13, 20], trap: 0.45, grow: G({ hubs: [2, 3], knobs: 0.45, bars: [2, 3], bridges: [1, 2], lattice: 'sq' }) },
    { n: 71, pieces: [13, 14], par: [10, 17], trap: 0.25, grow: G({ hubs: [2, 3], knobs: 0.3, bars: [0, 1], bridges: [2, 3], lattice: 'sq' }) }, // bridge（困难关后的缓冲关）
    { n: 72, pieces: [14, 16], par: [11, 19], trap: 0.3, grow: G({ hubs: [2, 3], knobs: 0.4, bars: [1, 2], bridges: [1, 2], lattice: 'tri' }) }, // mix
    { n: 73, pieces: [15, 17], par: [12, 20], trap: 0.3, grow: G({ hubs: [1, 2], knobs: 0.5, bars: [0, 1], bridges: [0, 1], lattice: 'sq' }) }, // knob
    { n: 74, pieces: [15, 17], par: [12, 20], trap: 0.35, grow: G({ hubs: [1, 2], knobs: 0.25, bars: [2, 3], bridges: [0, 1], lattice: 'tri' }) }, // bar
    { n: 75, hard: true, pieces: [15, 17], par: [13, 21], trap: 0.45, grow: G({ hubs: [2, 3], knobs: 0.55, bars: [1, 2], bridges: [2, 4], lattice: 'sq' }) },
    { n: 76, pieces: [13, 14], par: [10, 17], trap: 0.25, grow: G({ hubs: [2, 3], knobs: 0.4, bars: [1, 2], bridges: [1, 2], lattice: 'sq' }) }, // mix（困难关后的缓冲关）
    { n: 77, pieces: [14, 16], par: [11, 19], trap: 0.3, grow: G({ hubs: [1, 2], knobs: 0.5, bars: [0, 1], bridges: [0, 1], lattice: 'tri' }) }, // knob
    { n: 78, pieces: [15, 17], par: [12, 20], trap: 0.3, grow: G({ hubs: [1, 2], knobs: 0.25, bars: [2, 3], bridges: [0, 1], lattice: 'sq' }) }, // bar
    { n: 79, pieces: [15, 17], par: [12, 20], trap: 0.35, grow: G({ hubs: [2, 3], knobs: 0.3, bars: [0, 1], bridges: [2, 3], lattice: 'tri' }) }, // bridge
    { n: 80, hard: true, pieces: [15, 17], par: [13, 21], trap: 0.45, grow: G({ hubs: [2, 3], knobs: 0.5, bars: [2, 3], bridges: [2, 3], lattice: 'sq' }) },
    // ---- 第 5 章（81-100）：零件 12-17，陷阱 ≥ 0.25，困难关 15-17 个零件 ----
    { n: 81, pieces: [12, 13], par: [9, 16], trap: 0.25, grow: G({ hubs: [1, 2], knobs: 0.25, bars: [2, 3], bridges: [0, 1], lattice: 'sq' }) }, // bar（困难关后的缓冲关）
    { n: 82, pieces: [13, 15], par: [10, 18], trap: 0.3, grow: G({ hubs: [2, 3], knobs: 0.3, bars: [0, 1], bridges: [2, 3], lattice: 'tri' }) }, // bridge
    { n: 83, pieces: [14, 16], par: [11, 19], trap: 0.35, grow: G({ hubs: [2, 3], knobs: 0.4, bars: [1, 2], bridges: [1, 2], lattice: 'sq' }) }, // mix
    { n: 84, pieces: [14, 16], par: [11, 19], trap: 0.35, grow: G({ hubs: [1, 2], knobs: 0.5, bars: [0, 1], bridges: [0, 1], lattice: 'tri' }) }, // knob
    { n: 85, hard: true, pieces: [15, 16], par: [13, 20], trap: 0.45, grow: G({ hubs: [2, 3], knobs: 0.45, bars: [2, 3], bridges: [1, 2], lattice: 'sq' }) },
    { n: 86, pieces: [13, 14], par: [10, 17], trap: 0.25, grow: G({ hubs: [2, 3], knobs: 0.3, bars: [0, 1], bridges: [2, 3], lattice: 'sq' }) }, // bridge（困难关后的缓冲关）
    { n: 87, pieces: [14, 16], par: [11, 19], trap: 0.3, grow: G({ hubs: [2, 3], knobs: 0.4, bars: [1, 2], bridges: [1, 2], lattice: 'tri' }) }, // mix
    { n: 88, pieces: [15, 17], par: [12, 20], trap: 0.35, grow: G({ hubs: [1, 2], knobs: 0.5, bars: [0, 1], bridges: [0, 1], lattice: 'sq' }) }, // knob
    { n: 89, pieces: [15, 17], par: [12, 20], trap: 0.35, grow: G({ hubs: [1, 2], knobs: 0.25, bars: [2, 3], bridges: [0, 1], lattice: 'tri' }) }, // bar
    { n: 90, hard: true, pieces: [15, 17], par: [13, 21], trap: 0.45, grow: G({ hubs: [2, 3], knobs: 0.55, bars: [1, 2], bridges: [2, 4], lattice: 'sq' }) },
    { n: 91, pieces: [13, 14], par: [10, 17], trap: 0.25, grow: G({ hubs: [2, 3], knobs: 0.4, bars: [1, 2], bridges: [1, 2], lattice: 'sq' }) }, // mix（困难关后的缓冲关）
    { n: 92, pieces: [14, 16], par: [11, 19], trap: 0.3, grow: G({ hubs: [1, 2], knobs: 0.5, bars: [0, 1], bridges: [0, 1], lattice: 'tri' }) }, // knob
    { n: 93, pieces: [15, 17], par: [12, 20], trap: 0.35, grow: G({ hubs: [1, 2], knobs: 0.25, bars: [2, 3], bridges: [0, 1], lattice: 'sq' }) }, // bar
    { n: 94, pieces: [15, 17], par: [12, 20], trap: 0.35, grow: G({ hubs: [2, 3], knobs: 0.3, bars: [0, 1], bridges: [2, 3], lattice: 'tri' }) }, // bridge
    { n: 95, hard: true, pieces: [15, 17], par: [13, 21], trap: 0.45, grow: G({ hubs: [2, 3], knobs: 0.5, bars: [2, 3], bridges: [2, 3], lattice: 'sq' }) },
    { n: 96, pieces: [14, 15], par: [11, 18], trap: 0.25, grow: G({ hubs: [1, 2], knobs: 0.5, bars: [0, 1], bridges: [0, 1], lattice: 'sq' }) }, // knob（困难关后的缓冲关）
    { n: 97, pieces: [15, 17], par: [12, 20], trap: 0.3, grow: G({ hubs: [1, 2], knobs: 0.25, bars: [2, 3], bridges: [0, 1], lattice: 'tri' }) }, // bar
    { n: 98, pieces: [16, 17], par: [13, 20], trap: 0.35, grow: G({ hubs: [2, 3], knobs: 0.3, bars: [0, 1], bridges: [2, 3], lattice: 'sq' }) }, // bridge
    { n: 99, pieces: [16, 17], par: [13, 20], trap: 0.35, grow: G({ hubs: [2, 3], knobs: 0.4, bars: [1, 2], bridges: [1, 2], lattice: 'tri' }) }, // mix
    { n: 100, hard: true, pieces: [16, 17], par: [14, 21], trap: 0.45, grow: G({ hubs: [2, 3], knobs: 0.5, bars: [1, 2], bridges: [2, 3], lattice: 'sq' }) },
  ];
})(typeof window !== 'undefined' ? window : globalThis);
