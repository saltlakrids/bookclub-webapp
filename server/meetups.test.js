// node --test server/meetups.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { openDb } from "./db.js";
import { addBook, pickBook } from "./books.js";
import { updateProgress, updateSettings } from "./progress.js";
import {
  addMeetup, calendarLinks, deleteMeetup, listMeetups, markReminderSent, meetupIcs, meetupReminder, meetupRemindersDue,
  updateMeetup,
} from "./meetups.js";

function club() {
  const db = openDb(":memory:");
  const book = addBook(db, { title: "Dune", pages: 400, suggester: "Oscar" });
  pickBook(db);
  const member = (name) => db.prepare("SELECT id, name FROM members WHERE name = ?").get(name);
  return { db, book, frederik: member("Frederik"), oscar: member("Oscar") };
}

// Friday 20 Nov 2026, 19:00 in Denmark
const FRIDAY = "2026-11-20T18:00:00.000Z";
const NOW = new Date("2026-11-14T12:00:00Z");

function planned(db, me, body, createdAt = "2026-11-01T10:00:00Z") {
  const meetup = addMeetup(db, me, { startsAt: FRIDAY, readToPage: 200, ...body });
  db.prepare("UPDATE meetups SET created_at = ? WHERE id = ?").run(createdAt, meetup.id);
  return meetup;
}

test("a new meetup defaults to the book being read and lasts three hours", () => {
  const { db, book, frederik } = club();
  const m = addMeetup(db, frederik, { startsAt: FRIDAY, description: "  Pizza  " });
  assert.equal(m.kind, "meetup");
  assert.equal(m.book.id, book.id);
  assert.equal(m.description, "Pizza");
  assert.equal(m.endsAt, "2026-11-20T21:00:00.000Z");
});

test("input is checked", () => {
  const { db, book, frederik } = club();
  const bad = (body, pattern) => assert.throws(() => addMeetup(db, frederik, body), pattern);
  bad({}, /date and time/);
  bad({ startsAt: "tomorrow" }, /date and time/);
  bad({ startsAt: FRIDAY, kind: "ball" }, /meetup or party/);
  bad({ startsAt: FRIDAY, description: "x".repeat(501) }, /at most 500/);
  bad({ startsAt: FRIDAY, readToPage: 401 }, /400 pages/);
  bad({ startsAt: FRIDAY, readToPage: 1.5 }, /whole number/);
  bad({ startsAt: FRIDAY, bookId: 999 }, /Pick a book/);
  bad({ startsAt: FRIDAY, kind: "party", bookId: book.id }, /Only a meetup/);
  assert.equal(addMeetup(db, frederik, { startsAt: FRIDAY, kind: "party" }).book, null);
  assert.equal(addMeetup(db, frederik, { startsAt: FRIDAY, readToPage: "200" }).readToPage, 200);
});

test("upcoming meetups come soonest first and past ones latest first", () => {
  const { db, frederik } = club();
  const later = addMeetup(db, frederik, { startsAt: "2026-12-20T18:00:00Z" });
  const sooner = addMeetup(db, frederik, { startsAt: "2026-11-20T18:00:00Z" });
  const old1 = addMeetup(db, frederik, { startsAt: "2026-09-01T18:00:00Z" });
  const old2 = addMeetup(db, frederik, { startsAt: "2026-10-01T18:00:00Z" });
  const { upcoming, past } = listMeetups(db, frederik, NOW);
  assert.deepEqual(upcoming.map((m) => m.id), [sooner.id, later.id]);
  assert.deepEqual(past.map((m) => m.id), [old2.id, old1.id]);
});

test("members' pages are measured against the target, scaled to their own edition", () => {
  const { db, book, frederik, oscar } = club();
  updateProgress(db, book.id, frederik, { page: 150 });
  updateProgress(db, book.id, oscar, { totalPages: 800 });
  updateProgress(db, book.id, oscar, { page: 300 });
  planned(db, frederik, {});
  const { upcoming } = listMeetups(db, frederik, NOW);
  assert.equal(upcoming[0].mine.toGo, 50);
  const o = upcoming[0].members.find((m) => m.name === "Oscar");
  assert.deepEqual([o.target, o.toGo], [400, 100]);
});

test("editing and deleting; moving a meetup allows a new reminder", () => {
  const { db, frederik } = club();
  const m = planned(db, frederik, {});
  markReminderSent(db, m.id);
  const edited = updateMeetup(db, m.id, { description: "Moved", startsAt: "2026-11-21T18:00:00Z" });
  assert.equal(edited.readToPage, 200);
  assert.equal(edited.description, "Moved");
  assert.equal(db.prepare("SELECT reminder_sent_at FROM meetups").get().reminder_sent_at, null);
  assert.equal(updateMeetup(db, m.id, { kind: "party" }).readToPage, null);
  deleteMeetup(db, m.id);
  assert.throws(() => deleteMeetup(db, m.id), /not found/);
});

test("the calendar file has UTC times, escaping and folding", () => {
  const { db, frederik } = club();
  const m = addMeetup(db, frederik, { startsAt: FRIDAY, description: "Bring wine, snacks; and a long long long long long long long long text\nLine two" });
  const ics = meetupIcs(m, NOW);
  assert.match(ics, /^BEGIN:VCALENDAR\r\n/);
  assert.ok(ics.includes("DTSTART:20261120T180000Z\r\n"));
  assert.ok(ics.includes("DTEND:20261120T210000Z\r\n"));
  assert.ok(ics.includes("DTSTAMP:20261114T120000Z\r\n"));
  assert.ok(ics.includes("UID:meetup-1@bookclub"));
  assert.ok(ics.includes("SUMMARY:Book club: Dune"));
  assert.ok(ics.includes("TRIGGER:-P1D"));
  const unfolded = ics.replace(/\r\n /g, "");
  assert.ok(unfolded.includes("Bring wine\\, snacks\; and"));
  assert.ok(unfolded.includes("text\\nLine two"));
  for (const line of ics.split("\r\n")) assert.ok(Buffer.byteLength(line) <= 75);
  const links = calendarLinks(m);
  assert.match(links.google, /^https:\/\/calendar\.google\.com\/calendar\/render\?action=TEMPLATE/);
  assert.ok(links.google.includes("dates=20261120T180000Z%2F20261120T210000Z"));
  assert.match(links.outlook, /^https:\/\/outlook\.live\.com\//);
  assert.match(links.office365, /^https:\/\/outlook\.office\.com\//);
});

test("a reminder is due once, in the week before, for a meetup planned earlier than that", () => {
  const { db, frederik } = club();
  const m = planned(db, frederik, {});
  assert.equal(meetupRemindersDue(db, new Date("2026-11-12T12:00:00Z")).length, 0, "more than a week away");
  assert.equal(meetupRemindersDue(db, NOW).length, 1);
  assert.equal(meetupRemindersDue(db, new Date("2026-11-21T12:00:00Z")).length, 0, "already started");
  markReminderSent(db, m.id, NOW);
  assert.equal(meetupRemindersDue(db, NOW).length, 0, "sent once");
});

test("no reminder for parties, meetups without a target or planned less than a week ahead", () => {
  const { db, frederik } = club();
  addMeetup(db, frederik, { startsAt: FRIDAY, kind: "party" });
  addMeetup(db, frederik, { startsAt: FRIDAY });
  planned(db, frederik, {}, "2026-11-14T06:00:00Z");
  assert.equal(meetupRemindersDue(db, NOW).length, 0);
});

test("the reminder says how many pages are left, and skips members who are done or opted out", () => {
  const { db, book, frederik, oscar } = club();
  updateProgress(db, book.id, frederik, { page: 150 });
  updateProgress(db, book.id, oscar, { page: 200 });
  planned(db, frederik, {});
  const [meetup] = meetupRemindersDue(db, NOW);
  const message = meetupReminder(db, meetup, frederik);
  assert.equal(message.title, "Read 50 pages by Friday");
  assert.equal(message.body, "Dune: you're on p. 150, the club reads to p. 200 for Fri 20 Nov at 19:00");
  assert.equal(message.url, "/#/meetups");
  assert.equal(message.tag, `meetup-${meetup.id}`);
  assert.equal(meetupReminder(db, meetup, oscar), null, "reached the target");
  updateSettings(db, frederik.id, { notifyMeetups: false });
  assert.equal(meetupReminder(db, meetup, frederik), null, "turned off");
});
