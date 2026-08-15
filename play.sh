#!/usr/bin/env bash
# Cyber Runner — Linux launcher (no extra packages required)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
PORT=8765
URL="http://127.0.0.1:${PORT}/index.html"
cd "$ROOT"

port_open() {
  (echo >/dev/tcp/127.0.0.1/"$PORT") >/dev/null 2>&1
}

open_browser() {
  if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$1" >/dev/null 2>&1 || true
  elif command -v gio >/dev/null 2>&1; then
    gio open "$1" >/dev/null 2>&1 || true
  elif command -v sensible-browser >/dev/null 2>&1; then
    sensible-browser "$1" >/dev/null 2>&1 || true
  else
    echo "Open this URL in a browser: $1"
  fi
}

PY=""
if command -v python3 >/dev/null 2>&1; then
  PY=python3
elif command -v python >/dev/null 2>&1; then
  PY=python
fi

if [[ -n "$PY" ]]; then
  if ! port_open; then
    nohup "$PY" -m http.server "$PORT" --bind 127.0.0.1 >/tmp/cyber-runner-server.log 2>&1 &
    sleep 0.6
  fi
  open_browser "$URL"
else
  echo "python3 not found — opening index.html directly"
  open_browser "file://${ROOT}/index.html"
fi
