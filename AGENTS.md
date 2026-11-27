# AGENTS.md：接手本项目的 AI 先读这份

适用于 Claude、Codex、Gemini 等任何模型或工具。读完这份，再读 `docs/DEVLOG.md`（开发历程和每个决定的原因），就可以接着做，不用再问用户已经回答过的问题。

## 1. 这是什么

**NEON HEIST · Ring Puzzle**（原名 NEON LOOPS）是一款圆环解扣类解谜游戏的网页试玩版。

- **玩法和难度**：对标 Google Play 上的 Rotate Rings（`com.nebula.rotaterings`）。
- **画风**：只借 GTA6 的视觉氛围，也就是迈阿密霓虹、夕阳渐变、棕榈剪影和 80 年代复古感，不借任何游戏玩法。
- **商业化方向**：上架 Google Play，17+ 风格。每章配一个原创的成年女生陪玩角色。通关解锁她的照片和视频，用来留住玩家。
- **技术**：纯 HTML + Canvas 2D + 原生 JS，没有构建步骤，没有依赖。直接打开 `index.html` 就能玩。

## 2. 用户的长期要求（必须遵守）

**沟通**
- 用户觉得确认太多、太累赘。有不确定的地方，自己选一个合理的默认方案直接做，不要停下来问。
- 汇报只写做了什么、怎么用。假设合并成一句「我假设了 X，不对就说」。
- 只有两种情况停下来问：碰到下面的红线，或者没有用户的信息就完全做不下去。问的时候合并成一个问题，附上推荐选项，让用户能用一个字回答。
- 用户在命名、logo 这类主观选择上会说「先给我点选」。这时列出带字母的选项，并写明推荐哪个。
- 回复用中文。游戏界面文字用英文，另有 6 种语言：英、日、韩、葡、中、俄。

**红线**
- **侵权**：不用 GTA 或 Rockstar 的 Logo、商标、角色、美术、字体、音乐。名字、商店标题和关键词里不出现 GTA、Vice City、Leonida、Lucia。不复制原作 Rotate Rings 的美术、图标和关卡布局，关卡自己设计，只对标难度。
- **尺度**：按 Google Play 标准，时尚性感可以，调情台词可以。不要内衣、裸露、性暗示姿势或露骨台词。角色必须明确成年、原创，不能像真人或 GTA6 的角色。
- **要先问用户的事**：部署到 GitHub Pages 以外的地方、花钱、force push、改动本项目目录以外的文件。

**发布流程**
- 所有改动先发测试版，用户确认后才更新正式版。见第 4 节。

## 3. 目录和代码

```
index.html            页面结构：HUD、按钮栏、陪玩角色、设置、主页、过关面板、相册、大图查看
style.css             全部样式；logo 3 种样式在文件末尾（lg-chrome / lg-tube / lg-outrun）
src/core.js           规则、碰撞、求解器（solve 广度优先 / solveFast / hintMove / sweep / validate），游戏和生成器共用
src/layout.js         排版：零件占地、避让陪玩角色轮廓、参考屏 390×844
src/levels.js         关卡数据（目前 40 关，由生成器产出）
src/chapters.js       章节（每 20 关一章）、陪玩角色（立绘路径、轮廓 mask、6 种语言台词）、奖励（照片/视频路径）
src/main.js           输入、动画、渲染、主页、相册、设置、陪玩角色动画
src/bg.js             程序绘制的 4 个背景；src/audio.js 合成音效；src/haptics.js 震动（含 iOS 透明开关技巧）；src/i18n.js 6 种语言
assets/ch1、ch2       游戏用素材（立绘 WebP、照片、视频；ch2 现在是占位 SVG）；assets/fonts 是 logo 用的 OFL 字体
assets-src/           4K 母版（没进 git，体积大，只在用户的 Mac 上），用 tools/assets.sh 转成游戏用素材
tools/levelgen/       关卡生成器和验收（cli.js / levelgen.js / curve.js），Node 16+，零依赖
levels-pool/          批量生成的关卡池（每关一个 Lnnn.json），给 Codex 长时间跑
tools/*.html          浏览器测试页（用 tools/verify.sh 在无头 Chrome 里跑）；icon.html + icon.sh 生成应用图标
docs/                 规格和记录（见第 6 节）
```

**规则模型（重要，是对照原作视频反推的，第一版理解错了）**
- 主环伸出一根杆，杆端的夹套套住被扣环的管子。
- 转动被扣环，让它的缺口转到夹套处，这条连接就松开；缺口转走又会扣回去。
- 一个零件身上所有连接同时松开时，它就飞走，可能引发连锁。
- 还扣着别人的主环转不动，闭合环也转不动。
- 凸钉，以及被扣环飞走后留下的空夹套，都会挡住别的零件。
- 直杆只能沿自身方向滑动，滑出银色套筒就自由了。
- 环可以套在大环里面。
- 完整说明在 `src/core.js` 开头的注释。

## 4. 发布和仓库

所有仓库都在 GitHub 账号 `kxun505-505` 下，都是公开仓库，都是这个产品专用的：`neon-heist`（正式版）和 `neon-loops-staging`（测试版）。三个网站都用 GitHub Pages 发布，发布的是仓库的 `main` 分支。

| 本地分支 | 远程 | 网站 | 用途 |
|---|---|---|---|
| `fx-b`（开发主线）。`staging` 分支指向同一个提交 | `staging` → `main` | https://kxun505-505.github.io/neon-loops-staging/ | **测试版**。每次改动都先推到这里 |
| `main` | `origin` → `main`（仓库 `neon-heist`，原名 neon-loops） | https://kxun505-505.github.io/neon-heist/ | **正式版**。用户明确确认后才更新，目前停在 11-25 的旧版本。旧网址 /neon-loops/ 改名后是 404 |
| `fx-b` 的完整历史 | `origin` → `dev` | 不发布网站 | 在产品主仓库里备份开发历史，推它不影响正式版 |
| `fx-c`（只留在本地） | 无 | 无 | 特效方案 C+D 的对比版，已弃用。仓库 neon-loops-cd 用户要求删除（2026-11-27），见 DEVLOG |

**发布测试版**

```sh
git push staging fx-b:main && git branch -f staging fx-b && git push origin fx-b:dev
```

只能快进推送，不能 force push。GitHub 令牌用 `git credential fill` 取。

**发布前必须跑**，任何一项不通过都不能发布：

```sh
node tools/levelgen/cli.js check            # 关卡验收；也可以用 tools/verify.sh（浏览器版）
tools/verify.sh layout.html                 # 6 种屏幕尺寸的排版，不压角色
tools/verify.sh smoke.html && UA=iphone tools/verify.sh smoke.html    # 55 项界面冒烟测试
UA=iphone tools/verify.sh iostap.html       # iPhone 上的点击不会落到隐藏面板
tools/verify.sh rehook.html                 # 转出夹套后还能转回去扣上
BUDGET=1700000 tools/verify.sh playtest.html  # 用合成触摸事件把每关玩通
```

**用户 Mac 的环境**
- 系统是 macOS 13.0，新版 Node 跑不了。本地 Node v20 在 `.tools/node/bin`，用之前 `export PATH=$PWD/.tools/node/bin:$PATH`。
- `.tools/` 没进 git，里面还有 yt-dlp、ffmpeg 和原作视频。
- 测试用的 Chrome 在 `/Applications/Google Chrome.app`。

## 5. 当前状态（2026-11-28）

**已完成**
- 40 关，分 2 章：第 1 章 SUNSET COAST 是第 1-20 关，第 2 章 NEON CITY 是第 21-40 关。每 5 关的最后一关是困难关。
- 第 1 章的陪玩角色 Kira Sol 已有正式立绘，共 7 种表情。第 2 章的角色还是占位。
- 相册：每关解锁 1 张照片，每个困难关解锁 1 段视频。目前只有占位照片，第 1 章的视频 1-2 也是占位。
- 设置：语言是半透明下拉弹窗。
- 主页：一屏放下。顶部是相册条，然后是章节按钮，下面是左右滑动的关卡转盘。
- 名字 NEON HEIST，logo 用 C 夕阳复古样式（`lg-outrun`）。
- 关卡生成器：1-100 关的难度曲线，可以批量生成、断点续跑。
- 40 关全部通过验收（含第 25 关的 F 项）。
- App 图标按 C 夕阳复古重做：`tools/icon.html` 画，`tools/icon.sh` 出 `icon.png`（180）和 `store-icon-512.png`（Google Play 商店用）。

**待办**
- **第 41-100 关**：交给 Codex 跑，见 `docs/codex-handoff.md`。生成好之后，用 `cli.js apply` 或拼装脚本写进 `src/levels.js`，补 6 种语言的提示（`src/i18n.js` 的 `tips`）和奖励素材路径（`src/chapters.js`）。
- **素材**：第 1 章还缺正式的照片 16 张和视频 4 段；第 2 章的角色设定、立绘、照片和视频都还没做。出图需求的写法参考 `docs/ch1-gpt-asset-pack.md`。
- **测试版仓库名**：还叫 neon-loops-staging，用户没要求改。改名会改变测试版网址，要先问用户。
- **正式版**：还停在 11-25。用户确认后，把 `fx-b` 合进 `main`，推到 `origin`。

## 6. 文档索引

| 文件 | 内容 |
|---|---|
| `docs/DEVLOG.md` | **开发历程**：按时间记录用户的每个要求、做法、被否掉的方案和原因、用户反馈 |
| `docs/level-rules.md` | 关卡准则、验收标准 A-F 和指标定义 |
| `docs/original-analysis.md` | 原作第 1-40 关逐关分析和难度规律 |
| `docs/codex-handoff.md` | 批量生成关卡的交接说明 |
| `docs/ch1-character.md` | 第 1 章角色 Kira Sol 的设定 |
| `docs/ch1-gpt-asset-pack.md` | 给 GPT 出图用的提示词和需求包 |
| `tools/levelgen/README.md` | 生成器用法 |
| `README.md` | 项目简介 |
