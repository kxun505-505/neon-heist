#!/bin/zsh
# 用本机 Chrome 无头模式跑关卡求解器，输出每关最少步数等信息
# 用法：tools/verify.sh [页面名，默认 verify.html]
set -e
DIR=${0:A:h}
PAGE=${1:-verify.html}
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
# 每次运行用独立的临时配置目录，避免多个实例抢同一个配置锁而卡住
PROFILE=$(mktemp -d /tmp/rr-chrome.XXXXXX)
trap 'rm -r "$PROFILE" 2>/dev/null' EXIT
"$CHROME" --headless=new --disable-gpu --allow-file-access-from-files --user-data-dir="$PROFILE" --no-first-run \
  --virtual-time-budget=${BUDGET:-120000} --dump-dom "file://$DIR/$PAGE" 2>/dev/null \
  | python3 -c '
import sys, html
s = html.unescape(sys.stdin.read())
a = s.find("<pre id=\"out\">") + len("<pre id=\"out\">")
print(s[a:s.find("</pre>", a)])'
