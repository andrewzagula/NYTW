#!/usr/bin/env bash
set -euo pipefail

# Walkthru CLI remote installer.
# Usage: curl -fsSL https://nytw.vercel.app/install.sh | bash

REPO_URL="${WALKTHRU_REPO_URL:-https://github.com/andrewzagula/NYTW.git}"
REPO_REF="${WALKTHRU_REPO_REF:-main}"
CLI_SUBDIR="walkthru-cli"
# Persistent install location. bun link symlinks the global binary into this
# directory, so it must survive after the installer exits.
INSTALL_HOME="${WALKTHRU_HOME:-$HOME/.walkthru}"
REPO_DIR="$INSTALL_HOME/repo"

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

print_step "Downloading Walkthru CLI ($REPO_REF)"
mkdir -p "$INSTALL_HOME"
if [[ -d "$REPO_DIR/.git" ]]; then
  # Update an existing install in place rather than re-cloning.
  git -C "$REPO_DIR" remote set-url origin "$REPO_URL"
  git -C "$REPO_DIR" fetch --depth 1 origin "$REPO_REF"
  git -C "$REPO_DIR" checkout -f FETCH_HEAD
else
  rm -rf "$REPO_DIR"
  git clone --depth 1 --branch "$REPO_REF" "$REPO_URL" "$REPO_DIR"
fi

CLI_DIR="$REPO_DIR/$CLI_SUBDIR"
if [[ ! -d "$CLI_DIR" ]]; then
  printf 'Could not find %s in the repository.\n' "$CLI_SUBDIR" >&2
  exit 1
fi

print_step "Building Walkthru CLI"
cd "$CLI_DIR"
bun install
bun run build

if [[ ! -f "$CLI_DIR/dist/index.js" ]]; then
  printf 'Build did not produce dist/index.js; cannot link walkthru.\n' >&2
  exit 1
fi

bun link

print_step "Installed binary"
if ! command -v walkthru >/dev/null 2>&1; then
  printf 'walkthru was linked, but the Bun global bin directory is not on PATH.\n' >&2
  printf 'Add this directory to PATH, then rerun this installer:\n' >&2
  bun pm bin -g >&2
  exit 1
fi

# command -v succeeds even for a dangling symlink, so confirm it actually runs.
if ! walkthru --version >/dev/null 2>&1; then
  printf 'walkthru is on PATH but failed to run (likely a stale/dangling link).\n' >&2
  printf 'Re-run this installer after ensuring the build succeeded.\n' >&2
  exit 1
fi
command -v walkthru

print_step "Available commands"
walkthru --help

printf '\nWalkthru CLI installed to %s\n' "$CLI_DIR"
printf 'In a git repo, run: walkthru init\n'
