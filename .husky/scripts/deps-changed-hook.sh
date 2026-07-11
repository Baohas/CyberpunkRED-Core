#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'
# .husky/post-merge and .husky/post-rewrite (or scripts/deps-changed-hook.sh)
#
# Notifies the dev when package.json / package-lock.json changed
# after a pull (merge) or rebase.

# Files that should trigger the notification (regex, matches at any depth)
WATCH_REGEX='(^|/)(package\.json|package-lock\.json|npm-shrinkwrap\.json)$'

notify() {
  # Colored output if we're attached to a terminal, plain otherwise
  if [[ -t 1 ]]; then
    printf '\n\033[1;33m📦  Dependency files changed:\033[0m\n'
  else
    printf '\n📦  Dependency files changed:\n'
  fi
  printf '%s\n' "$1" | sed 's/^/    /'
  printf '\n👉  Run \033[1mnpm install\033[0m (or \033[1mnpm ci\033[0m) to sync your node_modules.\n\n'
}

changed_between() {
  # List changed files between two commits; tolerate failures quietly
  git diff-tree -r --name-only --no-commit-id "$1" "$2" 2>/dev/null || true
}

hook_name="$(basename "$0")"
changed=""

case "${hook_name}" in
post-rewrite)
  # git passes "old-sha new-sha [extra]" lines on stdin, one per rewritten commit.
  # Only care about rebase (arg $1 is "rebase" or "amend").
  while read -r old new _; do
    [[ -n "${old:-}" ]] && [[ -n "${new:-}" ]] || continue
    changed+="$(changed_between "${old}" "${new}")"$'\n'
  done
  ;;
*)
  # post-merge (and a sane fallback for anything else).
  # ORIG_HEAD = where we were before the merge; HEAD = where we are now.
  if git rev-parse -q --verify ORIG_HEAD >/dev/null; then
    changed="$(changed_between ORIG_HEAD HEAD)"
  fi
  ;;
esac

# Filter to watched files, dedupe
matches="$(printf '%s' "${changed}" | grep -E "${WATCH_REGEX}" | sort -u || true)"

if [[ -n "${matches}" ]]; then
  notify "${matches}"
fi

exit 0
