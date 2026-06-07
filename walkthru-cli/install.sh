#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_REPO="$(pwd)"

print_step() {
  printf '\n==> %s\n' "$1"
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    printf 'Missing required command: %s\n' "$1" >&2
    exit 1
  fi
}

agent_docs_block() {
  cat <<'EOF'

<!-- BEGIN:walkthru-cli-agent-readme -->
# Walkthru CLI Agent README

Walkthru is the repository comprehension CLI. Use it whenever you create,
review, push, or prepare PR changes in this repo so commit history stays
readable and traceable.

## Required Agent Workflow

Run `walkthru new-commit "<commit description>" --message "<commit subject>"`
every time you create a commit, update a PR branch, or push changes. This is
mandatory agent hygiene for this repository. Pass the commit body or expanded
description as the required commit description argument.

Before committing code, make sure Walkthru is initialized:

```bash
walkthru init
```

If authentication is required, run:

```bash
walkthru login
```

## Commands

```bash
walkthru
walkthru open
walkthru login
walkthru init
walkthru new-commit "<commit description>" --message "<commit subject>"
walkthru hook commit-msg <msg-file>
walkthru --help
walkthru --version
```

## Command Guide

- `walkthru` opens the interactive Walkthru CLI menu for the current git repo.
- `walkthru open` opens the same interactive menu explicitly.
- `walkthru login` stores the GitHub token Walkthru needs for authenticated
  workflows.
- `walkthru init` installs the repo's `.git/hooks/commit-msg` hook and creates
  `.walkthru.json` if it is missing.
- `walkthru new-commit "<commit description>" --message "<commit subject>"`
  registers a commit attempt with Walkthru. Agents must run this after every
  commit, PR update, and push. Use `--commit-id <correlation-id>` when an
  external correlation id is available.
- `walkthru hook commit-msg <msg-file>` is an internal git hook entrypoint.
  Do not call it manually unless you are debugging the hook.

## Commit Hook Behavior

After `walkthru init`, git calls Walkthru during `git commit`. The hook reads
the staged diff, asks a comprehension question when the diff is large enough,
grades the answer, and blocks the commit if the answer does not meet the
configured threshold.

The repo-level config lives in `.walkthru.json`.

## Agent Expectations

- Run `walkthru init` once in this repo before relying on commit checks.
- Run `walkthru new-commit "<commit description>" --message "<commit subject>"`
  after every commit you make.
- Run `walkthru new-commit "<commit description>" --message "<commit subject>"`
  before telling a user a PR branch is ready to push or has been pushed.
- Do not remove the Walkthru hook or weaken `.walkthru.json` unless the user
  explicitly asks for that change.
- If Walkthru fails because auth is missing, run `walkthru login` or tell the
  user exactly what credential is needed.
<!-- END:walkthru-cli-agent-readme -->
EOF
}

append_agent_docs() {
  local file="$1"
  local marker="<!-- BEGIN:walkthru-cli-agent-readme -->"

  if [[ -f "$file" ]] && grep -Fq "$marker" "$file"; then
    printf 'Walkthru agent docs already present in %s\n' "$file"
    return
  fi

  agent_docs_block >>"$file"
  printf 'Updated %s\n' "$file"
}

require_command bun

print_step "Installing Walkthru CLI"
cd "$SCRIPT_DIR"
bun install
bun run build
bun link

print_step "Installed binary"
if command -v walkthru >/dev/null 2>&1; then
  command -v walkthru
else
  printf 'walkthru was linked, but the Bun global bin directory is not on PATH.\n' >&2
  printf 'Add this directory to PATH, then rerun this installer:\n' >&2
  bun pm bin -g >&2
  exit 1
fi

print_step "Available commands"
walkthru --help

printf '\nAdd to AGENTS.md/CLAUDE.md? [y/N] '
read -r add_docs

case "$add_docs" in
  y|Y|yes|YES)
    append_agent_docs "$TARGET_REPO/AGENTS.md"
    append_agent_docs "$TARGET_REPO/CLAUDE.md"
    ;;
  *)
    printf 'Skipped AGENTS.md/CLAUDE.md updates.\n'
    ;;
esac

printf '\nWalkthru CLI install complete. Try: walkthru new-commit "Describe the commit" --message "commit subject"\n'
