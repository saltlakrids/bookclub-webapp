# bookclub-webapp

The Slow Guys Book Club: put books in the hat, let the hat pick the next one, and rate it when you are done.

A Vue 3 frontend with a small Node server (`server/`) that keeps everything in SQLite. It runs on a Raspberry Pi, reached at https://bookclub.karensmindevej.app through a Cloudflare Tunnel, with Cloudflare Access handling sign in.

## How sign in works
The server only listens on localhost. Cloudflare Access puts a login page in front of the app (Google, or a code sent by email) and only lets in the email addresses on the club's list. It then adds a signed token (`Cf-Access-Jwt-Assertion`) to every request; the server checks the signature against the team's public keys and the app's AUD tag (`server/access.js`) and uses the email inside. The first time someone opens the app they pick which member they are (Chris, Dumstrei, Frederik or Oscar), and that choice is tied to their email. [docs/joining.md](docs/joining.md) has the steps and a guide to send them.

Without `ACCESS_TEAM`/`ACCESS_AUD` the server falls back to the old setup: a second Tailscale node called `bookclub` whose `tailscale serve` adds a `Tailscale-User-Login` header. With Access on, that header is ignored, because Cloudflare passes visitors' own headers through and anyone could type one.

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
`DEV_LOGIN` stands in for the signed-in email and is ignored when `NODE_ENV=production`.

Node 22.13 or newer is needed (for `node:sqlite`). The server has no npm dependencies. Tests for the sign-in check: `node --test server/access.test.js`.

### Import the old spreadsheet
```
npm run import:excel -- "the slow genderneutral bookclub.xlsx" --db data/seed.db --covers
```
Add `--firestore firestore.json` (made with `node server/scripts/export-firestore.js > firestore.json`) to borrow covers from the old Firebase app.

## Meetups
The **Meetups** page shows the next meetup or party (date, time, book, the page to read up to and how far each member is), a list of later ones and the past ones. Anyone can plan, edit or delete a meetup. Times are entered in the phone's own time and stored in UTC; dates in notifications use Europe/Copenhagen.
- **Add to calendar** links to Google Calendar, Outlook.com and Microsoft 365, and downloads an `.ics` file (`GET /api/meetups/<id>.ics`) for Apple Calendar, Outlook desktop and the rest.
- A meetup with a page to read up to sends a push notification one week before to every member who is behind ("Read 50 pages by Friday"). Meetups planned less than a week ahead and parties get none; each member can turn it off under Notifications.

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
| Settings | `/etc/bookclub/bookclub.env`: `ACCESS_TEAM=karensmindevej`, `ACCESS_AUD=<the Access app's AUD tag>`, optional `GOOGLE_BOOKS_API_KEY` |
| Service | `systemctl status bookclub`, logs with `journalctl -u bookclub` |
| URL | https://bookclub.karensmindevej.app (Cloudflare Tunnel `homepi`, Access app "Bookclub") |
| Who may sign in | The Access app's policy in Cloudflare Zero Trust: the members' email addresses |

The Pi's Cloudflare Tunnel and the hosting conventions live in Frederik's `homepi` repo (`docs/HOSTING.md`).

Member admin on the Pi:
```
cd /opt/bookclub/server
sudo -u bookclub DB_PATH=/var/lib/bookclub/bookclub.db node cli.js members
sudo -u bookclub DB_PATH=/var/lib/bookclub/bookclub.db node cli.js unclaim Oscar
sudo -u bookclub DB_PATH=/var/lib/bookclub/bookclub.db node cli.js claim Oscar oscar@example.com
```
Backup: `sudo sqlite3 /var/lib/bookclub/bookclub.db ".backup bookclub-backup.db"`

## Firebase
The `master` branch still runs on Firebase Hosting and Firestore and deploys from GitHub Actions. The Firebase files are kept here until the Pi version has taken over.
