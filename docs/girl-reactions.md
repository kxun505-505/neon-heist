# 陪玩女生的反应规则（v2，2026-11-28）

代码在 `src/main.js` 的 `Girl` 模块（`EXPR`、`SPONT`、`react`、`glance`），台词在 `src/chapters.js` 每个角色的 `lines`。
用户 11-28 的要求：消除零件时，除了原来的 1 个表情，再加 2 个；通关仍然只用 1 个表情。

## 表情（每个女生 9 张）

| 表情 | 文件 | 用在哪 |
|---|---|---|
| idle 放松微笑 | idle | 平时 |
| blink 眨眼 | blink | 平时每 3-6 秒眨一次 |
| happy 开心 | happy | 打招呼；这一关第一次消除零件 |
| smirk 得意坏笑（新） | smirk | 2 连消 |
| surprised 惊讶 | surprised | 3 连消 |
| excited 兴奋欢呼（新） | excited | 4 连消以上，或一次飞走 2 个以上 |
| pout 噘嘴 | pout | 卡关 |
| thinking 思考 | thinking | 点提示 |
| wink 眨眼放电 | wink | 通关（所有通关情况都用它） |

新表情还没出图时，先用最接近的旧表情代替：smirk 用 wink，excited 用 happy。出图需求在 `docs/ch1-story-pack.md` 第 E 节。

## 触发规则

| # | 情境 | 怎么判断 | 表情 | 台词组 | 气泡 |
|---|---|---|---|---|---|
| 1 | 打招呼 | 每章第 1 关第一次进入时 | happy | greet | 有 |
| 2 | 第一次消除 | 这一关第一次有零件飞走，而且不是连击 | happy，1.2 秒后回到 idle | 无 | 无 |
| 3 | 2 连消 | 1.4 秒内接连飞走第 2 个零件 | smirk | combo2 | 有 |
| 4 | 3 连消 | 连击数到 3 | surprised | combo | 有 |
| 5 | 4 连以上 / 一次飞走 2 个以上 | 连击数 ≥ 4，或者一次操作同时飞走 ≥ 2 个 | excited | comboBig | 有 |
| 6 | 卡关 | 10 秒内碰壁 3 次，或者 25 秒没有进展 | pout | stuck | 有 |
| 7 | 点提示 | 玩家点了提示按钮 | thinking | hint | 有 |
| 8 | 通关，解锁了新剧情 | 第一次通过有剧情的关 | wink | story | 有 |
| 9 | 通关，解锁了照片 / 视频 | 第一次通过、奖励是照片或视频（还没换成剧情的章） | wink | photo / video | 有 |
| 10 | 通关，干净利落 | 重玩时，没用提示、一次都没碰壁 | wink | clean | 有 |
| 11 | 通关，普通 | 重玩时，其他情况 | wink | clear | 有 |

最后一个零件飞走时不做 2-5 的反应，交给通关反应。

## 防刷屏

- 连击和卡关属于「自发反应」：两次气泡之间至少隔 4 秒，同一组台词至少隔 10 秒。
- 连击升档时可以立刻打断冷却：例如 2 连刚说完，马上到了 4 连，会直接换成 excited。
- 打招呼、点提示、通关不受冷却限制。
- 第一次消除只换表情、不说话；如果 2.8 秒内刚说过话，就连表情也不换。
- 同一组台词不会连着两次抽到同一句。
- 气泡停留 2.8 秒，之后表情回到 idle。

## 台词组

每个角色的 `lines` 里有这些组，每组 6 种语言：greet、stuck、combo2、combo、comboBig、hint、story、photo、video、clean、clear。
新加的组没写时，会借用相近的组：combo2 和 comboBig 借 combo，clean 和 story 借 clear。所以第 2 章的占位角色不会报错。
