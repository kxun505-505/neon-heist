#!/usr/bin/env python3
"""
生成给 GPT 的出图任务包：handoff/gpt-ch1/（00_READ_ME_FIRST.md + tasks/*.md + refs/ + out/），再打成 handoff/NEON-HEIST-ch1-art-tasks.zip。
内容和 docs/ch1-story-pack.md、docs/story.md（v2 第 1 环）一致；改剧情或画风后重新运行：python3 tools/gpt-pack.py
参考图从 assets-src/ 和 docs/img/ 复制进 refs/（assets-src 不进 git，只在用户的 Mac 上）。
"""
import os, shutil, zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = os.path.join(ROOT, 'handoff', 'gpt-ch1')
for sub in ('refs', 'tasks', 'out'):
    os.makedirs(os.path.join(D, sub), exist_ok=True)
for src, dst in (('assets-src/ch1/girl/idle.png', 'kira_idle.png'), ('assets-src/ch1/character-sheet.png', 'kira_character_sheet.png'), ('docs/img/heist-g28-dusk.png', 'game_style.png')):
    shutil.copyfile(os.path.join(ROOT, src), os.path.join(D, 'refs', dst))

STYLE = ("Vertical 9:16 comic illustration, 1080x1920 px. 1980s Miami crime-comic poster style: bold black ink outlines of consistent weight, "
         "flat cel shading with 2-3 hard-edged tones per color (shadows shift toward purple, highlights toward cream), subtle halftone dots in the shadows, light print grain. "
         "Match the ink, colors and lighting of refs/game_style.png. Key light from the upper left (cool sky light); warm sunset rim light (#FFC478 to #FF7832) on the right edges of characters. "
         "Palette limited to hot pink #FF4F9A, coral orange #FF8A4C, sunset yellow #FFC93C, lime #9BE15A, teal #2DD4BF, sky blue #4F9DFF, electric violet #A274FF, plus ink #1A0B2E and cream #FFF4E0. "
         "Original characters and places only. No text, no letters, no speech bubbles, no logos, no brand names, no watermarks. "
         "Keep the top 22% and the bottom 18% of the frame visually calm (sky, wall, floor or soft background) for the game's dialogue bubbles and buttons. "
         "All characters are adults. Stylish and tasteful for a teen-rated mobile game: no nudity, no underwear, no sexualized poses, no blood, no weapons pointed at people.")
SHEET = (STYLE.replace('Vertical 9:16 comic illustration, 1080x1920 px.', 'Horizontal 16:9 character design sheet, 1920x1080 px.')
         .replace(" Keep the top 22% and the bottom 18% of the frame visually calm (sky, wall, floor or soft background) for the game's dialogue bubbles and buttons.", ''))
SHEETS = ['out/nico_sheet.png', 'out/kira_comic_sheet.png', 'refs/game_style.png']

TASKS = [
    ('01_nico_sheet', 'Character sheet: Nico Vale (male lead)', [], 'nico_sheet.png', '1920x1080',
     'Character design turnaround sheet for an original adult male lead, "Nico Vale", 30, a legendary safecracker nicknamed "Ghost", leader of a heist crew. '
     'Front view, 3/4 view, side view, plus 4 facial expressions (calm half-smile, focused while picking a lock, raised-eyebrow amusement, defiant). '
     'Tall, athletic build, handsome. Slightly messy, wavy dark-brown hair; short stubble; warm tan skin; strong jaw; confident relaxed half-smile. '
     'Outfit: unbuttoned pastel-mint linen shirt over a white crew-neck T-shirt, sleeves rolled to the elbows, light sand-colored chinos, brown leather loafers, '
     'gold signet ring on the right hand, aviator sunglasses (shown on and pushed up). No tattoos, no buzz cut, no full beard, no tank top. '
     'He must not resemble any real person or any existing video-game character. Plain cream background.\n\n' + SHEET,
     ['Same face in all views', 'Mint linen shirt, signet ring, aviators', 'No tattoos, no buzz cut, no full beard']),
    ('02_kira_comic_sheet', 'Character sheet: Kira Sol, comic version', ['refs/kira_idle.png', 'refs/kira_character_sheet.png', 'refs/game_style.png'], 'kira_comic_sheet.png', '1920x1080',
     'Character design sheet of the woman in refs/kira_idle.png and refs/kira_character_sheet.png, redrawn in the comic style below. Keep her identity exactly: "Kira Sol", 24, adult. '
     'Long copper-red beach-wave hair to the chest with one strand tucked behind the left ear; light freckles across the nose and cheeks; hazel-green eyes with slightly upturned outer corners; '
     'natural thick brows; full lips with a lopsided smirk (left corner higher). Light golden tan, athletic, 170 cm. '
     'Accessories: pink heart-shaped sunglasses, big gold hoop earrings, a colorful beaded bracelet on the left wrist. No tattoos. '
     'Outfit A (day / bar): teal retro high-waist bikini top under an open white cropped linen shirt with rolled sleeves, high-waist light denim shorts. '
     'Outfit B (night): teal cropped tank top, open white linen shirt, denim shorts, white sneakers. '
     'Front, 3/4 and back views, plus 4 expressions: smirk, laughing, narrowed-eyes suspicious, wink.\n\n' + SHEET,
     ['Clearly the same woman as the references', 'Copper-red hair, freckles, gold hoops, heart sunglasses', 'Both outfits shown']),
    ('03_p01', 'Story page 1 (level 1): flash-forward on the yacht deck', SHEETS, 'p01.png', '1080x1920',
     'Night, the deck of a luxury yacht at sea during a regatta; in the far background a marina burns orange (fire and smoke only, small, nobody hurt) under fireworks. Low camera angle. '
     'Nico (from nico_sheet.png) kneels on one knee in the lower-left, hands bound behind his back with a zip tie, shirt slightly disheveled, jaw set, looking up defiantly. '
     "From the right edge of the frame, only a woman's legs from the knee down step into view: glossy red stiletto heels and the hem of white tailored suit trousers. "
     'Her face and body are NOT shown. Dramatic rim light from the fire. Top 22%: night sky and fireworks. Bottom 18%: teak deck. No blood, no weapons.\n\n' + STYLE,
     ["Only the woman's lower legs and red heels are visible", 'Nico matches his sheet', 'Fire is small and far away']),
    ('04_p02', 'Story page 2 (level 2): public humiliation at the beach bar', SHEETS, 'p02.png', '1080x1920',
     'Golden-hour beach bar, palm-thatched roof, string lights just turning on, huge low sun over the sea. '
     'Center-right: a smug club owner in a loud floral silk shirt and gold chain (Dorian, 40s, slicked-back hair) has just splashed a drink across the bar; '
     "liquid in mid-air splashes onto Kira's shirt (Outfit A from kira_comic_sheet.png) as she stands behind the bar, chin up, eyes cold, refusing to flinch. "
     'Lower-left foreground: Nico at the bar, 3/4 back view, aviators on, not even turning his head, calmly holding his glass. A few blurred guests watching. '
     'In the foreground on the bar top, a cocktail napkin with an abstract pink lipstick scribble (no readable letters). Top 22%: sky and string lights. Bottom 18%: bar top.\n\n' + STYLE,
     ['Kira is defiant, not a victim', 'Napkin scribble has no readable text', 'Kira and Nico match their sheets']),
    ('05_p03', 'Story page 3 (level 3): midnight at Pier 9', SHEETS, 'p03.png', '1080x1920',
     'Midnight on an old wooden pier, neon signs of the coast glowing far behind across the water, moonlight. '
     'Kira (Outfit B from kira_comic_sheet.png) leans against the hood of her pink vintage convertible on the right, arms crossed, sunglasses pushed up on her head, '
     'holding up her wristwatch as if timing him, playful challenge on her face. In the center foreground, a wooden crate wrapped in a heavy chain with a big padlock; '
     'Nico kneels beside it on one knee, working the padlock with lock picks, calm and focused, aviators hanging from his shirt. Low camera angle. '
     'Top 22%: night sky. Bottom 18%: pier planks.\n\n' + STYLE,
     ['Pink vintage convertible', 'Chain and big padlock on the crate', 'Both characters match their sheets']),
    ('06_p04', 'Story page 4 (level 4): the crate opens', SHEETS + ['out/p03.png'], 'p04.png', '1080x1920',
     'Same pier at night as p03.png, closer shot. The crate is open: inside, a rolled blueprint of a nightclub and an old wanted-style photo print of a younger Nico, '
     'with a blank area on it (the game adds the text). Kira (Outfit B) stands very close to Nico, face to face, one fingertip touching the center of his chest, '
     'a confident, slightly dangerous smile; Nico looks down at her with a guarded half-smile. Far in the background between them, a pair of car headlights has just switched on '
     'at the end of the pier (small, bright, ominous). Romantic tension but fully clothed and tasteful. Top 22%: night sky. Bottom 18%: pier and crate edge.\n\n' + STYLE,
     ['Same location as p03', 'Car headlights in the far background', 'Tasteful, fully clothed']),
    ('07_video01', 'Video 1 (level 5): the getaway, 10-12 s', SHEETS + ['out/p04.png'], 'v01.mp4', '1080x1920, 10-12 s, MP4 H.264, under 8 MB, no music',
     'Motion-comic animation in the style of p04.png, vertical 9:16, 10-12 seconds. Keep both characters identical to their sheets. '
     'No text, no logos, no blood, no weapons, no music (engine and tire sounds are fine).\n\n'
     'Shot 1 (0-2 s): continuing from p04.png, the car headlights at the end of the pier flare up and a black SUV charges forward. Kira and Nico turn their heads at the same time.\n'
     'Shot 2 (2-5 s): Kira grabs Nico\'s hand and they vault into her pink convertible; she shifts gear, tires smoke.\n'
     "Shot 3 (5-8 s): neon coastal highway, side tracking shot: the convertible drifts past traffic, the SUV close behind; Kira's hair flies in the wind, she is laughing; Nico grips the door.\n"
     'Shot 4 (8-10 s): the convertible slips into a narrow alley and kills its lights; the SUV roars past the alley mouth. Silence.\n'
     'Shot 5 (10-12 s): inside the car, Kira turns to the camera and winks. Last frame: cut to the alley mouth, a hand in the SUV window holds up a phone taking a photo; '
     'the phone screen shows only the single letter "V".\n\n'
     'If you cannot make video, make 5 keyframe images (1080x1920) for the 5 shots instead, named out/v01_shot1.png ... out/v01_shot5.png.',
     ['Comic style matches the pages', 'Ends on the phone showing "V"', 'No weapons']),
    ('08_expr_smirk', 'Portrait expression: smirk (in-game companion)', ['refs/kira_idle.png'], 'smirk.png', '2160x2880, transparent background',
     'Edit refs/kira_idle.png. Keep the body, outfit, pose, canvas size (2160x2880), position, scale, art style and lighting EXACTLY the same, '
     'so the two images line up outside the face and hand. Change only the face and one hand: a cocky smirk (left mouth corner up), one eyebrow raised, '
     "eyes slightly narrowed, one hand's fingers pulling her pink heart sunglasses down her nose. Transparent background. "
     'Same painting style as kira_idle.png, NOT the comic style.',
     ['Lines up with kira_idle.png when stacked', 'Transparent background', 'Same painting style as the original']),
    ('09_expr_excited', 'Portrait expression: excited (in-game companion)', ['refs/kira_idle.png'], 'excited.png', '2160x2880, transparent background',
     'Edit refs/kira_idle.png. Keep the body, outfit, canvas size (2160x2880), position, scale, art style and lighting EXACTLY the same, '
     'so the two images line up outside the face, hands and shoulders. Change only the face and hands: an open-mouth excited laugh, eyes squeezed into happy crescents, '
     'both fists clenched near her chest in a little victory cheer, shoulders slightly raised. Transparent background. '
     'Same painting style as kira_idle.png, NOT the comic style.',
     ['Lines up with kira_idle.png when stacked', 'Transparent background', 'Same painting style as the original']),
]

for name, title, inputs, out, size, prompt, checks in TASKS:
    with open(os.path.join(D, 'tasks', name + '.md'), 'w') as f:
        f.write('# Task %s: %s\n\n' % (name[:2], title))
        f.write('**Attach / use:** %s\n\n' % (', '.join(inputs) if inputs else 'nothing (draw from scratch)'))
        f.write('**Output file:** `out/%s` (%s)\n\n## Prompt\n\n%s\n\n## Check before moving on\n\n' % (out, size, prompt))
        f.write(''.join('- %s\n' % c for c in checks))

rows = ''.join('| %s | tasks/%s.md | out/%s |\n' % (n[:2], n, o) for n, _, _, o, _, _, _ in TASKS)
README = '''# NEON HEIST · Chapter 1 story sample · art tasks

> 给用户：把整个压缩包上传给 GPT，发一句「Please read 00_READ_ME_FIRST.md and do the tasks in order.」就行。
> 如果 GPT 说它看不到压缩包里的图片，就把 refs 文件夹里的 3 张图直接拖进对话框。
> 全部做完后，让 GPT 把 out 文件夹打包给你，你再发给我。

You are the illustrator for an original mobile puzzle game, NEON HEIST. Please produce the images in `tasks/`, **one task at a time, in order (01 -> 09)**.

## Rules for every task
1. Read the task file and use exactly the listed images as references. Files named `out/...` are images you made in earlier tasks: always use them again, so faces and outfits stay consistent.
2. Use the prompt in the task file as written. It already contains the full style description.
3. Make one image per task. Before moving on, check the list at the bottom of the task file and fix anything that fails. When fixing, keep the characters and change only what is wrong; do not redraw from scratch.
4. Save each result with the exact file name given (`out/...`). When all tasks are done, return a zip of the `out/` folder.
5. Never draw text, logos or brand names. Never reference or imitate any existing video game, especially not Grand Theft Auto or any Rockstar game, its characters, logos or fonts.
6. Tasks 01-07 are comic style. Tasks 08-09 must keep the painting style of `refs/kira_idle.png` (portraits for the in-game companion).

## Reference files
- `refs/kira_idle.png`: the female lead, Kira Sol (painted portrait, 2160x2880, transparent).
- `refs/kira_character_sheet.png`: Kira's full character sheet.
- `refs/game_style.png`: a screenshot of the game. Match its ink lines, colors and lighting in the comic pages.

## Tasks
| # | File | Output |
|---|---|---|
''' + rows
with open(os.path.join(D, '00_READ_ME_FIRST.md'), 'w') as f:
    f.write(README)
open(os.path.join(D, 'out', '.keep'), 'w').close()

zpath = os.path.join(ROOT, 'handoff', 'NEON-HEIST-ch1-art-tasks.zip')
with zipfile.ZipFile(zpath, 'w', zipfile.ZIP_DEFLATED) as z:
    for base, _, files in os.walk(D):
        for fn in sorted(files):
            if fn == '.DS_Store':
                continue
            p = os.path.join(base, fn)
            z.write(p, os.path.relpath(p, os.path.dirname(D)))
print(zpath, round(os.path.getsize(zpath) / 1e6, 1), 'MB')
