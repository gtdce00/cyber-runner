#!/usr/bin/env bash
# Install Cyber Runner on this Linux user account
set -euo pipefail

SRC="$(cd "$(dirname "$0")" && pwd)"
if [[ ! -f "$SRC/index.html" ]]; then
  echo "index.html not found next to install.sh"
  exit 1
fi

DEST="${XDG_DATA_HOME:-$HOME/.local/share}/CyberRunner"
APPDIR="${XDG_DATA_HOME:-$HOME/.local/share}/applications"
ICON="$DEST/assets/ui/game-icon.png"

mkdir -p "$DEST" "$APPDIR"
# Copy game files (skip git / junk)
if command -v rsync >/dev/null 2>&1; then
  rsync -a --delete --exclude '.git' --exclude 'node_modules' "$SRC/" "$DEST/"
else
  find "$DEST" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
  cp -a "$SRC"/. "$DEST/"
  rm -rf "$DEST/.git" "$DEST/node_modules"
fi
chmod +x "$DEST/play.sh" "$DEST/install.sh" 2>/dev/null || true

DESKTOP_FILE="$APPDIR/cyber-runner.desktop"
cat > "$DESKTOP_FILE" <<EOF
[Desktop Entry]
Type=Application
Version=1.0
Name=Cyber Runner
Name[th]=Cyber Runner
Comment=Run, think, answer — computer science game
Comment[th]=วิ่ง คิด ตอบ พิชิตโลกคอมพิวเตอร์
Exec=bash "$DEST/play.sh"
Path=$DEST
Icon=$ICON
Terminal=false
StartupNotify=true
Categories=Game;Education;
Keywords=science;computer;quiz;
EOF
chmod +x "$DESKTOP_FILE"

# Desktop shortcut if a Desktop folder exists
if command -v xdg-user-dir >/dev/null 2>&1; then
  DESKTOP_DIR="$(xdg-user-dir DESKTOP)"
else
  DESKTOP_DIR="$HOME/Desktop"
  [[ -d "$HOME/เดสก์ท็อป" ]] && DESKTOP_DIR="$HOME/เดสก์ท็อป"
fi
if [[ -d "$DESKTOP_DIR" ]]; then
  cp "$DESKTOP_FILE" "$DESKTOP_DIR/cyber-runner.desktop"
  chmod +x "$DESKTOP_DIR/cyber-runner.desktop"
  if command -v gio >/dev/null 2>&1; then
    gio set "$DESKTOP_DIR/cyber-runner.desktop" metadata::trusted true 2>/dev/null || true
  fi
fi

if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database "$APPDIR" >/dev/null 2>&1 || true
fi

echo "Install complete."
echo "Game folder: $DEST"
echo "Click Cyber Runner in the app menu, or the desktop icon."
echo "Launching..."
bash "$DEST/play.sh"
