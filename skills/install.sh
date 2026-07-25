#!/usr/bin/env bash
# Ставит скиллы RepoMind в проект.
#
#   ./install.sh /путь/к/проекту
#   ./install.sh                  # в текущую папку
#
# Идемпотентно: существующие скиллы не перезаписывает (для этого --force).

set -euo pipefail

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FORCE=0
TARGET=""

for arg in "$@"; do
  case "$arg" in
    --force) FORCE=1 ;;
    -h|--help) sed -n '2,7p' "$0" | sed -e 's/^# //' -e 's/^#$//'; exit 0 ;;
    *) TARGET="$arg" ;;
  esac
done

TARGET="${TARGET:-$PWD}"
[ -d "$TARGET" ] || { echo "нет такой папки: $TARGET" >&2; exit 1; }
TARGET="$(cd "$TARGET" && pwd)"

[ "$SRC" != "$TARGET/skills" ] || { echo "источник и цель совпадают" >&2; exit 1; }

mkdir -p "$TARGET/.agents/skills" "$TARGET/.claude/skills"

for dir in "$SRC"/*/; do
  name="$(basename "$dir")"
  dest="$TARGET/.agents/skills/$name"

  if [ -e "$dest" ] && [ "$FORCE" -eq 0 ]; then
    echo "=  $name — уже есть, пропускаю"
  else
    rm -rf "$dest"
    cp -R "$dir" "$dest"
    echo "+  $name"
  fi

  # Claude Code читает .claude/skills, Codex — .agents/skills.
  # Держим один настоящий файл и ссылку на него.
  link="$TARGET/.claude/skills/$name"
  if [ -L "$link" ] || [ ! -e "$link" ]; then
    rm -f "$link"
    if ln -s "../../.agents/skills/$name" "$link" 2>/dev/null; then
      :
    else
      cp -R "$dest" "$link"   # Windows без прав на symlink
      echo "   (symlink недоступен — скопировал)"
    fi
  fi
done

cat <<EOF

Готово. Дальше — в Claude Code или Codex из папки проекта:

    /docs-init

Агент осмотрит проект и развернёт структуру памяти.
EOF
