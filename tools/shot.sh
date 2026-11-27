#!/bin/zsh
# 在参考屏（390×844）上截一关的图：tools/shot.sh 关卡号 [输出.png] [额外参数，比如 react=hint]
# 需要本机装了 Google Chrome。输出默认 /tmp/neon-shot-<关卡号>.png
set -e
DIR=${0:A:h}
N=${1:?用法：tools/shot.sh 关卡号 [输出.png] [额外参数]}
OUT=${2:-/tmp/neon-shot-$N.png}
EXTRA=${3:+&$3}
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
[ -x "$CHROME" ] || CHROME=$(command -v google-chrome || command -v chromium || command -v chromium-browser)
PROFILE=$(mktemp -d /tmp/rr-chrome.XXXXXX)
trap 'rm -r "$PROFILE" 2>/dev/null' EXIT
"$CHROME" --headless=new --disable-gpu --allow-file-access-from-files --user-data-dir="$PROFILE" --no-first-run --hide-scrollbars \
  --window-size=390,844 --virtual-time-budget=${BUDGET:-3000} --screenshot="$OUT" "file://$DIR/shot.html?unlock&level=$N$EXTRA" >/dev/null 2>&1
echo "$OUT"
