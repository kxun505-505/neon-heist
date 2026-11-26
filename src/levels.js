/*
 * 关卡数据（原创布局，由 tools/gen.html 生成后挑选）。
 * 坐标为逻辑像素，原点在棋盘中心，y 轴向下；角度单位为度，0° 指向右，顺时针为正。
 * gap: 缺口（相对环自身的朝向和宽度），没有 gap 的是闭合环。angle: 初始转角。
 * knobs: 环身上凸出的短杆，转动时会撞到别的东西。
 * links: [主环, 被扣环]，主环伸出杆子，夹套套在被扣环的管子上。
 */
(function (root) {
  'use strict';
  const PINK = '#ff3df2', CYAN = '#28e7ff', ORANGE = '#ffad42', LIME = '#b6ff4a', VIOLET = '#a47bff',
    YELLOW = '#ffe45c', RED = '#ff4d6d', BLUE = '#4d8bff', MINT = '#3dffb0';

  root.RRLevels = [
    {
      name: '海滨大道', en: 'OCEAN DRIVE', tip: '拖动没有伸出杆子的环，把缺口转到夹套处',
      rings: [
        { id: 'a', x: -56, y: 0, r: 46, color: CYAN, gap: { at: 0, w: 99 }, angle: 255 },
        { id: 'b', x: 54, y: 0, r: 46, color: ORANGE, gap: { at: 0, w: 107 }, angle: 333 },
      ],
      links: [['a', 'b']],
    },
    {
      name: '日落长链', en: 'SUNSET CHAIN', tip: '还扣着别人的环转不动，先转开被它扣住的环',
      rings: [
        { id: 'a', x: 0, y: -110, r: 44, color: CYAN, gap: { at: 0, w: 99 }, angle: 213 },
        { id: 'b', x: 0, y: -2, r: 46, color: ORANGE, gap: { at: 0, w: 102 }, angle: 189 },
        { id: 'c', x: 0, y: 106, r: 44, color: VIOLET, gap: { at: 0, w: 97 }, angle: 87 },
        { id: 'd', x: 100, y: -2, r: 38, color: LIME, gap: { at: 0, w: 105 }, angle: 258 },
      ],
      links: [['a', 'b'], ['b', 'c'], ['b', 'd']],
    },
    {
      name: '棕榈三角', en: 'PALM TRIANGLE', tip: '闭合环转不动；凸出的短杆会撞到别的东西',
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
      name: '霓虹大桥', en: 'NEON BRIDGE', tip: '中间的桥被两边扣住，想想先拆哪一边',
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
      name: '午夜霓虹', en: 'MIDNIGHT NEON', tip: '困难关：滑脱后留下的空夹套也会挡路', hard: true,
      rings: [
        { id: 'h', x: -20, y: -20, r: 40, color: PINK, angle: 0 },
        { id: 'a', x: -20, y: -118, r: 40, color: CYAN, gap: { at: 0, w: 99 }, angle: 165, knobs: [{ at: 213, len: 23 }] },
        { id: 'b', x: -105, y: 29, r: 40, color: ORANGE, gap: { at: 0, w: 97 }, angle: 75, knobs: [{ at: 183, len: 25 }] },
        { id: 'm', x: 65, y: 29, r: 40, color: LIME, gap: { at: 0, w: 96 }, angle: 24 },
        { id: 'r', x: 150, y: -69, r: 40, color: VIOLET, gap: { at: 0, w: 99 }, angle: 42 },
        { id: 'n', x: 150, y: -159, r: 34, color: YELLOW, gap: { at: 0, w: 103 }, angle: 321, knobs: [{ at: 285, len: 21 }] },
        { id: 'g', x: -20, y: -208, r: 34, color: RED, gap: { at: 0, w: 106 }, angle: 207 },
        { id: 'k', x: -197, y: 29, r: 36, color: BLUE, gap: { at: 0, w: 104 }, angle: 189, knobs: [{ at: 84, len: 21 }] },
        { id: 'd', x: 65, y: 125, r: 38, color: MINT, gap: { at: 0, w: 97 }, angle: 36, knobs: [{ at: 180, len: 21 }] },
        { id: 'e', x: -11, y: 169, r: 34, color: PINK, gap: { at: 0, w: 103 }, angle: 123, knobs: [{ at: 147, len: 22 }] },
      ],
      links: [['h', 'a'], ['h', 'b'], ['h', 'm'], ['r', 'n'], ['a', 'g'], ['b', 'k'], ['m', 'd'], ['d', 'e'], ['r', 'm']],
    },
    {
      name: '棕榈网格', en: 'PALM GRID', tip: '环很多，从最外圈一个个拆',
      rings: [
        { id: 'h1', x: -75, y: -55, r: 38, color: PINK, angle: 0 },
        { id: 'h2', x: 75, y: 55, r: 38, color: CYAN, angle: 0 },
        { id: 'x', x: 0, y: 0, r: 38, color: ORANGE, gap: { at: 0, w: 99 }, angle: 138 },
        { id: 'a', x: -75, y: -149, r: 38, color: LIME, gap: { at: 0, w: 102 }, angle: 198 },
        { id: 'b', x: -169, y: -55, r: 38, color: VIOLET, gap: { at: 0, w: 97 }, angle: 150, knobs: [{ at: 120, len: 25 }] },
        { id: 'c', x: -122, y: 26, r: 38, color: YELLOW, gap: { at: 0, w: 96 }, angle: 153 },
        { id: 'd', x: 6, y: -102, r: 38, color: RED, gap: { at: 0, w: 99 }, angle: 225 },
        { id: 'e', x: 75, y: 149, r: 38, color: BLUE, gap: { at: 0, w: 103 }, angle: 342 },
        { id: 'f', x: 169, y: 55, r: 38, color: MINT, gap: { at: 0, w: 99 }, angle: 354, knobs: [{ at: 93, len: 25 }] },
        { id: 'g', x: 122, y: -26, r: 38, color: PINK, gap: { at: 0, w: 104 }, angle: 252 },
        { id: 'k', x: -6, y: 102, r: 38, color: LIME, gap: { at: 0, w: 99 }, angle: 60 },
        { id: 'a2', x: -75, y: -237, r: 34, color: ORANGE, gap: { at: 0, w: 97 }, angle: 198 },
        { id: 'e2', x: 75, y: 237, r: 34, color: LIME, gap: { at: 0, w: 98 }, angle: 162 },
      ],
      links: [['h1', 'x'], ['h1', 'a'], ['h1', 'b'], ['h1', 'c'], ['h1', 'd'], ['h2', 'e'], ['h2', 'f'], ['h2', 'g'], ['h2', 'k'], ['a', 'a2'], ['e', 'e2'], ['h2', 'x']],
    },
    {
      name: '海湾大道', en: 'BAYSIDE AVE', tip: '树枝末端的环先走，凸钉别撞上',
      rings: [
        { id: 'h', x: 0, y: -60, r: 40, color: PINK, angle: 0 },
        { id: 'a', x: -83, y: -108, r: 38, color: CYAN, gap: { at: 0, w: 99 }, angle: 141, knobs: [{ at: 177, len: 21 }] },
        { id: 'b', x: 83, y: -108, r: 38, color: ORANGE, gap: { at: 0, w: 105 }, angle: 48 },
        { id: 'c', x: 0, y: 38, r: 40, color: LIME, gap: { at: 0, w: 98 }, angle: 204 },
        { id: 'd', x: 68, y: 106, r: 38, color: VIOLET, gap: { at: 0, w: 102 }, angle: 309, knobs: [{ at: 156, len: 24 }] },
        { id: 'e', x: -68, y: 106, r: 38, color: YELLOW, gap: { at: 0, w: 103 }, angle: 228, knobs: [{ at: 174, len: 23 }] },
        { id: 'f', x: 130, y: 168, r: 34, color: RED, gap: { at: 0, w: 96 }, angle: 81 },
        { id: 'g', x: -130, y: 168, r: 34, color: BLUE, gap: { at: 0, w: 108 }, angle: 117, knobs: [{ at: 138, len: 25 }] },
        { id: 'a2', x: -159, y: -152, r: 34, color: MINT, gap: { at: 0, w: 105 }, angle: 186 },
        { id: 'b2', x: 159, y: -152, r: 34, color: PINK, gap: { at: 0, w: 99 }, angle: 33, knobs: [{ at: 192, len: 21 }] },
      ],
      links: [['h', 'a'], ['h', 'b'], ['h', 'c'], ['c', 'd'], ['c', 'e'], ['d', 'f'], ['e', 'g'], ['a', 'a2'], ['b', 'b2']],
    },
    {
      name: '霓虹高塔', en: 'NEON TOWER', tip: '塔底是三个闭合环，先把塔顶拆掉',
      rings: [
        { id: 'h1', x: -120, y: 90, r: 36, color: PINK, angle: 0 },
        { id: 'h2', x: 0, y: 90, r: 36, color: CYAN, angle: 0 },
        { id: 'h3', x: 120, y: 90, r: 36, color: ORANGE, angle: 0 },
        { id: 'x1', x: -60, y: 10, r: 44, color: LIME, gap: { at: 0, w: 99 }, angle: 213 },
        { id: 'x2', x: 60, y: 10, r: 44, color: VIOLET, gap: { at: 0, w: 98 }, angle: 309 },
        { id: 't', x: 0, y: -80, r: 44, color: YELLOW, gap: { at: 0, w: 105 }, angle: 9 },
        { id: 'u', x: 0, y: -180, r: 38, color: RED, gap: { at: 0, w: 98 }, angle: 24 },
        { id: 'w1', x: 62, y: -242, r: 34, color: BLUE, gap: { at: 0, w: 102 }, angle: 288, knobs: [{ at: 84, len: 24 }] },
        { id: 'w2', x: -62, y: -242, r: 34, color: MINT, gap: { at: 0, w: 103 }, angle: 291, knobs: [{ at: 222, len: 23 }] },
        { id: 's1', x: -166, y: 170, r: 38, color: CYAN, gap: { at: 0, w: 96 }, angle: 84, knobs: [{ at: 117, len: 26 }] },
        { id: 's2', x: 0, y: 182, r: 38, color: ORANGE, gap: { at: 0, w: 107 }, angle: 150 },
        { id: 's3', x: 166, y: 170, r: 38, color: LIME, gap: { at: 0, w: 105 }, angle: 87, knobs: [{ at: 90, len: 21 }] },
      ],
      links: [['h1', 'x1'], ['h3', 'x2'], ['x1', 't'], ['t', 'u'], ['u', 'w1'], ['u', 'w2'], ['h1', 's1'], ['h2', 's2'], ['h3', 's3'], ['h2', 'x1'], ['h2', 'x2']],
    },
    {
      name: '日落码头', en: 'SUNSET PIER', tip: '新零件：直杆只能沿自己的方向推拉，滑出银色套筒就自由了',
      rings: [
        { id: 'h1', x: -80, y: -110, r: 38, color: PINK, angle: 0 },
        { id: 'h2', x: 90, y: -120, r: 38, color: CYAN, angle: 0 },
        { id: 'm', x: 5, y: -115, r: 31, color: ORANGE, gap: { at: 0, w: 99 }, angle: 99 },
        { id: 'a', x: -161, y: -63, r: 38, color: LIME, gap: { at: 0, w: 102 }, angle: 234, knobs: [{ at: 276, len: 20 }] },
        { id: 'b', x: -80, y: -16, r: 38, color: VIOLET, gap: { at: 0, w: 105 }, angle: 141 },
        { id: 'c', x: 171, y: -73, r: 38, color: YELLOW, gap: { at: 0, w: 96 }, angle: 315, knobs: [{ at: 75, len: 22 }] },
        { id: 'd', x: 90, y: -26, r: 38, color: RED, gap: { at: 0, w: 103 }, angle: 192 },
        { id: 'n', x: 5, y: -21, r: 31, color: BLUE, gap: { at: 0, w: 99 }, angle: 357 },
        { id: 'g', x: -161, y: 25, r: 34, color: MINT, gap: { at: 0, w: 106 }, angle: 72, knobs: [{ at: 111, len: 24 }] },
        { id: 'k', x: 171, y: 15, r: 34, color: PINK, gap: { at: 0, w: 99 }, angle: 24, knobs: [{ at: 96, len: 20 }] },
        { id: 'p', x: 5, y: 64, r: 38, color: CYAN, gap: { at: 0, w: 98 }, angle: 201, knobs: [{ at: 150, len: 23 }] },
        { id: 'z1', type: 'bar', x: 127, y: -161, dir: 30, len: 86, color: LIME },
        { id: 'z2', type: 'bar', x: 27, y: 118, dir: 180, len: 107, color: LIME },
      ],
      links: [['h1', 'm'], ['h1', 'a'], ['h1', 'b'], ['h2', 'c'], ['h2', 'd'], ['b', 'n'], ['a', 'g'], ['c', 'k'], ['n', 'p'], ['h2', 'm'], ['h2', 'z1'], ['p', 'z2']],
    },
    {
      name: '巨环终章', en: 'GRAND LOOP', tip: '困难关：大环里的直杆只能从大环的缺口滑出去', hard: true,
      rings: [
        { id: 'B', x: 0, y: 0, r: 100, color: PINK, gap: { at: 0, w: 99 }, angle: 66, knobs: [{ at: 270, len: 22 }] },
        { id: 'i1', x: -45, y: -26, r: 30, color: CYAN, gap: { at: 0, w: 105 }, angle: 318 },
        { id: 'o1', x: 0, y: -152, r: 34, color: ORANGE, gap: { at: 0, w: 106 }, angle: 201 },
        { id: 'o2', x: -154, y: 0, r: 36, color: LIME, gap: { at: 0, w: 103 }, angle: 69, knobs: [{ at: 147, len: 23 }] },
        { id: 'o3', x: 154, y: 0, r: 36, color: VIOLET, gap: { at: 0, w: 101 }, angle: 288, knobs: [{ at: 177, len: 25 }] },
        { id: 'p2', x: -213, y: 59, r: 32, color: YELLOW, gap: { at: 0, w: 107 }, angle: 120, knobs: [{ at: 261, len: 25 }] },
        { id: 'p3', x: 213, y: 59, r: 32, color: RED, gap: { at: 0, w: 97 }, angle: 9 },
        { id: 'q', x: 0, y: -234, r: 32, color: BLUE, gap: { at: 0, w: 105 }, angle: 318, knobs: [{ at: 267, len: 26 }] },
        { id: 'z1', type: 'bar', x: -27, y: 17, dir: 150, len: 60, color: MINT },
        { id: 'z2', type: 'bar', x: 50, y: -176, dir: 90, len: 93, color: CYAN },
      ],
      links: [['i1', 'B'], ['o1', 'B'], ['o2', 'B'], ['o3', 'B'], ['o2', 'p2'], ['o3', 'p3'], ['o1', 'q'], ['i1', 'z1'], ['o1', 'z2']],
    },
  ];
})(typeof window !== 'undefined' ? window : globalThis);
