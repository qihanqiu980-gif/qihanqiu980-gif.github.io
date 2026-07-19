#!/bin/zsh

set -u

PROJECT_DIR="${0:A:h:h}"
RUNTIME_DIR="$PROJECT_DIR/.mobile-preview"
DIST_DIR="$PROJECT_DIR/dist"
PORT=8000
LOCAL_URL="http://127.0.0.1:${PORT}/products/"
CLOUDFLARED="$RUNTIME_DIR/bin/cloudflared"
URL_FILE="$RUNTIME_DIR/public-url.txt"
ADDRESS_FILE="$PROJECT_DIR/手机访问地址.txt"
SERVER_LOG="$RUNTIME_DIR/server.log"
TUNNEL_LOG="$RUNTIME_DIR/tunnel.log"
TUNNEL_CURRENT_LOG="$RUNTIME_DIR/tunnel-current.log"
SERVER_PID_FILE="$RUNTIME_DIR/server.pid"
TUNNEL_PID_FILE="$RUNTIME_DIR/tunnel.pid"

mkdir -p "$RUNTIME_DIR"

log() {
  printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$1" >> "$RUNTIME_DIR/supervisor.log"
}

stop_pid_file() {
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

cleanup() {
  log "正在停止手机公网预览"
  stop_pid_file "$TUNNEL_PID_FILE"
  stop_pid_file "$SERVER_PID_FILE"
  rm -f "$URL_FILE"
}

shutdown() {
  trap - INT TERM EXIT
  cleanup
  exit 0
}

trap shutdown INT TERM
trap cleanup EXIT

ensure_server() {
  if curl -fsS --max-time 5 "$LOCAL_URL" >/dev/null 2>&1; then
    return 0
  fi

  if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
    log "端口 $PORT 已被其他程序占用，且产品页无法访问"
    return 1
  fi

  if [ ! -d "$DIST_DIR" ]; then
    log "未找到 dist，请先运行‘更新并生成网站.command’"
    return 1
  fi

  log "启动静态网站服务器：http://127.0.0.1:$PORT"
  python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$DIST_DIR" >> "$SERVER_LOG" 2>&1 &
  local server_pid=$!
  printf '%s\n' "$server_pid" > "$SERVER_PID_FILE"

  local attempt
  for attempt in {1..20}; do
    if curl -fsS --max-time 3 "$LOCAL_URL" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done

  log "静态网站服务器启动失败"
  return 1
}

publish_url() {
  local base_url="$1"
  local products_url="${base_url}/products/"
  local tmp_url="$URL_FILE.tmp"
  local tmp_address="$ADDRESS_FILE.tmp"

  printf '%s\n' "$products_url" > "$tmp_url"
  mv "$tmp_url" "$URL_FILE"

  {
    printf 'LONFRO 手机端产品页\n'
    printf '%s\n\n' "$products_url"
    printf '此地址由 Cloudflare 临时公网隧道提供。重连后地址可能变化，请以本文件中的最新地址为准。\n'
    printf 'Mac 需要保持开机和联网；后台脚本会阻止系统自动休眠并尝试断线重连。\n'
  } > "$tmp_address"
  mv "$tmp_address" "$ADDRESS_FILE"

  log "公网地址已更新：$products_url"
  osascript -e "display notification \"$products_url\" with title \"LONFRO 手机访问地址已更新\"" >/dev/null 2>&1 || true
}

log "手机公网预览守护程序已启动"

while true; do
  if [ ! -x "$CLOUDFLARED" ]; then
    log "未找到 cloudflared，请重新运行‘启动手机公网预览.command’"
    exit 1
  fi

  if ! ensure_server; then
    sleep 5
    continue
  fi

  rm -f "$URL_FILE"
  : > "$TUNNEL_CURRENT_LOG"
  log "正在连接公网隧道"

  caffeinate -dimsu "$CLOUDFLARED" tunnel \
    --url "http://127.0.0.1:$PORT" \
    --protocol http2 \
    --no-autoupdate > "$TUNNEL_CURRENT_LOG" 2>&1 &

  tunnel_pid=$!
  printf '%s\n' "$tunnel_pid" > "$TUNNEL_PID_FILE"
  public_base=""
  failed_checks=0

  while kill -0 "$tunnel_pid" 2>/dev/null; do
    if [ -z "$public_base" ]; then
      public_base="$(LC_ALL=C grep -Eo 'https://[[:alnum:]-]+\.trycloudflare\.com' "$TUNNEL_CURRENT_LOG" 2>/dev/null | tail -1 || true)"
      if [ -n "$public_base" ]; then
        publish_url "$public_base"
        cat "$TUNNEL_CURRENT_LOG" >> "$TUNNEL_LOG"
      fi
    else
      status_code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 12 "${public_base}/products/" 2>/dev/null || true)"
      if [ "$status_code" = "200" ]; then
        failed_checks=0
      else
        failed_checks=$((failed_checks + 1))
        log "公网健康检查失败（HTTP ${status_code:-000}，第 $failed_checks 次）"
      fi

      if [ "$failed_checks" -ge 3 ]; then
        log "公网地址连续三次不可用，正在自动重连"
        kill "$tunnel_pid" 2>/dev/null || true
        break
      fi
    fi

    if ! curl -fsS --max-time 5 "$LOCAL_URL" >/dev/null 2>&1; then
      log "本地静态服务器不可用，正在重启"
      stop_pid_file "$SERVER_PID_FILE"
      kill "$tunnel_pid" 2>/dev/null || true
      break
    fi

    sleep 10
  done

  wait "$tunnel_pid" 2>/dev/null || true
  rm -f "$TUNNEL_PID_FILE" "$URL_FILE"
  cat "$TUNNEL_CURRENT_LOG" >> "$TUNNEL_LOG" 2>/dev/null || true
  log "公网隧道已断开，3 秒后重连"
  sleep 3
done
