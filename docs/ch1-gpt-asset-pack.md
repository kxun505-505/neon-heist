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

## 4. 奖励规则和出图清单
每章 20 关，按 5 关一组：**前 4 关每关解锁 1 张照片，第 5 关是困难关，解锁 1 段视频**。
所以每章要 **16 张照片 + 4 段视频**，每组 4 张照片和 1 段视频用同一个主题和服装。

| 组 | 关卡 | 主题 | 照片 | 视频 | 现在要不要做 |
|---|---|---|---|---|---|
| 1 | 1–5 | 黄金时刻海滩 GOLDEN HOUR BEACH | photo1–4 | video1（第 5 关） | **要**（关卡已上线） |
| 2 | 6–10 | 海岸公路 COASTAL HIGHWAY | photo5–8 | video2（第 10 关） | **要**（关卡已上线） |
| 3 | 11–15 | 霓虹栈道 NEON BOARDWALK | photo9–12 | video3（第 15 关） | 先不做 |
| 4 | 16–20 | 屋顶泳池 ROOFTOP POOL | photo13–16 | video4（第 20 关） | 先不做 |

**照片统一规格**：2160×3840（9:16 竖图）PNG 或高质量 JPG，满版不留白。出图时把设定图一起上传当参考，
脸、头发、配饰要和设定图一致；同一组的服装保持一致。
**视频统一规格**：8 秒，9:16 竖屏，1080×1920（工具支持的话出 2160×3840），24 或 30 fps，MP4（H.264），
不超过 10 MB，不需要声音。用同组的一张照片当首帧，用图生视频工具（Sora、可灵、即梦等）生成。

### 第 1 组：黄金时刻海滩（服装：青绿色复古高腰比基尼 + 珊瑚色半透明纱笼）
所有提示词开头都带 `[STYLE] [CHARACTER] [RULES] Vertical 9:16 full-bleed scene. Outfit: turquoise retro high-waisted bikini with a sheer coral sarong tied at the waist.`

| 文件 | 关卡 | 场景提示词（接在开头后面） |
|---|---|---|
| `photo1.png` | 1 | `She sits on the ramp of a pastel pink and turquoise lifeguard tower at golden hour, laughing, holding her heart sunglasses in one hand, wind in her hair. Low sun behind her, palm trees, gentle waves, seagulls.` |
| `photo2.png` | 2 | `She jumps to hit a beach volleyball over a net, focused and grinning, sand flying from her feet. Bright late-afternoon light, other players as soft silhouettes in the background.` |
| `photo3.png` | 3 | `She stands at a retro pastel ice-cream stand on the boardwalk, licking a pink-and-mint swirl cone and giving the viewer a playful side glance. Warm light, striped awning.` |
| `photo4.png` | 4 | `She walks through ankle-deep waves at sunset, looking back over her shoulder at the viewer with a soft smile, sarong fluttering. Orange and pink sky reflected in the wet sand.` |

**video1.mp4 · 第 5 关《Beach Day》**（首帧用 photo4）

| 时间 | 画面 | 镜头 |
|---|---|---|
| 0–2 秒 | 和 photo4 一样，她在浅浪里回头看镜头 | 静止，慢慢推近 |
| 2–4 秒 | 她转身朝镜头跑来，踢起一串水花 | 跟拍后退 |
| 4–6 秒 | 她弯腰捧起海水朝镜头泼过来，大笑 | 水花飞向镜头 |
| 6–8 秒 | 她把湿头发拨到耳后，冲镜头眨眼，夕阳在她身后 | 定格在半身 |

```
[STYLE] [CHARACTER] [RULES]
8-second vertical video starting from this image. She turns and jogs toward the camera
through shallow waves, kicking up splashes, then scoops up seawater and playfully
splashes it toward the camera while laughing, then tucks her wet hair behind her ear
and winks. Golden sunset behind her. Smooth handheld camera moving backward, ending on
a waist-up shot. Consistent face and hair, natural motion, no text, no logos.
```

### 第 2 组：海岸公路（服装：白色短款背心 + 高腰牛仔短裤 + 白色运动鞋）
所有提示词开头都带 `[STYLE] [CHARACTER] [RULES] Vertical 9:16 full-bleed scene. Outfit: white cropped tank top, high-waisted denim shorts, white sneakers.`

| 文件 | 关卡 | 场景提示词（接在开头后面） |
|---|---|---|
| `photo5.png` | 6 | `She leans on the door of a generic vintage pink convertible with no badges and no logos on a coastal highway at sunset, sunglasses on, looking back over her shoulder with a confident smile.` |
| `photo6.png` | 7 | `Dusk at a retro roadside gas station glowing with pink and cyan neon made only of abstract shapes, no readable text. She leans against a pump, sipping a soda through a straw, raising one eyebrow at the viewer.` |
| `photo7.png` | 8 | `She sits on the hood of the pink convertible parked on a palm-lined road, knees up, arms around them, laughing at something off-camera. Long shadows, purple sky.` |
| `photo8.png` | 9 | `She stands at a cliffside ocean overlook, wind lifting her hair, pushing her heart sunglasses up onto her head and smiling at the viewer. The highway curves along the coast behind her.` |

**video2.mp4 · 第 10 关《Sunset Drive》**（首帧用 photo5）

| 时间 | 画面 | 镜头 |
|---|---|---|
| 0–2 秒 | 和 photo5 一样：她靠在粉色敞篷车边，回头看镜头 | 静止，慢慢推近 |
| 2–4 秒 | 她把心形太阳镜从头顶拉下来戴上，冲镜头眨一下眼 | 推到半身 |
| 4–6 秒 | 她跳进驾驶座，发丝在风里飘，回头对镜头飞吻 | 镜头跟着她右移 |
| 6–8 秒 | 敞篷车沿海岸公路开向夕阳，留下两道粉色尾灯光带 | 拉远到全景，定格 |

```
[STYLE] [CHARACTER] [RULES]
8-second vertical video starting from this image. She pulls her pink heart sunglasses
down over her eyes, winks at the camera, hops into the driver's seat of the pink
convertible, blows a kiss over her shoulder, and drives off along the coastal highway
into the sunset, leaving two pink tail-light streaks. Smooth cinematic camera: slow
push-in, then track right, then pull back to a wide shot. Consistent face and hair,
natural motion, no text, no logos.
```

### 第 3、4 组（关卡做出来后再出图，先记下方向）
- **第 3 组 霓虹栈道**（服装：亮片青绿色短裙 + 短款牛仔外套 + 金色凉鞋）：抱着娃娃奖品大笑、在街机前比耶、
  坐在摩天轮车厢里看夜景、栈道栏杆边吹海风。视频：她赢下套圈游戏，把奖品抛向镜头。
- **第 4 组 屋顶泳池**（服装：珊瑚色连体泳衣 + 白色半透明罩衫）：坐在泳池边举起水果无酒精饮料、
  靠在泳池边缘看城市夜景、躺在充气火烈鸟上、披着毛巾在灯串下跳舞。视频：她在泳池边转身，
  把毛巾甩到肩上，冲镜头挥手道别，画面拉远到城市天际线，结束第 1 章。

## 6. 交付方式
1. 把 4K 母版按上面的文件名放进 `assets-src/ch1/`，表情放 `assets-src/ch1/girl/`。
2. 在项目目录运行 `tools/assets.sh ch1`。脚本会生成游戏用的压缩版本（立绘 WebP 高 1600 像素，
   照片 WebP 1440×2560，视频原样复制），放进 `assets/ch1/`。视频按 `video1.mp4`、`video2.mp4` 命名。
3. 告诉我一声，我把 `src/chapters.js` 里的占位图换成正式图。

## 7. 验收清单
- [ ] 所有图里是同一张脸：雀斑、眼睛颜色、发色、耳环、心形太阳镜都一致
- [ ] 6 个表情叠在一起切换时身体不跳动
- [ ] 手指数量正确，没有多余或融化的手指
- [ ] 画面里没有任何文字、Logo、车标、品牌
- [ ] 一眼看上去是成年人
- [ ] 没有内衣、裸露、性暗示姿势；泳装只出现在海滩、泳池场景
- [ ] 不像任何真人或已有游戏角色
