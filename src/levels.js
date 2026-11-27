/*
 * 关卡数据（原创布局）。由 tools/levelgen 生成并通过验收（docs/level-rules.md），
 * 用 node tools/levelgen/cli.js apply 写回这里；手改后要重新跑 node tools/levelgen/cli.js check。
 * 坐标为逻辑像素，原点在棋盘中心，y 轴向下；角度单位为度，0° 指向右，顺时针为正。
 * gap: 缺口（相对环自身的朝向和宽度），没有 gap 的是闭合环。angle: 初始转角。
 * knobs: 环身上凸出的短杆，转动时会撞到别的东西。type: 'bar' 是直杆（dir 方向、len 长度）。
 * links: [主环, 被扣环]，主环伸出杆子，夹套套在被扣环的管子上。
 */
(function (root) {
  'use strict';
  const PINK = '#ff3df2', CYAN = '#28e7ff', ORANGE = '#ffad42', LIME = '#b6ff4a', VIOLET = '#a47bff',
    YELLOW = '#ffe45c', RED = '#ff4d6d', BLUE = '#4d8bff', MINT = '#3dffb0';

  root.RRLevels = [
    {
      name: "海滨大道", en: "OCEAN DRIVE", tip: "拖动没有伸出杆子的环，把缺口转到夹套处",
      rings: [
        { id: 'a', x: -56, y: 0, r: 46, color: CYAN, gap: { at: 0, w: 99 }, angle: 255 },
        { id: 'b', x: 54, y: 0, r: 46, color: ORANGE, gap: { at: 0, w: 107 }, angle: 333 },
      ],
      links: [['a', 'b']],
    },
    {
      name: "日落长链", en: "SUNSET CHAIN", tip: "还扣着别人的环转不动，先转开被它扣住的环",
      rings: [
        { id: 'a', x: 0, y: -110, r: 44, color: CYAN, gap: { at: 0, w: 99 }, angle: 213 },
        { id: 'b', x: 0, y: -2, r: 46, color: ORANGE, gap: { at: 0, w: 102 }, angle: 189 },
        { id: 'c', x: 0, y: 106, r: 44, color: VIOLET, gap: { at: 0, w: 97 }, angle: 87 },
        { id: 'd', x: 100, y: -2, r: 38, color: LIME, gap: { at: 0, w: 105 }, angle: 258 },
      ],
      links: [['a', 'b'], ['b', 'c'], ['b', 'd']],
    },
    {
      name: "棕榈三角", en: "PALM TRIANGLE", tip: "闭合环转不动；凸出的短杆会撞到别的东西",
      rings: [
        { id: 'h', x: 0, y: 10, r: 42, color: ORANGE, angle: 0 },
        { id: 'a', x: 0, y: -92, r: 42, color: CYAN, gap: { at: 0, w: 99 }, angle: 192, knobs: [{ at: 174, len: 25 }] },
        { id: 'b', x: 88, y: 61, r: 42, color: PINK, gap: { at: 0, w: 97 }, angle: 144, knobs: [{ at: 120, len: 22 }] },
        { id: 'c', x: -88, y: 61, r: 42, color: LIME, gap: { at: 0, w: 103 }, angle: 222, knobs: [{ at: 234, len: 23 }] },
        { id: 'e', x: 0, y: -186, r: 36, color: YELLOW, gap: { at: 0, w: 102 }, angle: 288 },
      ],
      links: [['h', 'a'], ['h', 'b'], ['h', 'c'], ['a', 'e']],
    },
    {
      name: "霓虹大桥", en: "NEON BRIDGE", tip: "中间的桥被两边扣住，想想先拆哪一边",
      rings: [
        { id: 'h1', x: -95, y: 0, r: 40, color: PINK, angle: 0 },
        { id: 'h2', x: 95, y: 0, r: 40, color: CYAN, angle: 0 },
        { id: 'm', x: 0, y: 0, r: 40, color: YELLOW, gap: { at: 0, w: 99 }, angle: 249 },
        { id: 'a', x: -143, y: -83, r: 38, color: LIME, gap: { at: 0, w: 106 }, angle: 303, knobs: [{ at: 207, len: 25 }] },
        { id: 'b', x: -143, y: 83, r: 38, color: ORANGE, gap: { at: 0, w: 104 }, angle: 96 },
        { id: 'c', x: 143, y: -83, r: 38, color: VIOLET, gap: { at: 0, w: 96 }, angle: 300, knobs: [{ at: 93, len: 25 }] },
        { id: 'd', x: 143, y: 83, r: 38, color: ORANGE, gap: { at: 0, w: 103 }, angle: 330 },
        { id: 'e', x: 189, y: 163, r: 36, color: LIME, gap: { at: 0, w: 104 }, angle: 339, knobs: [{ at: 99, len: 22 }] },
      ],
      links: [['h1', 'm'], ['h1', 'a'], ['h1', 'b'], ['h2', 'c'], ['h2', 'd'], ['d', 'e'], ['h2', 'm']],
    },
    {
      name: "午夜霓虹", en: "MIDNIGHT NEON", tip: "困难关：滑脱后留下的空夹套也会挡路", hard: true,
      rings: [
        { id: 'h', x: -40, y: -40, r: 40, color: BLUE, angle: 0 },
        { id: 'a', x: -40, y: -138, r: 40, color: CYAN, gap: { at: 0, w: 99 }, angle: 348, knobs: [{ at: 165, len: 21 }] },
        { id: 'b', x: -125, y: 9, r: 40, color: MINT, gap: { at: 0, w: 97 }, angle: 213, knobs: [{ at: 174, len: 24 }] },
        { id: 'm', x: 45, y: 9, r: 40, color: YELLOW, gap: { at: 0, w: 106 }, angle: 21 },
        { id: 'r', x: 96, y: -119, r: 40, color: MINT, gap: { at: 0, w: 107 }, angle: 9 },
        { id: 'n', x: 96, y: -213, r: 38, color: VIOLET, gap: { at: 0, w: 104 }, angle: 348, knobs: [{ at: 174, len: 21 }] },
        { id: 'g', x: -40, y: -232, r: 38, color: BLUE, gap: { at: 0, w: 106 }, angle: 339 },
        { id: 'k', x: -125, y: 103, r: 38, color: PINK, gap: { at: 0, w: 100 }, angle: 24, knobs: [{ at: 81, len: 21 }] },
        { id: 'd', x: 45, y: 107, r: 40, color: MINT, gap: { at: 0, w: 99 }, angle: 12, knobs: [{ at: 207, len: 24 }] },
        { id: 'e', x: -37, y: 154, r: 38, color: LIME, gap: { at: 0, w: 107 }, angle: 105, knobs: [{ at: 171, len: 25 }] },
      ],
      links: [['h', 'a'], ['h', 'b'], ['h', 'm'], ['r', 'n'], ['a', 'g'], ['b', 'k'], ['m', 'd'], ['d', 'e'], ['r', 'm']],
    },
    {
      name: "棕榈网格", en: "PALM GRID", tip: "环很多，从最外圈一个个拆",
      rings: [
        { id: 'h1', x: -69, y: -69, r: 40, color: LIME, angle: 0 },
        { id: 'h2', x: 69, y: -69, r: 40, color: MINT, angle: 0 },
        { id: 'x', x: 0, y: 0, r: 40, color: PINK, gap: { at: 0, w: 99 }, angle: 21 },
        { id: 'a', x: -69, y: -167, r: 40, color: CYAN, gap: { at: 0, w: 108 }, angle: 0 },
        { id: 'b', x: -154, y: -118, r: 40, color: VIOLET, gap: { at: 0, w: 101 }, angle: 177, knobs: [{ at: 114, len: 21 }] },
        { id: 'c', x: -154, y: -20, r: 40, color: YELLOW, gap: { at: 0, w: 97 }, angle: 162 },
        { id: 'e', x: 69, y: -167, r: 40, color: YELLOW, gap: { at: 0, w: 107 }, angle: 336 },
        { id: 'f', x: 154, y: -118, r: 40, color: VIOLET, gap: { at: 0, w: 101 }, angle: 231, knobs: [{ at: 183, len: 20 }] },
        { id: 'k', x: 0, y: 98, r: 40, color: RED, gap: { at: 0, w: 97 }, angle: 105, knobs: [{ at: 246, len: 20 }] },
        { id: 'c2', x: -154, y: 74, r: 38, color: LIME, gap: { at: 0, w: 105 }, angle: 135 },
      ],
      links: [['h1', 'x'], ['h1', 'a'], ['h1', 'b'], ['h1', 'c'], ['h2', 'e'], ['h2', 'f'], ['x', 'k'], ['c', 'c2'], ['h2', 'x']],
    },
    {
      name: "海湾大道", en: "BAYSIDE AVE", tip: "树枝末端的环先走，凸钉别撞上",
      rings: [
        { id: 'h', x: 0, y: -150, r: 40, color: LIME, angle: 0 },
        { id: 'a', x: -85, y: -199, r: 40, color: MINT, gap: { at: 0, w: 99 }, angle: 234, knobs: [{ at: 219, len: 24 }] },
        { id: 'b', x: 85, y: -199, r: 40, color: CYAN, gap: { at: 0, w: 105 }, angle: 57 },
        { id: 'c', x: 0, y: -52, r: 40, color: MINT, gap: { at: 0, w: 98 }, angle: 357 },
        { id: 'd', x: 49, y: 33, r: 40, color: CYAN, gap: { at: 0, w: 105 }, angle: 171, knobs: [{ at: 192, len: 22 }] },
        { id: 'e', x: -49, y: 33, r: 40, color: RED, gap: { at: 0, w: 106 }, angle: 174, knobs: [{ at: 222, len: 22 }] },
        { id: 'g', x: -49, y: 127, r: 38, color: YELLOW, gap: { at: 0, w: 103 }, angle: 183, knobs: [{ at: 141, len: 26 }] },
        { id: 'f', x: 49, y: 127, r: 38, color: ORANGE, gap: { at: 0, w: 104 }, angle: 123 },
        { id: 'a2', x: -166, y: -152, r: 38, color: PINK, gap: { at: 0, w: 106 }, angle: 159 },
        { id: 'b2', x: 85, y: -293, r: 38, color: VIOLET, gap: { at: 0, w: 105 }, angle: 225, knobs: [{ at: 90, len: 21 }] },
      ],
      links: [['h', 'a'], ['h', 'b'], ['h', 'c'], ['c', 'd'], ['c', 'e'], ['e', 'g'], ['d', 'f'], ['a', 'a2'], ['b', 'b2']],
    },
    {
      name: "霓虹高塔", en: "NEON TOWER", tip: "塔底是两个闭合环，先把塔顶拆掉",
      rings: [
        { id: 'h1', x: -150, y: 130, r: 40, color: VIOLET, angle: 0 },
        { id: 'h2', x: -50, y: 130, r: 40, color: YELLOW, angle: 0 },
        { id: 'x1', x: -100, y: 43, r: 42, color: PINK, gap: { at: 0, w: 99 }, angle: 231 },
        { id: 'x2', x: 21, y: 59, r: 42, color: ORANGE, gap: { at: 0, w: 98 }, angle: 228 },
        { id: 't', x: -49, y: -45, r: 42, color: BLUE, gap: { at: 0, w: 101 }, angle: 6 },
        { id: 'u', x: -49, y: -145, r: 40, color: LIME, gap: { at: 0, w: 97 }, angle: 9 },
        { id: 'w1', x: -2, y: -227, r: 38, color: PINK, gap: { at: 0, w: 104 }, angle: 270, knobs: [{ at: 78, len: 26 }] },
        { id: 'w2', x: -96, y: -227, r: 38, color: ORANGE, gap: { at: 0, w: 98 }, angle: 129, knobs: [{ at: 183, len: 21 }] },
        { id: 's1', x: -231, y: 83, r: 38, color: MINT, gap: { at: 0, w: 102 }, angle: 231, knobs: [{ at: 243, len: 25 }] },
        { id: 's2', x: 117, y: 59, r: 38, color: BLUE, gap: { at: 0, w: 108 }, angle: 285 },
      ],
      links: [['h1', 'x1'], ['h2', 'x2'], ['x1', 't'], ['t', 'u'], ['u', 'w1'], ['u', 'w2'], ['h1', 's1'], ['x2', 's2'], ['h2', 'x1']],
    },
    {
      name: "日落码头", en: "SUNSET PIER", tip: "新零件：直杆只能沿自己的方向推拉，滑出银色套筒就自由了",
      rings: [
        { id: 'h1', x: -90, y: -150, r: 40, color: PINK, angle: 0 },
        { id: 'h2', x: 90, y: -150, r: 40, color: VIOLET, angle: 0 },
        { id: 'm', x: 0, y: -150, r: 34, color: YELLOW, gap: { at: 0, w: 99 }, angle: 258 },
        { id: 'a', x: -175, y: -101, r: 40, color: CYAN, gap: { at: 0, w: 103 }, angle: 246, knobs: [{ at: 273, len: 20 }] },
        { id: 'b', x: -90, y: -52, r: 40, color: VIOLET, gap: { at: 0, w: 97 }, angle: 156 },
        { id: 'd', x: 90, y: -52, r: 40, color: RED, gap: { at: 0, w: 103 }, angle: 339 },
        { id: 'n', x: -90, y: 42, r: 38, color: RED, gap: { at: 0, w: 103 }, angle: 177, knobs: [{ at: 198, len: 23 }] },
        { id: 'p', x: -90, y: 134, r: 38, color: VIOLET, gap: { at: 0, w: 107 }, angle: 84 },
        { id: 'g', x: -175, y: -7, r: 38, color: BLUE, gap: { at: 0, w: 100 }, angle: 84 },
        { id: 'z1', type: 'bar', x: 104, y: -206, dir: 30, len: 91, color: RED },
        { id: 'z2', type: 'bar', x: 73, y: 4, dir: 180, len: 97, color: CYAN },
      ],
      links: [['h1', 'm'], ['h1', 'a'], ['h1', 'b'], ['h2', 'd'], ['b', 'n'], ['n', 'p'], ['a', 'g'], ['h2', 'm'], ['h2', 'z1'], ['d', 'z2']],
    },
    {
      name: "霓虹迷宫", en: "NEON MAZE", tip: "困难关：先看清谁挡着谁，再动手", hard: true,
      rings: [
        { id: 'h1', x: 84, y: -96, r: 38, color: ORANGE, angle: 0 },
        { id: 'a', x: 38, y: -176, r: 38, color: PINK, gap: { at: 0, w: 99 }, angle: 192 },
        { id: 'b', x: 130, y: -176, r: 38, color: BLUE, gap: { at: 0, w: 107 }, angle: 348 },
        { id: 'c', x: -8, y: -96, r: 38, color: YELLOW, gap: { at: 0, w: 100 }, angle: 279 },
        { id: 'd', x: 38, y: -17, r: 38, color: LIME, gap: { at: 0, w: 102 }, angle: 135 },
        { id: 'e', x: 130, y: -17, r: 38, color: RED, gap: { at: 0, w: 102 }, angle: 78, knobs: [{ at: 228, len: 23 }] },
        { id: 'f', x: 84, y: -256, r: 38, color: ORANGE, gap: { at: 0, w: 108 }, angle: 252 },
        { id: 'g', x: -54, y: -17, r: 38, color: VIOLET, gap: { at: 0, w: 96 }, angle: 78, knobs: [{ at: 156, len: 21 }] },
        { id: 'k', x: 84, y: 63, r: 38, color: ORANGE, gap: { at: 0, w: 101 }, angle: 168 },
        { id: 'm', x: -146, y: -17, r: 38, color: BLUE, gap: { at: 0, w: 100 }, angle: 264 },
        { id: 'z1', type: 'bar', x: -201, y: -13, dir: 270, len: 86, color: ORANGE },
        { id: 'z2', type: 'bar', x: 185, y: -8, dir: 90, len: 107, color: MINT },
      ],
      links: [['h1', 'd'], ['h1', 'e'], ['h1', 'b'], ['h1', 'c'], ['h1', 'a'], ['c', 'g'], ['d', 'k'], ['a', 'f'], ['g', 'm'], ['b', 'f'], ['m', 'z1'], ['e', 'z2']],
    },
  ];
})(typeof window !== 'undefined' ? window : globalThis);
