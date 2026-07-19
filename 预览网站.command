#!/bin/zsh
set -e
cd "$(dirname "$0")"

if [ ! -d node_modules ]; then
  npm install
fi

echo "LONFRO 本地预览正在启动"
echo "请在浏览器打开 http://localhost:4321"
npm run dev -- --host 0.0.0.0
