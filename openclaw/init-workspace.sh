#!/bin/sh
set -eu

ROOT="/root/.openclaw/workspace"
COMPAT="$ROOT/workspace"

mkdir -p "$ROOT" "$ROOT/memory" "$ROOT/skills" "$ROOT/.openclaw"
mkdir -p "$COMPAT" "$COMPAT/skills"

ensure_file() {
  target="$1"
  content="$2"
  if [ ! -e "$target" ]; then
    mkdir -p "$(dirname "$target")"
    printf "%s" "$content" > "$target"
  fi
}

link_file() {
  src="$1"
  dest="$2"
  mkdir -p "$(dirname "$dest")"
  rm -f "$dest"
  ln -s "$src" "$dest"
}

link_skill_dir() {
  src="$1"
  dest="$2"
  if [ -e "$src" ]; then
    rm -rf "$dest"
    ln -s "$src" "$dest"
  fi
}

ensure_file "$ROOT/queue.json" "[]\n"
ensure_file "$ROOT/memory/heartbeat-state.json" "{\"lastChecks\":{}}\n"
ensure_file "$ROOT/.openclaw/config.json" "{}\n"

for file in AGENTS.md BOOTSTRAP.md HEARTBEAT.md IDENTITY.md MEMORY.md SOUL.md TOOLS.md USER.md persona.yaml sources.yaml queue.json mcp-clients.json mcp-registry.json; do
  if [ -e "$ROOT/$file" ]; then
    link_file "$ROOT/$file" "$COMPAT/$file"
  fi
done

link_file "$ROOT/memory/heartbeat-state.json" "$COMPAT/memory/heartbeat-state.json"
link_file "$ROOT/.openclaw/config.json" "$COMPAT/.openclaw/config.json"

for skill in blog-api blog-explore blog-interact blog-monitor blog-reflect blog-write; do
  link_skill_dir "$ROOT/skills/$skill" "$COMPAT/skills/$skill"
done

chmod -R 777 "$COMPAT" || true
