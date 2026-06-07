#!/usr/bin/env bash
set -euo pipefail

# Walkthru CLI remote installer.
# Usage: curl -fsSL https://nytw.vercel.app/install.sh | bash

REPO_URL="${WALKTHRU_REPO_URL:-https://github.com/andrewzagula/NYTW.git}"
REPO_REF="${WALKTHRU_REPO_REF:-main}"
CLI_SUBDIR="walkthru-cli"

print_step() {
  printf '\n==> %s\n' "$1"
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    printf 'Missing required command: %s\n' "$1" >&2
    printf 'Install %s and rerun this installer.\n' "$1" >&2
    exit 1
  fi
}

require_command git
require_command bun

WORKDIR="$(mktemp -d)"
cleanup() {
  rm -rf "$WORKDIR"
}
trap cleanup EXIT

print_step "Downloading Walkthru CLI ($REPO_REF)"
git clone --depth 1 --branch "$REPO_REF" "$REPO_URL" "$WORKDIR/repo"

CLI_DIR="$WORKDIR/repo/$CLI_SUBDIR"
if [[ ! -d "$CLI_DIR" ]]; then
  printf 'Could not find %s in the repository.\n' "$CLI_SUBDIR" >&2
  exit 1
fi

print_step "Building Walkthru CLI"
cd "$CLI_DIR"
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

printf '\nWalkthru CLI install complete. In a git repo, run: walkthru init\n'
