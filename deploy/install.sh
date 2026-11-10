#!/usr/bin/env bash
# Installs or updates the book club from a checkout on the Pi (what agentboard runs after a merge to raspberry-pi):
#   sudo bash deploy/install.sh
# Builds as the checkout's owner, backs up the database, then hands the release to install-pi.sh.
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Run with sudo." >&2
  exit 1
fi

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OWNER="$(stat -c %U "$REPO_DIR")"
DB_FILE=/var/lib/bookclub/bookclub.db
BACKUP_DIR=/var/backups/bookclub
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

echo "==> Build (as $OWNER)"
# Not as root: root-owned files in dist or node_modules/.cache would break the next build
(cd "$REPO_DIR" && sudo -u "$OWNER" npm run build)

if [ -f "$DB_FILE" ]; then
  echo "==> Database backup"
  install -d -m 700 "$BACKUP_DIR"
  sqlite3 "$DB_FILE" ".backup '$BACKUP_DIR/bookclub-predeploy-$(date +%F-%H%M%S).db'"
  find "$BACKUP_DIR" -name 'bookclub-predeploy-*.db' -mtime +14 -delete
fi

echo "==> Install"
tar -czf "$WORK/bookclub.tar.gz" -C "$REPO_DIR" --exclude=server/node_modules dist server deploy package.json
bash "$REPO_DIR/deploy/install-pi.sh" "$WORK/bookclub.tar.gz"
