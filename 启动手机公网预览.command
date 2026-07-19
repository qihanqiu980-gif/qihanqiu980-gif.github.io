#!/bin/zsh

set -u

cd "$(dirname "$0")"

RUNTIME_DIR="$PWD/.mobile-preview"
SUPERVISOR="$PWD/scripts/mobile-preview-supervisor.sh"
SUPERVISOR_PID_FILE="$RUNTIME_DIR/supervisor.pid"
URL_FILE="$RUNTIME_DIR/public-url.txt"
CLOUDFLARED="$RUNTIME_DIR/bin/cloudflared"

mkdir -p "$RUNTIME_DIR/bin"

if [ ! -x "$CLOUDFLARED" ]; then
  echo "首次使用：正在安装 Cloudflare 公网隧道组件……"
  case "$(uname -m)" in
    arm64) cloudflared_archive="cloudflared-darwin-arm64.tgz" ;;
    x86_64) cloudflared_archive="cloudflared-darwin-amd64.tgz" ;;
    *)
      echo "暂不支持当前 Mac 架构：$(uname -m)"
      read "?按回车键关闭窗口。" || true
      exit 1
      ;;
  esac

  archive_path="$RUNTIME_DIR/$cloudflared_archive"
  if ! curl -fL --retry 3 --connect-timeout 15 \
    "https://github.com/cloudflare/cloudflared/releases/latest/download/$cloudflared_archive" \
    -o "$archive_path"; then
    echo "公网隧道组件下载失败，请检查网络后重试。"
    read "?按回车键关闭窗口。" || true
    exit 1
  fi

  if ! tar -xzf "$archive_path" -C "$RUNTIME_DIR/bin"; then
    echo "公网隧道组件解压失败。"
    read "?按回车键关闭窗口。" || true
    exit 1
  fi
  rm -f "$archive_path"
  chmod +x "$CLOUDFLARED"
fi

if [ ! -d dist ]; then
  echo "未找到静态网站，正在生成……"
  npm run build || {
    echo "网站生成失败，请检查上面的错误信息。"
    read "?按回车键关闭窗口。"
    exit 1
  }
fi

supervisor_running=false
if [ -f "$SUPERVISOR_PID_FILE" ]; then
  supervisor_pid="$(cat "$SUPERVISOR_PID_FILE" 2>/dev/null || true)"
  if [ -n "$supervisor_pid" ] && kill -0 "$supervisor_pid" 2>/dev/null; then
    supervisor_running=true
  fi
fi

if [ "$supervisor_running" = false ]; then
  rm -f "$URL_FILE" "$SUPERVISOR_PID_FILE"
  nohup "$SUPERVISOR" >> "$RUNTIME_DIR/launcher.log" 2>&1 &
  supervisor_pid=$!
  printf '%s\n' "$supervisor_pid" > "$SUPERVISOR_PID_FILE"
  echo "正在启动静态网站和公网隧道……"
else
  echo "手机公网预览已经在后台运行，正在读取当前地址……"
fi

products_url=""
for attempt in {1..60}; do
  if [ -f "$URL_FILE" ]; then
    products_url="$(head -1 "$URL_FILE" 2>/dev/null || true)"
    if [ -n "$products_url" ]; then
      status_code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 10 "$products_url" 2>/dev/null || true)"
      if [ "$status_code" = "200" ]; then
        break
      fi
    fi
  fi
  sleep 1
done

if [ -n "$products_url" ] && [ "${status_code:-}" = "200" ]; then
  printf '%s' "$products_url" | pbcopy
  echo ""
  echo "手机端产品页已可访问（HTTP 200）："
  echo "$products_url"
  echo ""
  echo "地址已复制到剪贴板，并写入："
  echo "$PWD/手机访问地址.txt"
  echo ""
  echo "Mac 请保持开机和联网。后台会阻止自动休眠，并在隧道断线后尝试重连。"
  echo "注意：Cloudflare 临时隧道重连后可能更换网址，请以‘手机访问地址.txt’为准。"
  open "$products_url"
else
  echo ""
  echo "公网隧道暂未取得可用地址。请稍后再次双击本脚本。"
  echo "诊断日志：$RUNTIME_DIR/supervisor.log"
fi

echo ""
read "?按回车键关闭此窗口；后台预览会继续运行。" || true
