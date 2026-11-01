import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

// Members who log in and rate. Former members only exist for old ratings.
export const ACTIVE_MEMBERS = ["Chris", "Dumstrei", "Frederik", "Oscar"];
export const FORMER_MEMBERS = ["Eva", "Jens"];

const SCHEMA = `
CREATE TABLE IF NOT EXISTS members (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  active INTEGER NOT NULL DEFAULT 1,
  login TEXT UNIQUE -- the email (Cloudflare) or Tailscale login that claimed this member
);

CREATE TABLE IF NOT EXISTS books (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  pages INTEGER,
  image TEXT,
  suggester_id INTEGER REFERENCES members(id),
  status TEXT NOT NULL CHECK (status IN ('hat', 'reading', 'rated')),
  added_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  started_at TEXT,
  finished_at TEXT
);

-- score NULL means the member skipped the book (did not read it)
CREATE TABLE IF NOT EXISTS ratings (
  book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  member_id INTEGER NOT NULL REFERENCES members(id),
  score REAL CHECK (score IS NULL OR (score >= 1 AND score <= 10)),
  rated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (book_id, member_id)
);

CREATE INDEX IF NOT EXISTS books_status ON books(status);

-- How far each member is in a book. total_pages is their own edition; NULL means the book's pages.
CREATE TABLE IF NOT EXISTS progress (
  book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  member_id INTEGER NOT NULL REFERENCES members(id),
  page INTEGER NOT NULL DEFAULT 0,
  total_pages INTEGER,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (book_id, member_id)
);

-- Every page update, for "pages this week" and "X just read N pages"
CREATE TABLE IF NOT EXISTS progress_log (
  id INTEGER PRIMARY KEY,
  book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  member_id INTEGER NOT NULL REFERENCES members(id),
  from_page INTEGER NOT NULL,
  to_page INTEGER NOT NULL,
  at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS progress_log_at ON progress_log(at);

-- One row per device that turned notifications on
CREATE TABLE IF NOT EXISTS push_subscriptions (
  endpoint TEXT PRIMARY KEY,
  member_id INTEGER NOT NULL REFERENCES members(id),
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TEXT NOT NULL
);

-- What each member wants to be notified about. No row means the defaults.
-- weekly_day: 0 = Sunday ... 6 = Saturday, NULL = no weekly status
CREATE TABLE IF NOT EXISTS member_settings (
  member_id INTEGER PRIMARY KEY REFERENCES members(id),
  weekly_day INTEGER CHECK (weekly_day IS NULL OR weekly_day BETWEEN 0 AND 6),
  weekly_hour INTEGER NOT NULL CHECK (weekly_hour BETWEEN 0 AND 23),
  notify_progress INTEGER NOT NULL DEFAULT 0,
  weekly_sent_at TEXT
);

-- Server state, e.g. the push signing keys
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

export function openDb(path) {
  if (path !== ":memory:") {
    mkdirSync(dirname(path), { recursive: true });
  }
  const db = new DatabaseSync(path);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
  db.exec(SCHEMA);

  // Databases from the Tailscale-only days call the column tailscale_login
  const columns = db.prepare("SELECT name FROM pragma_table_info('members')").all().map((c) => c.name);
  if (columns.includes("tailscale_login")) {
    // Lower-cased like Cloudflare emails, so a Google login keeps its member when moving over
    db.exec("ALTER TABLE members RENAME COLUMN tailscale_login TO login; UPDATE members SET login = lower(login);");
  }

  const insertMember = db.prepare("INSERT OR IGNORE INTO members (name, active) VALUES (?, ?)");
  for (const name of ACTIVE_MEMBERS) insertMember.run(name, 1);
  for (const name of FORMER_MEMBERS) insertMember.run(name, 0);

  return db;
}

export function transaction(db, fn) {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
