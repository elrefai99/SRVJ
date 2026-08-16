#!/usr/bin/env bash
set -euo pipefail

# clean all data in cache
echo "🧹 Clearing Redis..."
node scripts/clear-redis.js

REMOVED=(
  "k8s"
  "docs"
  ".claude"
  ".agents"
  ".cursor"
  "mcp"
  ".husky"
  ".github"
  "script"
  ".github"
  "nginx"
  "Dockerfile"
  ".coderabbit.yaml"
  "CLAUDE.md"
  "AGENTS.md"
  "docker-compose.yml"
  "docker-compose.dev.yml"
  "ecosystem.config.cjs"
  "Dockerfile.dev"
)

remove_paths() {
  local arr=("$@")
  for path in "${arr[@]}"; do
    if [ -e "$path" ]; then
      rm -rf "$path"
      echo "removed: $path"
    else
      echo "skip (not found): $path"
    fi
  done
}

PLATFORM="${1:-}"

if [ -n "${RENDER:-}" ] || [ "$PLATFORM" = "render" ]; then
  echo "platform: render"
  remove_paths "${REMOVED[@]}"
elif [ "$PLATFORM" = "ec2" ]; then
  echo "platform: ec2"
  remove_paths "${REMOVED[@]}"
else
  echo "usage: $0 [render|ec2]"
  echo "       (on Render the RENDER env var is detected automatically)"
  exit 1
fi

echo "✅ ✅ done."
