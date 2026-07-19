#!/bin/zsh
set -e
cd "$(dirname "$0")"

if [ ! -d node_modules ]; then
  npm install
fi

echo "正在读取 Excel、更新产品图片并生成静态网站"
npm run build
echo "生成完成：$(pwd)/dist"
open dist
