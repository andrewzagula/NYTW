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

Run `walkthru init` once so git hooks register commits automatically. Use
`walkthru new-commit "<commit description>" --message "<commit subject>"`
manually only when hooks are unavailable or an external workflow needs to
create a Walkthru quiz URL.

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
walkthru hook post-commit
walkthru hook pre-push
walkthru --help
walkthru --version
```

## Product Direction

Today the hooks register commits with the backend and print the quiz URL
returned by `POST /new-commit`. Eventually, the CLI should also render and
submit the quiz directly in the terminal while still using the backend as the
source of truth. Treat the CLI as another frontend for the same quiz workflow,
not as a separate grading system.

Structural expectations:

- Keep commit registration separate from quiz presentation.
- Keep backend APIs responsible for creating questions, accepting answers,
  grading, and storing attempts.
- Add terminal quiz commands as a second UI over backend quiz/session endpoints.
- Preserve the web URL flow as a fallback when the terminal is non-interactive
  or a richer web experience is preferred.
- Avoid local-only question generation or local-only grading in hooks.

## Command Guide

- `walkthru` opens the interactive Walkthru CLI menu for the current git repo.
- `walkthru open` opens the same interactive menu explicitly.
- `walkthru login` stores the GitHub token Walkthru needs for authenticated
  workflows.
- `walkthru init` installs the repo's `.git/hooks/post-commit` and
  `.git/hooks/pre-push` hooks and creates `.walkthru.json` if it is missing.
- `walkthru new-commit "<commit description>" --message "<commit subject>"`
  manually registers a commit attempt with Walkthru. Use `--commit-id
  <correlation-id>` when an external correlation id is available.
- `walkthru hook post-commit` and `walkthru hook pre-push` are internal git hook
  entrypoints. Do not call them manually unless you are debugging the hooks.

## Commit Hook Behavior

After `walkthru init`, git calls Walkthru after every commit and before every
push. The post-commit hook registers the final commit SHA and prints the quiz
URL returned by the API. The pre-push hook retries outgoing commits that were
not registered locally.

The repo-level config lives in `.walkthru.json`.

## Agent Expectations

- Run `walkthru init` once in this repo before relying on commit checks.
- Let the installed hooks register normal commits automatically.
- Run `walkthru new-commit "<commit description>" --message "<commit subject>"`
  only when hooks are unavailable or an external workflow needs a quiz URL.
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

printf '\nWalkthru CLI install complete. In a git repo, run: walkthru init\n'
