// node --test server/books.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { openDb } from "./db.js";
import { addBook, deleteBook, pickBook, rateBook, updateBook } from "./books.js";

function club() {
  const db = openDb(":memory:");
  const book = addBook(db, { title: "Dune", pages: 600, suggester: "Oscar" });
  return { db, book };
}

test("details can be fixed, including old members as suggester", () => {
  const { db, book } = club();
  pickBook(db);
  const updated = updateBook(db, book.id, { pages: "412", suggester: "Eva", startedAt: "2024-01-05" });
  assert.equal(updated.pages, 412);
  assert.equal(updated.suggester, "Eva");
  assert.equal(updated.startedAt, "2024-01-05T12:00:00.000Z");
});

test("bad details are refused", () => {
  const { db, book } = club();
  assert.throws(() => updateBook(db, book.id, { pages: "lots" }), /whole number/);
  assert.throws(() => updateBook(db, book.id, { title: " " }), /title/);
  assert.throws(() => updateBook(db, book.id, { suggester: "Nobody" }), /Unknown member/);
  assert.throws(() => updateBook(db, 999, { pages: 1 }), /not found/);
});

test("a book can't be finished before it was started", () => {
  const { db, book } = club();
  pickBook(db);
  const members = db.prepare("SELECT id, name FROM members WHERE active = 1").all();
  for (const m of members) rateBook(db, book.id, m, 7);
  assert.throws(() => updateBook(db, book.id, { startedAt: "2025-06-01", finishedAt: "2025-05-01" }), /finished before/);
  const ok = updateBook(db, book.id, { startedAt: "2025-05-01", finishedAt: "2025-06-01" });
  assert.equal(ok.finishedAt, "2025-06-01T12:00:00.000Z");
});

test("deleting a book removes its ratings too", () => {
  const { db, book } = club();
  pickBook(db);
  const me = db.prepare("SELECT id, name FROM members WHERE name = 'Frederik'").get();
  rateBook(db, book.id, me, 8);
  deleteBook(db, book.id);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM ratings").get().n, 0);
  assert.throws(() => deleteBook(db, book.id), /not found/);
});
