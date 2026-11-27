#!/bin/zsh
# 用 tools/icon.html 生成应用图标：icon.png（180，网页 / iOS 主屏）和 store-icon-512.png（Google Play 商店）
set -e
DIR=${0:A:h}; ROOT=${DIR:h}
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
for S OUT in 180 "$ROOT/icon.png" 512 "$ROOT/store-icon-512.png"; do
  PROFILE=$(mktemp -d /tmp/rr-chrome.XXXXXX)
  "$CHROME" --headless=new --disable-gpu --user-data-dir="$PROFILE" --no-first-run --hide-scrollbars \
    --window-size=$S,$S --screenshot="$OUT" "file://$DIR/icon.html?s=$S" >/dev/null 2>&1
  rm -r "$PROFILE"; echo "$OUT"
done
