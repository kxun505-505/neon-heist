/*
 * 关卡数据。坐标为逻辑像素，原点在棋盘中心，y 轴向下，角度单位为度（0° 指向右，顺时针为正）。
 * gaps: 缺口中心角度和宽度（相对环自身）。angle: 初始转角。
 * lock: 钥匙环 id。fixed: 不能转。couples: [a, b, ratio] 反向联动。
 */
(function (root) {
  'use strict';
  const PINK = '#ff3df2', CYAN = '#28e7ff', ORANGE = '#ffad42', LIME = '#b6ff4a', VIOLET = '#9d7bff', CHROME = '#c9c3e6';

  root.RRLevels = [
    {
      name: '海滨大道', en: 'OCEAN DRIVE', tip: '按住环拖动旋转，把缺口转到两环相扣的位置',
      rings: [
        { id: 'a', x: -45, y: 0, r: 80, color: PINK, gaps: [{ at: 0, w: 40 }], angle: 180 },
        { id: 'b', x: 45, y: 0, r: 80, color: CYAN, gaps: [{ at: 0, w: 40 }], angle: 0 },
      ],
    },
    {
      name: '日落长链', en: 'SUNSET CHAIN', tip: '一个环要和所有相扣的环都解开才会脱出',
      rings: [
        { id: 'a', x: -110, y: 0, r: 70, color: ORANGE, gaps: [{ at: 0, w: 40 }], angle: 180 },
        { id: 'b', x: 0, y: 0, r: 70, color: PINK, gaps: [{ at: 0, w: 40 }], angle: 90 },
        { id: 'c', x: 110, y: 0, r: 70, color: CYAN, gaps: [{ at: 0, w: 40 }], angle: 0 },
      ],
    },
    {
      name: '棕榈三角', en: 'PALM TRIANGLE', tip: '带锁的环要等同色钥匙环脱出后才能转',
      rings: [
        { id: 'a', x: 0, y: -58, r: 75, color: ORANGE, gaps: [{ at: 0, w: 40 }], angle: 270 },
        { id: 'b', x: -50, y: 29, r: 75, color: PINK, gaps: [{ at: 0, w: 40 }], angle: 150 },
        { id: 'c', x: 50, y: 29, r: 75, color: CYAN, gaps: [{ at: 0, w: 40 }], angle: 30, lock: 'a' },
      ],
    },
    {
      name: '霓虹齿轮', en: 'NEON GEARS', tip: '用连杆相连的两个环会反向一起转',
      rings: [
        { id: 'a', x: -76, y: -76, r: 82, color: PINK, gaps: [{ at: 0, w: 40 }], angle: 200 },
        { id: 'b', x: 76, y: -76, r: 82, color: CYAN, gaps: [{ at: 0, w: 40 }], angle: 315, lock: 'd' },
        { id: 'c', x: 76, y: 76, r: 82, color: ORANGE, gaps: [{ at: 0, w: 40 }], angle: 45 },
        { id: 'd', x: -76, y: 76, r: 82, color: LIME, gaps: [{ at: 0, w: 40 }], angle: 135 },
      ],
      couples: [['a', 'c', 1]],
    },
    {
      name: '午夜霓虹', en: 'MIDNIGHT NEON', tip: '银色的环被螺栓固定，只能靠别的环的缺口解开',
      rings: [
        { id: 'f', x: 0, y: 0, r: 72, color: CHROME, fixed: true, gaps: [] },
        { id: 'a', x: 0, y: -95, r: 72, color: PINK, gaps: [{ at: 0, w: 40 }], angle: 270 },
        { id: 'b', x: 95, y: 0, r: 72, color: CYAN, gaps: [{ at: 0, w: 40 }], angle: 0, lock: 'd' },
        { id: 'c', x: 0, y: 95, r: 72, color: ORANGE, gaps: [{ at: 0, w: 40 }], angle: 90 },
        { id: 'd', x: -95, y: 0, r: 72, color: VIOLET, gaps: [{ at: 0, w: 40 }], angle: 180 },
      ],
    },
  ];
})(typeof window !== 'undefined' ? window : globalThis);
