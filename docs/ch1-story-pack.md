# 第 1 章第 1 环（第 1-5 关）剧情小样：出图需求包

给 GPT（或画师、视频工具）用。剧情背景见 `docs/story.md` 第 4 节，画法规则见 `docs/art-bible.md`。

## 怎么用

按下面的顺序出图，每一步都把上一步的结果当作参考图一起上传，这样角色才能保持一致：

1. **Nico 的角色设定图**（第 A 节）。
2. **漫画版 Kira 的设定图**（第 B 节）。上传 `assets-src/ch1/` 里 Kira 现有的立绘（例如 idle.png）作为参考。
3. **4 页插画**（第 C 节，P1-P4）。每页都要上传 A 和 B 两张设定图。
4. **视频 1**（第 D 节）。把分镜和 P4 一起交给视频工具，比如 Veo、Kling 或 Sora。
5. **立绘新加的 2 个表情**（第 E 节）。这两张是给右下角陪玩立绘用的，画法要和现有的 7 张立绘一致，不是漫画风。

做好的文件放进 `assets-src/ch1/story/`，用第 F 节的文件名，然后告诉我。我来转成游戏用的格式、叠上对白气泡、放进第 1-5 关。

---

## 统一画风说明（每个出图提示词都要整段带上）

> Vertical 9:16 comic illustration, 1080×1920 px. 1980s Miami crime-comic poster style: bold black ink outlines of consistent weight, flat cel shading with 2–3 hard-edged tones per color (shadows shift toward purple, highlights toward cream), subtle halftone dots in the shadows, light print grain. Key light from the upper left (cool sky light); warm sunset rim light (#FFC478 to #FF7832) on the right edges of characters. Palette limited to hot pink #FF4F9A, coral orange #FF8A4C, sunset yellow #FFC93C, lime #9BE15A, teal #2DD4BF, sky blue #4F9DFF, electric violet #A274FF, plus ink #1A0B2E and cream #FFF4E0. Original characters and places only. No text, no speech bubbles, no logos, no brand names, no watermarks. Keep the top 22% and the bottom 18% of the frame visually calm (sky, wall, floor or soft background), because the game will place dialogue bubbles and buttons there. All characters are adults. Tasteful and stylish, suitable for a teen-rated mobile game: no nudity, no underwear, no sexualized poses, no blood, no weapons pointed at people.

规则：提示词里不要写 GTA、Grand Theft Auto、Rockstar、Vice City、Leonida 或任何游戏角色的名字，否则容易画出别人的标志性元素。

---

## A. Nico Vale 角色设定图

> Character design turnaround sheet for an original adult male lead, "Nico Vale", 30, leader of a heist crew. Front view, 3/4 view, side view, plus 4 facial expressions (calm half-smile, focused while picking a lock, raised-eyebrow amusement, surprised). Tall, athletic build. Slightly messy, wavy dark-brown hair; short stubble; warm tan skin; strong jaw; confident relaxed half-smile. Outfit: unbuttoned pastel-mint linen shirt over a white crew-neck T-shirt, sleeves rolled to the elbows, light sand-colored chinos, brown leather loafers, gold signet ring on the right hand, aviator sunglasses (shown on and pushed up). No tattoos, no buzz cut, no full beard, no tank top. He must not resemble any real person or existing game character. Plain cream background. [加上统一画风说明，尺寸改成 1920×1080 横版]

## B. 漫画版 Kira Sol 设定图

> Character design sheet of the attached reference woman, redrawn in the comic style below. Keep her identity exactly: "Kira Sol", 24, adult. Long copper-red beach-wave hair to the chest with one strand tucked behind the left ear; light freckles across the nose and cheeks; hazel-green eyes with slightly upturned outer corners; natural thick brows; full lips with a lopsided smirk (left corner higher). Light golden tan, athletic, 170 cm. Accessories: pink heart-shaped sunglasses (on her head or on her face), big gold hoop earrings, a colorful beaded bracelet on the left wrist. No tattoos. Outfit A (day / bar): teal retro high-waist bikini top under an open white cropped linen shirt with rolled sleeves, high-waist light denim shorts. Outfit B (night): teal cropped tank top, open white linen shirt, denim shorts, white sneakers. Front, 3/4, back views, plus 4 expressions: smirk, laughing, narrowed-eyes suspicious, wink. [加上统一画风说明，尺寸改成 1920×1080 横版]

---

## C. 4 页插画

每页都写了构图、人物、表情、光线、要留空的位置，以及游戏会叠加的对白。对白不要画进图里。

### P1（第 1 关）：Coral Shack 海滩酒吧，黄金时刻

> Golden-hour beach bar called (unnamed) shack on the sand, palm-thatched roof, string lights just turning on, the sea and a huge low sun behind. Medium shot from behind and slightly to the left of Nico, who sits on a bar stool in the lower-left third (3/4 back view, aviators on, relaxed). Across the bar on the right, Kira (Outfit A) leans forward on both forearms, shaking a cocktail shaker, looking straight at him with an amused, sizing-up smirk. Warm sunset rim light on both. Top 22%: sky and string lights only. Bottom 18%: wooden bar top, calm. [统一画风说明]

对白（游戏叠加）：
| 谁 | 位置 | EN | 中文 |
|---|---|---|---|
| Kira | 右上 | You're not here for the mojitos. | 你不是来喝莫吉托的。 |
| Nico | 左下 | I'm here for the best driver on the coast. | 我是来找海岸线上最好的车手的。 |
| Kira | 右上 | Then you're already late. | 那你已经迟到了。 |

悬念：最后一格，她的手把一张餐巾纸推了过来（可以画在吧台上的前景里）。

### P2（第 2 关）：餐巾纸特写

> Close-up from above of a cocktail napkin on a wooden bar top, damp ring from a glass beside it. A small brass key is taped to the napkin. On the napkin, lipstick-pink handwritten marks only as an abstract scribble shape (the game will add the readable text). Nico's hand with the gold signet ring rests next to it. In the soft background, Kira (Outfit A) walks away toward the beach, glancing back over her shoulder with a teasing look; hair catching the sunset light. Top 22% and bottom 18% calm. [统一画风说明]

对白：
| 谁 | 位置 | EN | 中文 |
|---|---|---|---|
| 餐巾纸上的字 | 中间（贴在餐巾纸上） | Pier 9 · Midnight | 9 号码头 · 午夜 |
| Kira | 右上 | Open the lock. Then we talk. | 先把锁打开，再谈。 |

### P3（第 3 关）：午夜 9 号码头

> Midnight on an old wooden pier, neon signs of the coast glowing far behind across the water, moonlight. Kira (Outfit B) leans against the hood of her pink vintage convertible on the right, arms crossed, sunglasses pushed up on her head, a wristwatch held up in one hand as if timing him, playful challenge on her face. In the center foreground, a wooden crate wrapped in a heavy chain with a big padlock; Nico kneels beside it on one knee, working the padlock with lock picks, calm and focused, aviators hanging from his shirt. Low camera angle. Top 22% night sky, bottom 18% pier planks. [统一画风说明]

对白：
| 谁 | 位置 | EN | 中文 |
|---|---|---|---|
| Kira | 右上 | Ten seconds, boss. Or I'm gone. | 十秒，boss。不然我走人。 |
| Nico | 左下 | Eight. | 八秒就够。 |

### P4（第 4 关）：箱子打开

> Same pier at night, closer shot. The crate is open: inside, a rolled blueprint of a nightclub and a shiny gold key card catching the light. Kira (Outfit B) stands very close to Nico, face to face (both standing), one fingertip touching the center of his chest, a confident, slightly dangerous smile; Nico looks down at her with an amused half-smile. Far in the background, between them, a pair of car headlights has just switched on at the end of the pier (small, bright, ominous). Romantic tension but fully clothed and tasteful. Top 22% night sky, bottom 18% pier and crate edge. [统一画风说明]

对白：
| 谁 | 位置 | EN | 中文 |
|---|---|---|---|
| Kira | 右上 | I don't join crews. I test them. | 我不加入团队，我只考验他们。 |
| Kira | 右上 | Coral Club. Tomorrow, sunset. Fifty-fifty. | Coral Club。明天日落。五五分。 |
| Nico | 左下 | …Who's that? | ……那是谁？ |

---

## D. 视频 1（第 5 关，困难关）

- 规格：竖屏 9:16，1080×1920，10-12 秒，24 或 30 fps，MP4（H.264），不超过 8MB。
- 做法：「动态漫画」，就是用和插画同一画风的画面做镜头运动和少量角色动作。比真人风视频更好做，画风也能和插画一致。
- 声音：不要音乐，游戏会自己配音效。可以有引擎声和轮胎声。

| 镜头 | 时长 | 画面 |
|---|---|---|
| 1 | 0-2 秒 | 接着 P4：码头尽头的车灯猛地变亮，一辆黑色 SUV 冲过来。Kira 和 Nico 同时转头 |
| 2 | 2-5 秒 | Kira 一把抓住 Nico 的手，两人翻进粉色敞篷车。她挂挡，轮胎冒烟 |
| 3 | 5-8 秒 | 霓虹海岸公路，侧面跟拍：敞篷车甩尾超车，SUV 紧追。Kira 的头发在风里飘，她在笑；Nico 一手按着车门 |
| 4 | 8-10 秒 | 敞篷车钻进小巷，车灯熄灭。SUV 从巷口呼啸而过。安静。 |
| 5 | 10-12 秒 | 车里，Kira 转向镜头（也就是转向玩家）眨眼。最后一帧切到巷口：SUV 车窗里，一只手举着手机在拍照 |

视频工具的提示词，每个镜头都加上统一画风说明：

> Motion-comic animation in the attached comic style, vertical 9:16. [镜头描述，用上表的英文改写]. Keep characters identical to the attached character sheets. No text, no logos, no blood, no weapons.

## E. 立绘新加的 2 个表情（右下角陪玩用）

- 做法：拿现有的 `assets-src/ch1/girl/idle.png`（2160×2880，透明背景）去改。身体、服装、画布尺寸、位置、光线保持完全一样，只改脸和手。这样游戏里切换表情时，身体不会跳。
- 画法：和现有 7 张立绘一致，不是漫画风。

| 文件名 | 表情 | 什么时候出现 | 提示词 |
|---|---|---|---|
| `smirk.png` | 得意坏笑：单边嘴角上扬，眉毛一挑，眼睛微眯，一只手的手指把心形墨镜往下拨一点 | 连消 2-3 个零件 | Edit the attached image. Keep the body, outfit, pose, canvas size, position and lighting exactly the same; change only the face and one hand: a cocky smirk (left mouth corner up), one eyebrow raised, eyes slightly narrowed, one hand's fingers pulling her pink heart sunglasses down her nose. Transparent background. |
| `excited.png` | 兴奋欢呼：张嘴大笑，眼睛笑弯，双手在胸前握拳，肩膀微微耸起 | 连消 4 个以上，或者一次飞走 2 个以上 | Edit the attached image. Keep the body, outfit, canvas size, position and lighting exactly the same; change only the face and hands: an open-mouth excited laugh, eyes squeezed into happy crescents, both fists clenched near her chest in a little victory cheer, shoulders slightly raised. Transparent background. |

## F. 交付的文件

| 文件 | 尺寸 | 放在 |
|---|---|---|
| `nico-sheet.png`、`kira-comic-sheet.png` | 1920×1080 | `assets-src/ch1/story/` |
| `p01.png` … `p04.png` | 1080×1920 | `assets-src/ch1/story/` |
| `v01.mp4` | 1080×1920，10-12 秒 | `assets-src/ch1/story/` |
| `smirk.png`、`excited.png` | 2160×2880，透明背景 | `assets-src/ch1/girl/` |

**验收**
- 两个角色在 4 页里认得出是同一个人：Kira 的铜红头发、雀斑、金色大圈耳环、心形墨镜；Nico 的亚麻衬衫、图章戒指、飞行员墨镜。
- 画面里没有文字、logo 和品牌名。
- 上方约 22%、下方约 18% 是安静的区域，能放下对白。
- 没有裸露、内衣、性暗示的姿势、血和枪口对人。
