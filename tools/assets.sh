#!/bin/zsh
# 把 4K 母版转成游戏用的版本：tools/assets.sh ch1
#   assets-src/<章>/girl/*.png  → assets/<章>/girl/*.webp（高 1080 像素，保留透明）
#   assets-src/<章>/photo*.png|jpg → assets/<章>/photo*.webp（1440×2560）
#   assets-src/<章>/video*.mp4  → assets/<章>/video*.mp4（原样复制）
set -e
DIR=${0:A:h}/..
FF=$DIR/.tools/ffmpeg
CH=${1:?用法：tools/assets.sh ch1}
SRC=$DIR/assets-src/$CH OUT=$DIR/assets/$CH
mkdir -p $OUT/girl
for f in $SRC/girl/*.(png|PNG)(N); do
  n=${${f:t}:r}
  $FF -loglevel error -y -i $f -vf "scale=-2:1080:flags=lanczos" -c:v libwebp -lossless 0 -quality 86 -alpha_quality 90 $OUT/girl/$n.webp
  echo "立绘 $n → $(du -h $OUT/girl/$n.webp | cut -f1)"
done
# 立绘轮廓（棋盘避让用）：每张立绘切成 10 条横带，取透明通道里不透明部分的左右边界，所有表情取并集
# 立绘必须是 3:4 竖图（和 .girl 框一样的比例），否则轮廓会对不上
if [[ -n $(echo $OUT/girl/*.webp(N)) ]]; then
  MASK=$(for f in $OUT/girl/*.webp; do
    read -r w h <<< $($FF -hide_banner -i $f 2>&1 | grep -o ', [0-9]*x[0-9]*' | head -1 | tr -d ', ' | tr x ' ')
    bh=$((h / 10))
    for b in {0..9}; do
      $FF -hide_banner -i $f -vf "alphaextract,crop=$w:$bh:0:$((b * bh)),bbox=min_val=40" -f null - 2>&1 \
        | grep -o "x1:[0-9]* x2:[0-9]*" | tail -1 | sed "s/x1://; s/x2://; s/^/$b $w /"
    done
  done | python3 -c '
import sys
lo, hi = {}, {}
for line in sys.stdin:
    b, w, a, c = map(int, line.split())
    lo[b] = min(lo.get(b, w), a / w); hi[b] = max(hi.get(b, 0), (c + 1) / w)
print("[" + ", ".join("[%s, %s]" % (round(lo.get(b, 0), 3), round(hi.get(b, 0), 3)) for b in range(10)) + "]")')
  echo "立绘轮廓 mask（贴到 src/chapters.js 这一章的 girl.mask）：$MASK"
fi
for f in $SRC/photo*.(png|PNG|jpg|JPG|jpeg)(N); do
  n=${${f:t}:r}
  $FF -loglevel error -y -i $f -vf "scale=1440:2560:force_original_aspect_ratio=increase:flags=lanczos,crop=1440:2560" -c:v libwebp -quality 88 $OUT/$n.webp
  echo "照片 $n → $(du -h $OUT/$n.webp | cut -f1)"
done
for f in $SRC/video*.mp4(N); do cp $f $OUT/${f:t}; echo "视频 ${f:t} → $(du -h $OUT/${f:t} | cut -f1)"; done
echo "完成。把 src/chapters.js 里对应的占位路径换成新文件即可。"
