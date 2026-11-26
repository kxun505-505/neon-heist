# 第 1 章 GPT 出图需求包（Kira Sol · SUNSET COAST）

把下面的提示词直接贴给 GPT。提示词用英文，出图效果更稳定。每次出图都要带上
「风格块」「角色块」「合规块」三段，长相和画风才能保持一致。

## 0. 先说清楚的两件事
1. **4K 需要放大**：GPT 出图最大约 1024×1536（竖图）。4K 母版要再用 AI 放大工具放大 2.5–4 倍，
   例如 Topaz Gigapixel、Magnific、Real-ESRGAN。放大后检查手指、耳环、头发边缘有没有糊或变形。
2. **六个表情必须是同一张身体**：先出 idle，再用 GPT 的“编辑图片”功能，只框选脸（和手）重画，
   其他部分保持不动。这样游戏里切换表情时身体不会跳。

## 1. 三段固定文字（每个提示词都要带）

**风格块 STYLE**
```
Stylized semi-realistic digital illustration with bold clean ink outlines and cel shading
with soft gradients. Saturated 1980s-inspired Miami sunset palette: hot pink, coral,
turquoise, tangerine, deep violet shadows. Subtle halftone grain. Looks like a premium
open-world action game loading-screen poster. Original artwork. No text, no letters,
no logos, no brand names, no watermark, no signature.
```

**角色块 CHARACTER**
```
Kira Sol, an original adult woman, 24 years old. Oval face, high cheekbones, light
freckles across nose and cheeks, hazel-green eyes with slightly upturned outer corners,
natural full eyebrows, full lips with a playful lopsided smirk. Long copper-auburn hair
in loose beach waves, sun-lightened ends, one strand tucked behind her left ear.
Light sun-kissed tan skin, healthy athletic build. Pink heart-shaped sunglasses pushed
up on her head, large gold hoop earrings, colorful beaded bracelet on her left wrist.
No tattoos.
```

**合规块 RULES**
```
Clearly an adult. Tasteful fashion-editorial pose. No nudity, no lingerie, no sexually
suggestive pose, no focus on body parts. Outfit appropriate for a public beach or city
street. She must not resemble any real person or any existing video game character.
```

## 2. 角色设定图（只做参考，不进游戏）
- 文件：`character-sheet.png`，3840×2160，浅灰纯色背景
```
[STYLE] [CHARACTER] [RULES]
Character reference sheet on a plain light grey background: three full-body views of
the same woman side by side (front, three-quarter, side), standing in a relaxed neutral
pose. Outfit: turquoise retro high-waisted bikini top with an open cropped white linen
shirt, sleeves rolled to the elbows, high-waisted denim shorts, white sneakers.
Plus three head close-ups along the bottom: neutral, smiling, winking. Even studio
lighting. Same face and hair in every view.
```

## 3. 角落立绘：6 个表情（+ 1 个可选）
**统一规格**：2160×2880（3:4），透明背景 PNG。半身像，从头顶到腰，腰部被画面下边缘切掉。
头顶离画布上沿约 6%。身体朝向画面左侧（她坐在屏幕右下角，看向棋盘）。
6 张图的构图、身体、衬衫褶皱完全一样，只有脸和手势不同。

**第一张 idle（基础图）**
```
[STYLE] [CHARACTER] [RULES]
Waist-up portrait on a fully transparent background, three-quarter view turned toward
the left of the frame, looking at the viewer. Outfit: turquoise retro bikini top under
an open cropped white linen shirt with rolled sleeves. Relaxed confident posture, one
hand resting on her hip, the other relaxed at her side. Expression: relaxed confident
smile. Warm sunset rim light from the right, soft pink fill light from the left.
The top of her head is about 6% below the top edge; the bottom edge cuts at her waist.
```

**其余 5 张**：上传 idle，用编辑功能只框选脸部（thinking 和 pout 连手一起框），提示词：

| 文件名 | 编辑提示词 |
|---|---|
| `happy.png` | `Change only her facial expression to a big open joyful laugh, eyes squinting with joy. Keep everything else identical.` |
| `surprised.png` | `Change only her facial expression to excited surprise: eyebrows raised, eyes wide, mouth in a small round "whoa". Keep everything else identical.` |
| `wink.png` | `Change only her facial expression to a playful wink with her right eye and a teasing half smile. Keep everything else identical.` |
| `pout.png` | `Change her expression to a playful pout with one eyebrow raised, and change her raised hand to tapping her wrist like checking a watch. Keep everything else identical.` |
| `thinking.png` | `Change her expression to curious and thoughtful, eyes glancing to the side, and change her hand to touching her chin with one finger. Keep everything else identical.` |
| `blink.png`（可选） | `Change only her eyes to gently closed, as in the middle of a blink. Keep everything else identical.` |

## 4. 第 1 章的 4 张照片
**统一规格**：2160×3840（9:16 竖图）PNG 或高质量 JPG，满版不留白。
不同照片可以换衣服，但脸、头发、配饰要和设定图一致。出图时把设定图一起上传当参考。

| # | 文件名 | 解锁关卡 | 场景 |
|---|---|---|---|
| 1 | `photo1.png` | 第 5 关 | 救生塔下的黄金时刻 |
| 2 | `photo2.png` | 第 10 关 | 海岸公路边的粉色敞篷车 |
| 3 | `photo3.png` | 第 15 关（还没做关卡，先出图） | 夜晚霓虹海滨栈道 |
| 4 | `photo4.png` | 第 20 关（还没做关卡，先出图） | 屋顶泳池派对 |

**photo1 · 救生塔下的黄金时刻**
```
[STYLE] [CHARACTER] [RULES]
Vertical 9:16 full-bleed scene. Golden-hour beach: she sits on the ramp of a pastel pink
and turquoise lifeguard tower, laughing and holding her heart sunglasses in one hand,
wind in her hair. Outfit: turquoise retro high-waisted bikini with a sheer coral sarong
tied at the waist. Low sun behind her creating a warm glow, palm trees, gentle waves,
seagulls. Candid, joyful vacation photo.
```

**photo2 · 海岸公路的粉色敞篷车**
```
[STYLE] [CHARACTER] [RULES]
Vertical 9:16 full-bleed scene. Coastal highway at sunset: she leans on the door of a
generic vintage pink convertible with no badges and no logos, sunglasses on, looking back
over her shoulder at the viewer with a confident smile. Outfit: white cropped tank top,
high-waisted denim shorts, white sneakers. Long road along the ocean, palm silhouettes,
pink and orange sky, light trails from passing cars.
```

**photo3 · 夜晚霓虹海滨栈道**
```
[STYLE] [CHARACTER] [RULES]
Vertical 9:16 full-bleed scene. Night boardwalk with glowing neon arcade signs made only
of abstract shapes, no readable text. She walks toward the viewer holding a pink plush
prize toy, mid-laugh. Outfit: sparkly turquoise sequin mini dress with a cropped denim
jacket, gold sandals. Neon pink and cyan reflections on the wet wooden planks, a lit
Ferris wheel in the background.
```

**photo4 · 屋顶泳池派对**
```
[STYLE] [CHARACTER] [RULES]
Vertical 9:16 full-bleed scene. Night rooftop pool party above a glowing city skyline:
she sits on the edge of the pool with her feet in the water, raising a colorful fruit
mocktail toward the viewer, smiling. Outfit: coral one-piece swimsuit with a sheer white
cover-up shirt. String lights, palm trees in planters, turquoise pool light rippling
across her.
```

## 5. 第 1 章解锁视频脚本：《Sunset Drive》
**规格**：8 秒，9:16 竖屏，1080×1920（工具支持的话出 2160×3840），24 或 30 fps，MP4（H.264），
不超过 10 MB，不需要声音（游戏里加音效和音乐）。
**做法**：用 photo2 当首帧，用图生视频工具（Sora、可灵、即梦等）生成。

| 时间 | 画面 | 镜头 |
|---|---|---|
| 0–2 秒 | 和 photo2 一样：她靠在粉色敞篷车边，回头看镜头 | 静止，慢慢推近 |
| 2–4 秒 | 她把心形太阳镜从头顶拉下来戴上，冲镜头眨一下眼 | 推到半身 |
| 4–6 秒 | 她跳进驾驶座，发丝在风里飘，回头对镜头飞吻 | 镜头跟着她右移 |
| 6–8 秒 | 敞篷车沿海岸公路开向夕阳，留下两道粉色尾灯光带 | 拉远到全景，定格 |

**图生视频提示词**
```
[STYLE] [CHARACTER] [RULES]
8-second vertical video starting from this image. She pulls her pink heart sunglasses
down over her eyes, winks at the camera, hops into the driver's seat of the pink
convertible, blows a kiss over her shoulder, and drives off along the coastal highway
into the sunset, leaving two pink tail-light streaks. Smooth cinematic camera: slow
push-in, then track right, then pull back to a wide shot. Consistent face and hair,
natural motion, no text, no logos.
```

## 6. 交付方式
1. 把 4K 母版按上面的文件名放进 `assets-src/ch1/`，表情放 `assets-src/ch1/girl/`，视频命名为 `video.mp4`。
2. 在项目目录运行 `tools/assets.sh ch1`。脚本会生成游戏用的压缩版本（立绘 WebP 高 1600 像素，
   照片 WebP 1440×2560，视频原样复制），放进 `assets/ch1/`。
3. 告诉我一声，我把 `src/chapters.js` 里的占位图换成正式图。

## 7. 验收清单
- [ ] 所有图里是同一张脸：雀斑、眼睛颜色、发色、耳环、心形太阳镜都一致
- [ ] 6 个表情叠在一起切换时身体不跳动
- [ ] 手指数量正确，没有多余或融化的手指
- [ ] 画面里没有任何文字、Logo、车标、品牌
- [ ] 一眼看上去是成年人
- [ ] 没有内衣、裸露、性暗示姿势；泳装只出现在海滩、泳池场景
- [ ] 不像任何真人或已有游戏角色
