# bookclub-webapp

The Slow Guys Book Club: put books in the hat, let the hat pick the next one, and rate it when you are done.

A Vue 3 frontend with a small Node server (`server/`) that keeps everything in SQLite. It runs on a Raspberry Pi behind `tailscale serve`, which also handles sign in.

## How sign in works
The server only listens on localhost. `tailscale serve` proxies to it and tells it which Tailscale user is asking. The first time someone opens the app they pick which member they are (Chris, Dumstrei, Frederik or Oscar), and that choice is tied to their Tailscale login. Friends outside your tailnet need the Pi shared with them in the Tailscale admin console. [docs/joining.md](docs/joining.md) has the steps and a guide to send them.

Ratings stay hidden until all four have rated (or skipped) a book. Then the book moves to "Read and rated" with everyone's scores.

## Development
```
npm install
npm run server:dev   # API on http://127.0.0.1:8100, reads .env
npm run serve        # frontend with hot reload, proxies /api to the server
```
`.env` (not committed) for local development:
```
DEV_LOGIN=you@example.com
DB_PATH=data/dev.db
```
`DEV_LOGIN` stands in for the Tailscale header and is ignored when `NODE_ENV=production`.

Node 22.13 or newer is needed (for `node:sqlite`). The server has no npm dependencies.

### Import the old spreadsheet
```
npm run import:excel -- "the slow genderneutral bookclub.xlsx" --db data/seed.db --covers
```
Add `--firestore firestore.json` (made with `node server/scripts/export-firestore.js > firestore.json`) to borrow covers from the old Firebase app.

## Raspberry Pi
First install, with the imported database:
```
deploy/deploy.sh --seed data/seed.db
```
Later updates:
```
deploy/deploy.sh
```
This builds the app, copies it to `homepi` (set `BOOKCLUB_HOST` to change that) and installs it:

| What | Where |
| --- | --- |
| App | `/opt/bookclub` |
| Database | `/var/lib/bookclub/bookclub.db` |
| Settings | `/etc/bookclub/bookclub.env` (`GOOGLE_BOOKS_API_KEY` is optional) |
| Service | `systemctl status bookclub`, logs with `journalctl -u bookclub` |
| URL | `https://homepi.<tailnet>.ts.net:10000` |

Member admin on the Pi:
```
cd /opt/bookclub/server
sudo -u bookclub DB_PATH=/var/lib/bookclub/bookclub.db node cli.js members
sudo -u bookclub DB_PATH=/var/lib/bookclub/bookclub.db node cli.js unclaim Oscar
```
Backup: `sudo sqlite3 /var/lib/bookclub/bookclub.db ".backup bookclub-backup.db"`

## Firebase
The `master` branch still runs on Firebase Hosting and Firestore and deploys from GitHub Actions. The Firebase files are kept here until the Pi version has taken over.
