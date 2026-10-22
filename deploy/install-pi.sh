#!/usr/bin/env bash
# Runs on the Pi (deploy.sh copies it there). Installs or updates the book club.
#   install-pi.sh <release.tar.gz> [seed.db]
set -euo pipefail

RELEASE="$1"
SEED_DB="${2:-}"
APP_DIR=/opt/bookclub
ENV_FILE=/etc/bookclub/bookclub.env
DB_FILE=/var/lib/bookclub/bookclub.db
PORT=8100

node -e 'const [major, minor] = process.versions.node.split(".").map(Number); process.exit(major > 22 || (major === 22 && minor >= 13) ? 0 : 1)' \
  || { echo "Node 22.13 or newer is needed for node:sqlite"; exit 1; }

if ! id bookclub >/dev/null 2>&1; then
  sudo useradd --system --home-dir "$APP_DIR" --shell /usr/sbin/nologin bookclub
fi

# Unpack next to the old version and swap, so a failed unpack leaves the app running
sudo rm -rf "$APP_DIR.new"
sudo mkdir -p "$APP_DIR.new"
sudo tar -xzf "$RELEASE" -C "$APP_DIR.new"
sudo chown -R root:root "$APP_DIR.new"
sudo rm -rf "$APP_DIR.old"
if [ -d "$APP_DIR" ]; then sudo mv "$APP_DIR" "$APP_DIR.old"; fi
sudo mv "$APP_DIR.new" "$APP_DIR"

if [ ! -f "$ENV_FILE" ]; then
  sudo mkdir -p /etc/bookclub
  sudo tee "$ENV_FILE" >/dev/null <<EOF
PORT=$PORT
HOST=127.0.0.1
DB_PATH=$DB_FILE
STATIC_DIR=$APP_DIR/dist
# Optional. Without it, search uses Open Library.
GOOGLE_BOOKS_API_KEY=
EOF
  sudo chmod 640 "$ENV_FILE"
  sudo chown root:bookclub "$ENV_FILE"
fi

sudo install -m 644 "$APP_DIR/deploy/bookclub.service" /etc/systemd/system/bookclub.service
sudo systemctl daemon-reload

if [ -n "$SEED_DB" ]; then
  if sudo test -f "$DB_FILE"; then
    echo "Database already exists, not overwriting it with the seed"
  else
    sudo install -d -m 700 -o bookclub -g bookclub /var/lib/bookclub
    sudo install -m 600 -o bookclub -g bookclub "$SEED_DB" "$DB_FILE"
    echo "Seeded database from $SEED_DB"
  fi
fi

sudo systemctl enable bookclub >/dev/null 2>&1
sudo systemctl restart bookclub

for _ in $(seq 1 20); do
  if curl -fsS "http://127.0.0.1:$PORT/" >/dev/null 2>&1; then break; fi
  sleep 0.5
done
curl -fsS "http://127.0.0.1:$PORT/api/me" >/dev/null || { sudo journalctl -u bookclub -n 30 --no-pager; exit 1; }

# The book club has its own Tailscale node, "bookclub", running next to the main one
TS_BOOKCLUB="sudo tailscale --socket=/run/tailscale-bookclub/tailscaled.sock"
sudo install -m 644 "$APP_DIR/deploy/tailscaled-bookclub.service" /etc/systemd/system/tailscaled-bookclub.service
sudo systemctl daemon-reload
sudo systemctl enable --now tailscaled-bookclub >/dev/null 2>&1
sleep 2

sudo rm -rf "$APP_DIR.old"

if ! $TS_BOOKCLUB status >/dev/null 2>&1; then
  echo "The bookclub Tailscale node is not logged in yet. Log it in with:"
  echo "  $TS_BOOKCLUB up --hostname=bookclub --accept-dns=false"
  echo "then run this script again."
  exit 0
fi

if ! $TS_BOOKCLUB serve status --json | grep -q "127.0.0.1:$PORT"; then
  $TS_BOOKCLUB serve --bg --https=443 "http://127.0.0.1:$PORT"
fi

echo "Book club is running: https://$($TS_BOOKCLUB status --json | node -pe 'JSON.parse(require("fs").readFileSync(0)).Self.DNSName.replace(/\.$/, "")')"
