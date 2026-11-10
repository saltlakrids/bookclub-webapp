// Book club meetups and parties: planning them, adding them to calendars and
// reminding members who are behind on the reading.

import { transaction } from "./db.js";
import { HttpError } from "./books.js";
import { TIME_ZONE } from "./progress.js";

const HOUR_MS = 3600 * 1000;
const DAY_MS = 24 * HOUR_MS;
export const MEETUP_LENGTH_MS = 3 * HOUR_MS;
const KINDS = ["meetup", "party"];
const MAX_DESCRIPTION = 500;

function isoDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) {
    throw new HttpError(400, "Pick a date and time.");
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new HttpError(400, "Pick a date and time.");
  const year = date.getUTCFullYear();
  if (year < 2000 || year > 2100) throw new HttpError(400, "That date is too far away.");
  return date;
}

function activeMembers(db) {
  return db.prepare("SELECT id, name FROM members WHERE active = 1 ORDER BY name").all();
}

// A member's own edition can have other page numbers: scale the club's target to it
function targetFor(target, bookPages, ownPages) {
  if (!target) return null;
  if (!bookPages || !ownPages || ownPages === bookPages) return target;
  return Math.max(1, Math.min(ownPages, Math.round((target / bookPages) * ownPages)));
}

function memberPages(db, row, member) {
  const p = db.prepare("SELECT page, total_pages FROM progress WHERE book_id = ? AND member_id = ?").get(row.book_id, member.id);
  const totalPages = p?.total_pages || row.book_pages || null;
  const page = p?.page || 0;
  const target = targetFor(row.read_to_page, row.book_pages, totalPages);
  return { name: member.name, page, totalPages, target, toGo: target ? Math.max(0, target - page) : null, done: target ? page >= target : false };
}

const SELECT = `
  SELECT u.*, b.title AS book_title, b.image AS book_image, b.pages AS book_pages
  FROM meetups u LEFT JOIN books b ON b.id = u.book_id
`;

export function calendarTitle(meetup) {
  if (meetup.kind === "party") return "Book club party";
  return meetup.book ? `Book club: ${meetup.book.title}` : "Book club meetup";
}

export function calendarText(meetup) {
  const lines = [];
  if (meetup.description) lines.push(meetup.description);
  if (meetup.readToPage) lines.push(`Read up to p. ${meetup.readToPage}${meetup.book ? ` of ${meetup.book.title}` : ""}.`);
  return lines.join("\n");
}

function compact(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

// Links that open a prefilled new event in the web calendars
export function calendarLinks(meetup) {
  const start = new Date(meetup.startsAt);
  const end = new Date(meetup.endsAt);
  const title = calendarTitle(meetup);
  const text = calendarText(meetup);
  const google = new URLSearchParams({ action: "TEMPLATE", text: title, dates: `${compact(start)}/${compact(end)}`, details: text });
  const outlook = () => new URLSearchParams({
    path: "/calendar/action/compose", rru: "addevent", subject: title, body: text,
    startdt: start.toISOString(), enddt: end.toISOString(),
  });
  return {
    google: `https://calendar.google.com/calendar/render?${google}`,
    outlook: `https://outlook.live.com/calendar/0/action/compose?${outlook()}`,
    office365: `https://outlook.office.com/calendar/0/action/compose?${outlook()}`,
    ics: `/api/meetups/${meetup.id}.ics`,
  };
}

function toMeetup(db, row, members) {
  const meetup = {
    id: row.id,
    kind: row.kind,
    startsAt: row.starts_at,
    endsAt: row.ends_at || new Date(new Date(row.starts_at).getTime() + MEETUP_LENGTH_MS).toISOString(),
    description: row.description,
    readToPage: row.read_to_page,
    book: row.book_id ? { id: row.book_id, title: row.book_title, image: row.book_image || "", pages: row.book_pages } : null,
    members: row.read_to_page ? members.map((m) => memberPages(db, row, m)) : [],
  };
  meetup.calendar = calendarLinks(meetup);
  return meetup;
}

export function listMeetups(db, me, now = new Date()) {
  const members = activeMembers(db);
  const all = db.prepare(`${SELECT} ORDER BY u.starts_at, u.id`).all().map((r) => toMeetup(db, r, members));
  // A meetup stays "next" until it has ended
  const upcoming = all.filter((m) => new Date(m.endsAt) > now);
  const past = all.filter((m) => new Date(m.endsAt) <= now).reverse();
  const mine = (m) => m.members.find((x) => x.name === me.name) || null;
  const withMine = (m) => ({ ...m, mine: mine(m) });
  return { upcoming: upcoming.map(withMine), past: past.map(withMine) };
}

export function getMeetup(db, id) {
  const row = db.prepare(`${SELECT} WHERE u.id = ?`).get(id);
  if (!row) throw new HttpError(404, "Meetup not found.");
  return toMeetup(db, row, activeMembers(db));
}

// body: { kind, startsAt, description, bookId, readToPage }. `current` is the stored row when editing.
function checked(db, body, current) {
  const has = (key) => key in body;
  const kind = has("kind") ? body.kind : current?.kind ?? "meetup";
  if (!KINDS.includes(kind)) throw new HttpError(400, "Pick meetup or party.");

  const startsAt = has("startsAt") ? isoDate(body.startsAt) : current ? new Date(current.starts_at) : isoDate(undefined);

  let description = has("description") ? body.description : current?.description ?? "";
  if (description === null || description === undefined) description = "";
  if (typeof description !== "string") throw new HttpError(400, "The description must be text.");
  description = description.trim();
  if (description.length > MAX_DESCRIPTION) throw new HttpError(400, `The description can be at most ${MAX_DESCRIPTION} characters.`);

  let bookId = null;
  let readToPage = null;
  if (kind === "meetup") {
    if (has("bookId")) bookId = body.bookId;
    else if (current) bookId = current.book_id;
    else bookId = db.prepare("SELECT id FROM books WHERE status = 'reading' ORDER BY started_at LIMIT 1").get()?.id ?? null;
    if (bookId === "" || bookId === undefined) bookId = null;
    let book = null;
    if (bookId !== null) {
      book = Number.isInteger(bookId) ? db.prepare("SELECT id, pages FROM books WHERE id = ?").get(bookId) : null;
      if (!book) throw new HttpError(400, "Pick a book from the list.");
    }
    readToPage = has("readToPage") ? body.readToPage : current && current.book_id === bookId ? current.read_to_page : null;
    if (readToPage === "" || readToPage === undefined) readToPage = null;
    if (readToPage !== null) {
      const n = typeof readToPage === "string" ? Number(readToPage) : readToPage;
      if (!book) throw new HttpError(400, "Pick a book to read up to a page in.");
      if (!Number.isInteger(n) || n < 1) throw new HttpError(400, "The page to read up to must be a whole number.");
      if (book.pages && n > book.pages) throw new HttpError(400, `The book has ${book.pages} pages.`);
      readToPage = n;
    }
  } else if ((has("bookId") && body.bookId) || (has("readToPage") && body.readToPage)) {
    throw new HttpError(400, "Only a meetup has a book.");
  }
  return { kind, startsAt, description, bookId, readToPage };
}

export function addMeetup(db, me, body) {
  const m = checked(db, body, null);
  const id = Number(db.prepare(`
    INSERT INTO meetups (kind, starts_at, ends_at, description, book_id, read_to_page, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    m.kind, m.startsAt.toISOString(), new Date(m.startsAt.getTime() + MEETUP_LENGTH_MS).toISOString(),
    m.description, m.bookId, m.readToPage, me?.id ?? null, new Date().toISOString(),
  ).lastInsertRowid);
  return getMeetup(db, id);
}

export function updateMeetup(db, id, body) {
  return transaction(db, () => {
    const current = db.prepare("SELECT * FROM meetups WHERE id = ?").get(id);
    if (!current) throw new HttpError(404, "Meetup not found.");
    const m = checked(db, body, current);
    const startsAt = m.startsAt.toISOString();
    const moved = startsAt !== current.starts_at;
    db.prepare(`
      UPDATE meetups SET kind = ?, starts_at = ?, ends_at = ?, description = ?, book_id = ?, read_to_page = ?,
        reminder_sent_at = CASE WHEN ? THEN NULL ELSE reminder_sent_at END
      WHERE id = ?
    `).run(
      m.kind, startsAt, new Date(m.startsAt.getTime() + MEETUP_LENGTH_MS).toISOString(),
      m.description, m.bookId, m.readToPage, moved ? 1 : 0, id,
    );
    return getMeetup(db, id);
  });
}

export function deleteMeetup(db, id) {
  const { changes } = db.prepare("DELETE FROM meetups WHERE id = ?").run(id);
  if (changes === 0) throw new HttpError(404, "Meetup not found.");
  return { ok: true };
}

// --- Calendar file ---

function icsEscape(text) {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

// Lines are at most 75 octets; continuation lines start with a space
function icsFold(line) {
  const out = [];
  let current = "";
  let bytes = 0;
  for (const char of line) {
    const size = Buffer.byteLength(char);
    if (bytes + size > (out.length === 0 ? 75 : 74)) {
      out.push(current);
      current = "";
      bytes = 0;
    }
    current += char;
    bytes += size;
  }
  out.push(current);
  return out.join("\r\n ");
}

export function meetupIcs(meetup, now = new Date()) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Slow Guys Book Club//Meetups//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:meetup-${meetup.id}@bookclub`,
    `DTSTAMP:${compact(now)}`,
    `DTSTART:${compact(new Date(meetup.startsAt))}`,
    `DTEND:${compact(new Date(meetup.endsAt))}`,
    `SUMMARY:${icsEscape(calendarTitle(meetup))}`,
    `DESCRIPTION:${icsEscape(calendarText(meetup))}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${icsEscape(calendarTitle(meetup))}`,
    "TRIGGER:-P1D",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(icsFold).join("\r\n") + "\r\n";
}

// --- Reminders ---

// Meetups with a page target that start within a week and haven't been reminded about.
// One planned less than a week ahead is skipped: there was no time for a reminder.
export function meetupRemindersDue(db, now = new Date()) {
  const soon = new Date(now.getTime() + 7 * DAY_MS).toISOString();
  const members = activeMembers(db);
  return db.prepare(`${SELECT} WHERE u.kind = 'meetup' AND u.read_to_page IS NOT NULL AND u.reminder_sent_at IS NULL
      AND u.starts_at > ? AND u.starts_at <= ?`)
    .all(now.toISOString(), soon)
    .filter((r) => new Date(r.starts_at).getTime() - new Date(r.created_at).getTime() > 7 * DAY_MS)
    .map((r) => toMeetup(db, r, members));
}

export function markReminderSent(db, id, now = new Date()) {
  db.prepare("UPDATE meetups SET reminder_sent_at = ? WHERE id = ?").run(now.toISOString(), id);
}

function when(date) {
  const part = (opts) => new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, ...opts }).format(date);
  return {
    weekday: part({ weekday: "long" }),
    text: `${part({ weekday: "short" })} ${part({ day: "numeric", month: "short" })} at ${part({ hour: "2-digit", minute: "2-digit", hourCycle: "h23" })}`,
  };
}

// What to tell a member who is behind, or null when they have no need for it
export function meetupReminder(db, meetup, member) {
  if (!meetup.readToPage) return null;
  const settings = db.prepare("SELECT notify_meetups FROM member_settings WHERE member_id = ?").get(member.id);
  if (settings && settings.notify_meetups !== 1) return null;
  const mine = meetup.members.find((m) => m.name === member.name);
  if (!mine || mine.done) return null;
  const date = when(new Date(meetup.startsAt));
  const pages = mine.toGo === 1 ? "1 page" : `${mine.toGo} pages`;
  return {
    title: `Read ${pages} by ${date.weekday}`,
    body: `${meetup.book.title}: you're on p. ${mine.page}, the club reads to p. ${mine.target} for ${date.text}`,
    url: "/#/meetups",
    tag: `meetup-${meetup.id}`,
  };
}
