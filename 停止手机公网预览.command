#!/bin/zsh

set -u

cd "$(dirname "$0")"

RUNTIME_DIR="$PWD/.mobile-preview"

stop_from_file() {
  local pid_file="$1"
  if [ -f "$pid_file" ]; then
    local pid
    pid="$(cat "$pid_file" 2>/dev/null || true)"
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
    fi
    rm -f "$pid_file"
  fi
}

stop_from_file "$RUNTIME_DIR/supervisor.pid"
sleep 1
stop_from_file "$RUNTIME_DIR/tunnel.pid"
stop_from_file "$RUNTIME_DIR/server.pid"
rm -f "$RUNTIME_DIR/public-url.txt"

echo "手机公网预览已停止。"
read "?按回车键关闭窗口。" || true
