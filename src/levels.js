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
      name: '海滨大道', en: 'OCEAN DRIVE', tip: '按住环拖动，把缺口转到夹套处，环就会滑脱',
      rings: [
        { id: 'a', x: -56, y: 0, r: 46, color: PINK, gap: { at: 0, w: 106 }, angle: 86 },
        { id: 'b', x: 54, y: 0, r: 46, color: VIOLET, gap: { at: 0, w: 107 }, angle: 334 },
      ],
      links: [['a', 'b']],
    },
    {
      name: '日落长链', en: 'SUNSET CHAIN', tip: '伸出杆子的环还扣着别人时转不动，先放开它扣住的环',
      rings: [
        { id: 'a', x: 0, y: -110, r: 44, color: CYAN, gap: { at: 0, w: 104 }, angle: 86 },
        { id: 'b', x: 0, y: -2, r: 46, color: YELLOW, gap: { at: 0, w: 106 }, angle: 201 },
        { id: 'c', x: 0, y: 106, r: 44, color: PINK, gap: { at: 0, w: 103 }, angle: 18 },
        { id: 'd', x: 100, y: -2, r: 38, color: VIOLET, gap: { at: 0, w: 100 }, angle: 24 },
      ],
      links: [['a', 'b'], ['b', 'c'], ['b', 'd']],
    },
    {
      name: '棕榈三角', en: 'PALM TRIANGLE', tip: '凸出的短杆会撞到别的东西，试试换个方向转',
      rings: [
        { id: 'h', x: 0, y: 10, r: 42, color: ORANGE, angle: 94 },
        { id: 'a', x: 0, y: -92, r: 42, color: RED, gap: { at: 0, w: 104 }, angle: 30, knobs: [{ at: 13, len: 20 }] },
        { id: 'b', x: 88, y: 61, r: 42, color: CYAN, gap: { at: 0, w: 107 }, angle: 171, knobs: [{ at: 99, len: 20 }] },
        { id: 'c', x: -88, y: 61, r: 42, color: YELLOW, gap: { at: 0, w: 106 }, angle: 93, knobs: [{ at: 204, len: 21 }] },
        { id: 'e', x: 0, y: -186, r: 36, color: PINK, gap: { at: 0, w: 103 }, angle: 289 },
      ],
      links: [['h', 'a'], ['h', 'b'], ['h', 'c'], ['a', 'e']],
    },
    {
      name: '霓虹大桥', en: 'NEON BRIDGE', tip: '想清楚先拆哪一个',
      rings: [
        { id: 'h', x: -40, y: -60, r: 40, color: LIME, angle: 92 },
        { id: 'a', x: -123, y: -108, r: 38, color: BLUE, gap: { at: 0, w: 100 }, angle: 260, knobs: [{ at: 173, len: 20 }] },
        { id: 'b', x: 35, y: -123, r: 40, color: ORANGE, gap: { at: 0, w: 102 }, angle: 93 },
        { id: 'c', x: -14, y: 39, r: 44, color: RED, gap: { at: 0, w: 101 }, angle: 191, knobs: [{ at: 143, len: 20 }] },
        { id: 'd', x: 85, y: 65, r: 40, color: CYAN, gap: { at: 0, w: 102 }, angle: 106, knobs: [{ at: 189, len: 21 }] },
        { id: 'e', x: -84, y: 109, r: 38, color: YELLOW, gap: { at: 0, w: 99 }, angle: 127 },
        { id: 'f', x: 102, y: 159, r: 38, color: PINK, gap: { at: 0, w: 96 }, angle: 20, knobs: [{ at: 35, len: 22 }] },
      ],
      links: [['h', 'a'], ['h', 'b'], ['h', 'c'], ['c', 'd'], ['c', 'e'], ['d', 'f']],
    },
    {
      name: '午夜霓虹', en: 'MIDNIGHT NEON', tip: '困难关：每一步的顺序都很关键', hard: true,
      rings: [
        { id: 'h', x: 0, y: -40, r: 40, color: VIOLET, angle: 96 },
        { id: 'a', x: 0, y: -138, r: 40, color: MINT, gap: { at: 0, w: 108 }, angle: 258, knobs: [{ at: 253, len: 20 }] },
        { id: 'b', x: 93, y: -65, r: 38, color: LIME, gap: { at: 0, w: 104 }, angle: 336, knobs: [{ at: 275, len: 21 }] },
        { id: 'c', x: -93, y: -65, r: 38, color: BLUE, gap: { at: 0, w: 96 }, angle: 105, knobs: [{ at: 321, len: 24 }] },
        { id: 'd', x: 0, y: 60, r: 42, color: ORANGE, gap: { at: 0, w: 105 }, angle: 336 },
        { id: 'e', x: 85, y: 109, r: 38, color: RED, gap: { at: 0, w: 99 }, angle: 264, knobs: [{ at: 201, len: 25 }] },
        { id: 'f', x: -85, y: 109, r: 38, color: CYAN, gap: { at: 0, w: 98 }, angle: 130, knobs: [{ at: 250, len: 22 }] },
        { id: 'g', x: 69, y: -196, r: 34, color: YELLOW, gap: { at: 0, w: 104 }, angle: 46 },
        { id: 'k', x: -175, y: -35, r: 34, color: PINK, gap: { at: 0, w: 98 }, angle: 178, knobs: [{ at: 184, len: 25 }] },
      ],
      links: [['h', 'a'], ['h', 'b'], ['h', 'c'], ['h', 'd'], ['d', 'e'], ['d', 'f'], ['a', 'g'], ['c', 'k']],
    },
  ];
})(typeof window !== 'undefined' ? window : globalThis);
