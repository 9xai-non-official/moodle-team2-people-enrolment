#!/usr/bin/env bash
# Local continuous deployment: keep the working copy level with origin/staging.
#
# The dev servers hot-reload on their own (uvicorn --reload, Vite HMR), so all
# this has to do is land new commits on disk and reinstall dependencies when a
# lockfile moves. There is no build or restart step.
#
# Install:   scripts/local-cd.sh --install     (launchd agent, polls every 60s)
# Remove:    scripts/local-cd.sh --uninstall
# Run once:  scripts/local-cd.sh
# Watch:     tail -f .local-cd.log
#
# Safety: only ever fast-forwards, only while checked out on $BRANCH, and never
# touches a dirty working tree. It cannot discard your work — if a pull would
# need a merge or rebase, it logs and stops.

set -uo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BRANCH="staging"
LOG="$REPO/.local-cd.log"
LABEL="com.team2.moodle.local-cd"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"

log() { printf '%s  %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" >>"$LOG"; }

install_agent() {
  mkdir -p "$HOME/Library/LaunchAgents"
  cat >"$PLIST" <<PLIST_EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>$REPO/scripts/local-cd.sh</string>
  </array>
  <key>StartInterval</key><integer>60</integer>
  <key>RunAtLoad</key><true/>
  <key>StandardErrorPath</key><string>$REPO/.local-cd.err</string>
  <key>WorkingDirectory</key><string>$REPO</string>
</dict>
</plist>
PLIST_EOF
  launchctl unload "$PLIST" 2>/dev/null
  launchctl load "$PLIST" && echo "installed: polling origin/$BRANCH every 60s" \
    && echo "logs:      tail -f $LOG" \
    && echo "remove:    scripts/local-cd.sh --uninstall"
}

uninstall_agent() {
  launchctl unload "$PLIST" 2>/dev/null
  rm -f "$PLIST"
  echo "removed: $LABEL"
}

case "${1:-}" in
  --install)   install_agent; exit $? ;;
  --uninstall) uninstall_agent; exit $? ;;
  --status)
    # Capture first rather than piping: `grep -q` exits on the first match,
    # which SIGPIPEs launchctl, and `pipefail` would report that as failure.
    if [[ "$(launchctl list 2>/dev/null)" == *"$LABEL"* ]]; then
      echo "installed — polling origin/$BRANCH every 60s"
    else
      echo "not installed"
    fi
    exit 0 ;;
esac

cd "$REPO" || exit 1

# Only act on the branch we track — never surprise someone mid-feature.
current=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
if [ "$current" != "$BRANCH" ]; then
  exit 0
fi

# Never touch uncommitted work.
if ! git diff --quiet || ! git diff --cached --quiet; then
  log "skip — working tree has uncommitted changes"
  exit 0
fi

git fetch origin "$BRANCH" --quiet 2>>"$LOG" || { log "fetch failed"; exit 1; }

before=$(git rev-parse HEAD)
after=$(git rev-parse "origin/$BRANCH")
[ "$before" = "$after" ] && exit 0

changed=$(git diff --name-only "$before" "$after")

if ! git merge --ff-only "origin/$BRANCH" --quiet 2>>"$LOG"; then
  log "STOPPED — local $BRANCH has diverged from origin; resolve by hand"
  exit 1
fi

log "pulled ${before:0:8} -> ${after:0:8}  ($(echo "$changed" | wc -l | tr -d ' ') files)"

if grep -q '^moodle-replica/backend/requirements' <<<"$changed"; then
  log "  requirements changed -> pip install"
  "$REPO/moodle-replica/backend/.venv/bin/pip" install -q \
    -r "$REPO/moodle-replica/backend/requirements.txt" >>"$LOG" 2>&1 \
    && log "  pip ok — uvicorn picks it up on next reload" \
    || log "  pip FAILED"
fi

if grep -qE '^moodle-replica/frontend/(package\.json|package-lock\.json)' <<<"$changed"; then
  log "  lockfile changed -> npm ci"
  (cd "$REPO/moodle-replica/frontend" && npm ci --silent) >>"$LOG" 2>&1 \
    && log "  npm ok" || log "  npm FAILED"
fi

# api.yaml is generated from the routers; keep it honest when they move.
if grep -q '^moodle-replica/backend/app/routers/' <<<"$changed"; then
  log "  routers changed -> api.yaml may be stale (run scripts/generate-api-yaml.py)"
fi
