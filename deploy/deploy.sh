#!/usr/bin/env bash
# Builds the app and installs it on the Pi. Run from the repo root (Git Bash works).
#   deploy/deploy.sh [--seed data/seed.db]
# --seed uploads a database for the very first install, it never overwrites one.
set -euo pipefail

HOST="${BOOKCLUB_HOST:-homepi}"
SEED_DB=""
if [ "${1:-}" = "--seed" ]; then SEED_DB="$2"; fi

npm run build

RELEASE=$(mktemp -d)/bookclub.tar.gz
tar -czf "$RELEASE" --exclude=server/node_modules dist server deploy package.json

ssh "$HOST" 'mkdir -p ~/bookclub-deploy'
scp -q "$RELEASE" deploy/install-pi.sh "$HOST":bookclub-deploy/
if [ -n "$SEED_DB" ]; then
  scp -q "$SEED_DB" "$HOST":bookclub-deploy/seed.db
  ssh "$HOST" 'bash ~/bookclub-deploy/install-pi.sh ~/bookclub-deploy/bookclub.tar.gz ~/bookclub-deploy/seed.db'
else
  ssh "$HOST" 'bash ~/bookclub-deploy/install-pi.sh ~/bookclub-deploy/bookclub.tar.gz'
fi
ssh "$HOST" 'rm -rf ~/bookclub-deploy'
