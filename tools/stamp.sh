#!/bin/zsh
# 给 index.html 里的 style.css 和 src/*.js 加上版本号（?v=时间戳），发布后手机不会继续用缓存里的旧文件。
# GitHub Pages 的缓存是 max-age=600（10 分钟）。用法：在要发布的分支上运行，然后提交 index.html。
set -e
cd ${0:A:h:h}
V=$(date +%m%d%H%M)
sed -i '' -E "s#href=\"style.css(\?v=[0-9]+)?\"#href=\"style.css?v=$V\"#; s#src=\"(src/[a-z0-9-]+\.js)(\?v=[0-9]+)?\"#src=\"\1?v=$V\"#g" index.html
echo "版本号 $V"
