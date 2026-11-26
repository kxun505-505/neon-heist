#!/bin/zsh
# 把 4K 母版转成游戏用的版本：tools/assets.sh ch1
#   assets-src/<章>/girl/*.png  → assets/<章>/girl/*.webp（高 1600 像素，保留透明）
#   assets-src/<章>/photo*.png|jpg → assets/<章>/photo*.webp（1440×2560）
#   assets-src/<章>/video.mp4   → assets/<章>/video.mp4（原样复制）
set -e
DIR=${0:A:h}/..
FF=$DIR/.tools/ffmpeg
CH=${1:?用法：tools/assets.sh ch1}
SRC=$DIR/assets-src/$CH OUT=$DIR/assets/$CH
mkdir -p $OUT/girl
for f in $SRC/girl/*.(png|PNG)(N); do
  n=${${f:t}:r}
  $FF -loglevel error -y -i $f -vf "scale=-2:1600:flags=lanczos" -c:v libwebp -lossless 0 -quality 90 -alpha_quality 95 $OUT/girl/$n.webp
  echo "立绘 $n → $(du -h $OUT/girl/$n.webp | cut -f1)"
done
for f in $SRC/photo*.(png|PNG|jpg|JPG|jpeg)(N); do
  n=${${f:t}:r}
  $FF -loglevel error -y -i $f -vf "scale=1440:2560:force_original_aspect_ratio=increase:flags=lanczos,crop=1440:2560" -c:v libwebp -quality 88 $OUT/$n.webp
  echo "照片 $n → $(du -h $OUT/$n.webp | cut -f1)"
done
[ -f $SRC/video.mp4 ] && cp $SRC/video.mp4 $OUT/video.mp4 && echo "视频 → $(du -h $OUT/video.mp4 | cut -f1)"
echo "完成。把 src/chapters.js 里对应的 .svg 改成 .webp（视频填 'assets/$CH/video.mp4'）即可。"
