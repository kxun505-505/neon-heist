#!/bin/zsh
# 截海报风效果图：tools/mockup/shot.sh [输出.png]（1170×2532，iPhone 3 倍）
set -e
DIR=${0:A:h}
OUT=${1:-$DIR/poster-28.png}
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PROFILE=$(mktemp -d /tmp/rr-chrome.XXXXXX)
trap 'rm -r "$PROFILE" 2>/dev/null' EXIT
"$CHROME" --headless=new --disable-gpu --allow-file-access-from-files --user-data-dir="$PROFILE" --no-first-run --hide-scrollbars \
  --force-device-scale-factor=3 --window-size=500,844 --virtual-time-budget=4000 --screenshot="$OUT" "file://$DIR/poster.html" >/dev/null 2>&1
FF=${DIR:h:h}/.tools/ffmpeg; "$FF" -loglevel error -y -i "$OUT" -vf crop=1170:2532:0:0 "$OUT.tmp.png" && mv "$OUT.tmp.png" "$OUT"
echo "$OUT"
