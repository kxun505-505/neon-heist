# NEON HEIST · Ring Puzzle（试玩版）
原名 NEON LOOPS，2026-11 改名。

> 接手开发：先读 `AGENTS.md`，再读 `docs/DEVLOG.md`。
圆环解扣类解谜的网页试玩，目前 40 关（2 章），日落海岸霓虹画风。玩法对标 Rotate Rings（`com.nebula.rotaterings`），美术、音效、关卡全部原创。

## 运行
- 线上：GitHub Pages（见仓库 About 链接）。iPhone 用 Safari 打开后“添加到主屏幕”可全屏玩。
- 本地：直接双击 `index.html`，或 `python3 -m http.server 8000`。
- URL 参数：`?unlock` 解锁全部关卡，`?level=3` 直接进入第 3 关。

## 玩法（对照原作实机视频整理）
- 环是带缺口的 C 形管，或闭合环。主环伸出一根杆，杆端的夹套套在被扣环的管子上。
- 拖动被扣环，管子在夹套里滑动；缺口转到夹套处，夹套就松开，转走又会扣回去。一个零件的连接全部松开时它飞走，可能连锁。
- 主环还扣着别的环时转不动。凸钉和滑脱后留下的空夹套会撞到别的东西。
- 直杆只能沿自身方向滑动，滑出银色套筒就自由了。
- 每 20 关一章，每 5 关的最后一关是困难关。无计时、无失败；有重来和提示。

| 关卡 | 新内容 | 零件 | 最少拖动次数 |
|---|---|---|---|
| 1 海滨大道 | 转缺口到夹套 | 2 | 1 |
| 2 日落长链 | 主环要等被扣环先离开 | 4 | 3 |
| 3 棕榈三角 | 闭合环、凸钉会碰撞 | 5 | 4 |
| 4 霓虹大桥 | 桥：一个环被两边扣住 | 8 | 6 |
| 5 午夜霓虹（困难） | 空夹套挡路 | 10 | 10 |
| 6 棕榈网格 | | 10 | 8 |
| 7 海湾大道 | | 10 | 9 |
| 8 霓虹高塔 | 多个闭合底座 | 10 | 8 |
| 9 日落码头 | 直杆 | 11 | 9 |
| 10 霓虹迷宫（困难） | | 12 | 11 |

## 关卡生成和验收
- 准则和验收标准：`docs/level-rules.md`；原作 1-40 关分析：`docs/original-analysis.md`。
- `node tools/levelgen/cli.js check` 验收全部关卡；`gen --level N` 生成一关；`apply` 写回 `src/levels.js`。只需要 Node 16+。

## 目录
- `src/core.js` 规则、碰撞和求解器（与渲染无关）；`src/layout.js` 排版和避让陪玩角色
- `src/levels.js` 关卡数据；`src/chapters.js` 章节、陪玩角色、奖励
- `src/main.js` 输入、动画、渲染；`src/bg.js` 程序绘制的背景；`src/audio.js` 合成音效
- `tools/levelgen/` 关卡生成器和验收；`tools/verify.sh` 用本机 Chrome 无头模式跑浏览器里的检查（见 `docs/level-rules.md` 第 6 节）
- `tools/assets.sh` 把 4K 母版转成游戏用的素材，并算出立绘轮廓

## 版权
- 不含 GTA / Rockstar 的任何 Logo、商标、角色、美术、字体或音乐，只借鉴日落海岸的霓虹氛围。
- 不含原作 Rotate Rings 的素材；关卡自行设计，只对标机制和难度。
