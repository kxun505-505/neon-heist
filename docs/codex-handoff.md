# 交接：批量生成第 11-100 关

给 Codex 等其他模型或其他机器用的说明。照着做就能长时间无人值守地出关卡，不用懂游戏代码。

## 目标

`levels-pool/` 里要有第 11-100 关，每关一个 `L011.json` … `L100.json`。`node tools/levelgen/cli.js poolcheck --to 100` 要输出 `PASS 1-100 关全部合格`，退出码为 0。

第 1-10 关在 `src/levels.js` 里，已经验收过，不要动。

## 环境

- 需要 Node 16 以上，不用 `npm install`。项目里没有任何依赖。
- 在仓库根目录运行。
- 用不用 Chrome 都行。下面的命令都只用 Node。

## 怎么跑

```sh
node tools/levelgen/cli.js curve                       # 看 1-100 关每关的目标
node tools/levelgen/cli.js batch --from 11 --to 100 --jobs 8 --minutes 20 --rounds 10
```

- `--jobs` 是并行的进程数，设成 CPU 核数减 1。
- `--minutes` 是每关每轮最多试多久。
- `--rounds` 是最多跑几轮。每一轮都换一批新种子。
- 随时可以中断。重新运行同一条命令，就会从断点继续。已经合格的关卡会留下，试过的种子记在 `levels-pool/attempts.json` 里，不会重复试。
- 每一轮结束会自动做整体验收。不合格的关卡移到 `levels-pool/rejected/`，下一轮重做。
- 进度在 `levels-pool/progress.log`，整体验收报告在 `levels-pool/report.txt`。

单关调试用这几条：

```sh
node tools/levelgen/cli.js gen --level 57 --seeds 300 --seed0 1 --minutes 20 --out levels-pool/L057.json
node tools/levelgen/cli.js measure --level 57 --file levels-pool/L057.json
node tools/levelgen/cli.js poolcheck --to 100 --fix
```

## 合格标准（不能改）

完整定义见 `docs/level-rules.md` 第 4 节。代码在 `tools/levelgen/levelgen.js` 的 `accept()` 和 `RULES` 里，概括如下：

- **A 合法**：零件不重叠，开局没有碰撞，开局没有夹套已经松开，凸钉和杆根都长在实心管子上。
- **B 可解**：求解器能解开；开局时游戏里的提示按钮能给出下一步。
- **C 尺寸**：在参考屏 390×844 上，最小环半径 ≥ 27.5px，管子 ≥ 9px。困难关可以降到 90%。
- **D 不挡角色**：棋盘不压右下角的陪玩角色。
- **E 难度**：零件数、最少步数、第一步陷阱比例都在 `tools/levelgen/curve.js` 给这一关的范围里。
- **F 节奏**：零件数不突然暴涨；结构不和前面任何一关重复；困难关的难度指数不低于同组的普通关。

## 允许改什么，不允许改什么

| 可以改 | 不可以改 |
|---|---|
| `tools/levelgen/curve.js` 里第 41-100 关的 `grow` 参数（根环、直杆、桥、凸钉比例、网格），用来提高出关率 | `src/core.js`（游戏规则） |
| 某关实在出不来时，把它的 `par` 范围放宽 1-2 | `src/layout.js`、`src/chapters.js` |
| 加大 `--seeds`、`--minutes`、`--rounds` | `levelgen.js` 里的 `RULES` 数字和 `accept()` |
| | 第 1-40 关的曲线；`src/levels.js` |
| | 手改 `levels-pool/` 里的关卡几何 |

改了 `curve.js` 以后，在 `levels-pool/report.txt` 末尾写一行说明，写清楚改了哪关、改了什么、为什么改。

## 卡住时怎么办

- 淘汰原因 `nohint` 或 `unsolved` 占大多数：这一关太难解，把桥 `bridges` 和根环 `hubs` 的上限各减 1。
- 淘汰原因 `nolayout` 占大多数：零件放不下，把 `pieces` 的上限减 1。只有第 41 关以后可以这样改。
- 淘汰原因 `E 第一步陷` 占大多数：陷阱不够，把凸钉比例 `knobs` 加 0.1。
- 困难关报 `F 困难关难度指数…低于同组普通关`：`batch` 会自动把同组里最难的那个普通关一起退回重做，不用管。
- 后期大关单个候选可能要算几分钟，这是正常的。

## 交回来什么

1. `levels-pool/L011.json` … `L100.json`。
2. `levels-pool/report.txt`，最后一行要是 `PASS 1-100 关全部合格`。
3. 对 `tools/levelgen/curve.js` 的改动，如果有改的话。

收到以后，我这边会把关卡写进游戏（用 `cli.js apply`），补 6 种语言的提示和奖励素材，跑真机排版和自动试玩，再发测试版。
