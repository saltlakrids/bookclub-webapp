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
  tailscale_login TEXT UNIQUE
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
`;

export function openDb(path) {
  if (path !== ":memory:") {
    mkdirSync(dirname(path), { recursive: true });
  }
  const db = new DatabaseSync(path);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
  db.exec(SCHEMA);

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
