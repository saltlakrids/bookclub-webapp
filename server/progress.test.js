// node --test server/progress.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { openDb } from "./db.js";
import { addBook, pickBook } from "./books.js";
import {
  getSettings, listProgress, localTime, markWeeklySent, progressListeners, progressMessage, updateProgress,
  updateSettings, weeklyDue, weeklyMessage,
} from "./progress.js";
import { isPushEndpoint, notifyMember, saveSubscription } from "./push.js";

function club() {
  const db = openDb(":memory:");
  const book = addBook(db, { title: "Dune", pages: 400, suggester: "Oscar" });
  pickBook(db);
  const member = (name) => db.prepare("SELECT id, name FROM members WHERE name = ?").get(name);
  return { db, book, frederik: member("Frederik"), oscar: member("Oscar") };
}

test("everyone starts at 0 and the furthest reader comes first", () => {
  const { db, book, frederik, oscar } = club();
  updateProgress(db, book.id, frederik, { page: 100 });
  updateProgress(db, book.id, oscar, { page: 200 });
  const [dune] = listProgress(db);
  assert.equal(dune.members.length, 4);
  assert.deepEqual(dune.members.slice(0, 2).map((m) => [m.name, m.percent]), [["Oscar", 50], ["Frederik", 25]]);
  assert.equal(dune.members[3].page, 0);
});

test("adding pages counts the reading session and stops at the last page", () => {
  const { db, book, frederik } = club();
  const t0 = new Date("2026-11-01T18:00:00Z");
  updateProgress(db, book.id, frederik, { page: 50 }, new Date("2026-10-30T18:00:00Z"));
  updateProgress(db, book.id, frederik, { add: 10 }, t0);
  const { read } = updateProgress(db, book.id, frederik, { add: 10 }, new Date(t0.getTime() + 20 * 60 * 1000));
  assert.equal(read.pages, 20);
  assert.equal(read.page, 70);
  assert.match(progressMessage(read).title, /Frederik just read 20 pages/);
  const { progress } = updateProgress(db, book.id, frederik, { add: 1000 }, t0);
  assert.equal(progress.members.find((m) => m.name === "Frederik").page, 400);
});

test("a shorter edition changes the percentage and the limit", () => {
  const { db, book, frederik } = club();
  updateProgress(db, book.id, frederik, { totalPages: 300 });
  const { progress } = updateProgress(db, book.id, frederik, { page: 150 });
  const me = progress.members.find((m) => m.name === "Frederik");
  assert.deepEqual([me.totalPages, me.ownEdition, me.percent], [300, true, 50]);
  assert.throws(() => updateProgress(db, book.id, frederik, { page: 350 }), /300 pages/);
  // Back to the book's pages
  const reset = updateProgress(db, book.id, frederik, { totalPages: null }).progress.members.find((m) => m.name === "Frederik");
  assert.deepEqual([reset.totalPages, reset.ownEdition], [400, false]);
});

test("bad progress is refused", () => {
  const { db, book, frederik } = club();
  assert.throws(() => updateProgress(db, book.id, frederik, { page: -1 }), /negative/);
  assert.throws(() => updateProgress(db, book.id, frederik, { add: 0 }), /between/);
  assert.throws(() => updateProgress(db, book.id, frederik, { page: "lots" }), /whole number/);
  assert.throws(() => updateProgress(db, book.id, frederik, {}), /which page/);
  assert.throws(() => updateProgress(db, 999, frederik, { page: 1 }), /not found/);
  const hatBook = addBook(db, { title: "Emma", pages: 300, suggester: "Chris" });
  assert.throws(() => updateProgress(db, hatBook.id, frederik, { page: 1 }), /not being read/);
});

test("progress notifications are off by default and only go to others", () => {
  const { db, frederik, oscar } = club();
  assert.deepEqual(getSettings(db, oscar.id), { weeklyDay: 0, weeklyHour: 19, notifyProgress: false, notifyMeetups: true });
  assert.deepEqual(progressListeners(db, frederik.id), []);
  updateSettings(db, oscar.id, { notifyProgress: true });
  updateSettings(db, frederik.id, { notifyProgress: true });
  assert.deepEqual(progressListeners(db, frederik.id), [oscar.id]);
  assert.throws(() => updateSettings(db, oscar.id, { weeklyDay: 7 }), /day/);
  assert.throws(() => updateSettings(db, oscar.id, { weeklyHour: 24 }), /hour/);
});

test("weekly status is due on each member's own day and hour, once", () => {
  const { db, book, frederik, oscar } = club();
  // Sunday 1 Nov 2026, 19:30 in Copenhagen (CET, UTC+1)
  const sunday = new Date("2026-11-01T18:30:00Z");
  assert.deepEqual(localTime(sunday), { weekday: 0, hour: 19 });
  updateSettings(db, frederik.id, { weeklyDay: null });
  updateSettings(db, oscar.id, { weeklyDay: 0, weeklyHour: 20 });
  const due = weeklyDue(db, sunday).sort();
  assert.ok(!due.includes(frederik.id), "turned off");
  assert.ok(!due.includes(oscar.id), "not 20:00 yet");
  assert.equal(due.length, 2, "the two members on defaults");
  for (const id of due) markWeeklySent(db, id, sunday);
  assert.deepEqual(weeklyDue(db, new Date(sunday.getTime() + 10 * 60 * 1000)), []);
  assert.deepEqual(weeklyDue(db, new Date("2026-11-01T19:05:00Z")), [oscar.id]);

  updateProgress(db, book.id, oscar, { page: 100 }, new Date("2026-10-30T12:00:00Z"));
  const message = weeklyMessage(db, sunday);
  assert.match(message.body, /^Dune: Oscar 25 % \(\+100\), /);
});

test("push subscriptions only for real push services, and dead ones are dropped", async () => {
  const { db, oscar } = club();
  assert.equal(isPushEndpoint("https://fcm.googleapis.com/fcm/send/abc"), true);
  assert.equal(isPushEndpoint("https://evil.example/push"), false);
  assert.throws(() => saveSubscription(db, oscar.id, { endpoint: "http://localhost/x", keys: { p256dh: "a", auth: "b" } }));
  saveSubscription(db, oscar.id, { endpoint: "https://web.push.apple.com/a", keys: { p256dh: "a", auth: "b" } }, "iPhone");
  saveSubscription(db, oscar.id, { endpoint: "https://fcm.googleapis.com/fcm/send/b", keys: { p256dh: "a", auth: "b" } }, "Pixel");
  const send = async (sub) => {
    if (sub.endpoint.includes("apple")) throw Object.assign(new Error("gone"), { statusCode: 410 });
  };
  assert.deepEqual(await notifyMember(db, send, oscar.id, { title: "Hi" }), { sent: 1, failed: 1 });
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM push_subscriptions").get().n, 1);
});
