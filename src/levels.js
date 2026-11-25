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
        { id: 'h', x: 0, y: -20, r: 40, color: VIOLET, angle: 0 },
        { id: 'a', x: 0, y: -118, r: 40, color: ORANGE, gap: { at: 0, w: 99 }, angle: 0, knobs: [{ at: 213, len: 22 }] },
        { id: 'b', x: -85, y: 29, r: 40, color: CYAN, gap: { at: 0, w: 97 }, angle: 258, knobs: [{ at: 210, len: 20 }] },
        { id: 'c', x: 85, y: 29, r: 40, color: PINK, gap: { at: 0, w: 98 }, angle: 279 },
        { id: 'm', x: 0, y: 78, r: 40, color: YELLOW, gap: { at: 0, w: 101 }, angle: 117 },
        { id: 'g', x: 0, y: -208, r: 34, color: LIME, gap: { at: 0, w: 98 }, angle: 351 },
        { id: 'k', x: -177, y: 29, r: 36, color: ORANGE, gap: { at: 0, w: 100 }, angle: 150, knobs: [{ at: 156, len: 24 }] },
        { id: 'd', x: 181, y: 29, r: 38, color: LIME, gap: { at: 0, w: 97 }, angle: 285, knobs: [{ at: 111, len: 21 }] },
        { id: 'e', x: 181, y: 119, r: 36, color: CYAN, gap: { at: 0, w: 98 }, angle: 138, knobs: [{ at: 186, len: 24 }] },
      ],
      links: [['h', 'a'], ['h', 'b'], ['h', 'c'], ['b', 'm'], ['a', 'g'], ['b', 'k'], ['c', 'd'], ['d', 'e'], ['c', 'm']],
    },
  ];
})(typeof window !== 'undefined' ? window : globalThis);
