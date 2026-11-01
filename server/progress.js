// Reading progress: how far each member is in the books being read, and the
// notification settings that go with it.

import { transaction } from "./db.js";
import { HttpError } from "./books.js";

export const TIME_ZONE = "Europe/Copenhagen";
const WEEK_MS = 7 * 24 * 3600 * 1000;
// Updates from the same person closer together than this count as one reading session
const SESSION_MS = 60 * 60 * 1000;

export const DEFAULT_SETTINGS = { weeklyDay: 0, weeklyHour: 19, notifyProgress: false };

function percent(page, total) {
  return total ? Math.min(100, Math.round((page / total) * 100)) : null;
}

function bookProgress(db, book, now) {
  const weekAgo = new Date(now.getTime() - WEEK_MS).toISOString();
  const rows = db.prepare(`
    SELECT m.id, m.name, p.page, p.total_pages, p.updated_at,
      (SELECT COALESCE(SUM(l.to_page - l.from_page), 0) FROM progress_log l
        WHERE l.book_id = ? AND l.member_id = m.id AND l.at >= ?) AS week_pages
    FROM members m LEFT JOIN progress p ON p.member_id = m.id AND p.book_id = ?
    WHERE m.active = 1 ORDER BY m.name
  `).all(book.id, weekAgo, book.id);

  const members = rows.map((r) => {
    const totalPages = r.total_pages || book.pages || null;
    const page = r.page || 0;
    return {
      name: r.name,
      page,
      totalPages,
      ownEdition: r.total_pages !== null && r.total_pages !== undefined,
      percent: percent(page, totalPages),
      weekPages: Math.max(0, r.week_pages),
      updatedAt: r.updated_at || null,
    };
  });
  // Furthest first; percentages, since editions differ in length
  members.sort((a, b) => (b.percent ?? -1) - (a.percent ?? -1) || b.page - a.page || a.name.localeCompare(b.name));

  return {
    id: book.id,
    title: book.title,
    image: book.image || "",
    pages: book.pages,
    startedAt: book.started_at,
    members,
  };
}

export function listProgress(db, now = new Date()) {
  const books = db.prepare("SELECT * FROM books WHERE status = 'reading' ORDER BY started_at").all();
  return books.map((book) => bookProgress(db, book, now));
}

function wholeNumber(value, what) {
  const n = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  if (!Number.isInteger(n)) throw new HttpError(400, `${what} must be a whole number.`);
  return n;
}

// body: { page } to say where you are, { add } for pages just read, { totalPages } for your edition (null = the book's)
// Returns the book's progress and, when pages were read, what to tell the others.
export function updateProgress(db, bookId, me, body, now = new Date()) {
  return transaction(db, () => {
    const book = db.prepare("SELECT * FROM books WHERE id = ?").get(bookId);
    if (!book) throw new HttpError(404, "Book not found.");
    if (book.status !== "reading") throw new HttpError(409, "This book is not being read right now.");

    const row = db.prepare("SELECT page, total_pages FROM progress WHERE book_id = ? AND member_id = ?").get(bookId, me.id);
    const oldPage = row?.page || 0;
    let ownTotal = row ? row.total_pages : null;

    if ("totalPages" in body) {
      if (body.totalPages === null || body.totalPages === "") {
        ownTotal = null;
      } else {
        ownTotal = wholeNumber(body.totalPages, "Pages in your edition");
        if (ownTotal < 1 || ownTotal > 20000) throw new HttpError(400, "Pages in your edition must be between 1 and 20000.");
      }
    }
    const total = ownTotal || book.pages || null;

    let page = oldPage;
    if ("add" in body) {
      const add = wholeNumber(body.add, "Pages read");
      if (add < 1 || add > 5000) throw new HttpError(400, "Pages read must be between 1 and 5000.");
      page = oldPage + add;
      if (total) page = Math.min(page, total);
    } else if ("page" in body) {
      page = wholeNumber(body.page, "Page");
      if (page < 0) throw new HttpError(400, "Page can't be negative.");
      if (total && page > total) throw new HttpError(400, `Your edition has ${total} pages. Change that below if it has more.`);
    } else if (!("totalPages" in body)) {
      throw new HttpError(400, "Say which page you are on.");
    }
    if (total && page > total) page = total;

    const at = now.toISOString();
    db.prepare(`
      INSERT INTO progress (book_id, member_id, page, total_pages, updated_at) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT (book_id, member_id) DO UPDATE SET
        page = excluded.page, total_pages = excluded.total_pages, updated_at = excluded.updated_at
    `).run(bookId, me.id, page, ownTotal, at);

    let read = null;
    if (page !== oldPage) {
      db.prepare("INSERT INTO progress_log (book_id, member_id, from_page, to_page, at) VALUES (?, ?, ?, ?, ?)")
        .run(bookId, me.id, oldPage, page, at);
      if (page > oldPage) {
        // Count the whole reading session, so +10 then +10 reads as 20 pages
        const since = new Date(now.getTime() - SESSION_MS).toISOString();
        const first = db.prepare(`
          SELECT from_page FROM progress_log WHERE book_id = ? AND member_id = ? AND at >= ? ORDER BY id LIMIT 1
        `).get(bookId, me.id, since);
        read = {
          member: me.name,
          book: book.title,
          bookId,
          pages: page - Math.min(first?.from_page ?? oldPage, oldPage),
          page,
          percent: percent(page, total),
        };
      }
    }

    return { progress: bookProgress(db, book, now), read };
  });
}

export function progressMessage(read) {
  const pages = read.pages === 1 ? "1 page" : `${read.pages} pages`;
  const where = read.percent === null ? `now on page ${read.page}` : `now on page ${read.page} (${read.percent} %)`;
  return {
    title: `${read.member} just read ${pages}`,
    body: `${read.book}: ${where}`,
    url: "/#/progress",
    // A newer update from the same reading session replaces the notification
    tag: `progress-${read.bookId}-${read.member}`,
  };
}

// --- Settings ---

export function getSettings(db, memberId) {
  const row = db.prepare("SELECT weekly_day, weekly_hour, notify_progress FROM member_settings WHERE member_id = ?").get(memberId);
  if (!row) return { ...DEFAULT_SETTINGS };
  return { weeklyDay: row.weekly_day, weeklyHour: row.weekly_hour, notifyProgress: row.notify_progress === 1 };
}

export function updateSettings(db, memberId, body) {
  const settings = { ...getSettings(db, memberId) };
  if ("weeklyDay" in body) {
    if (body.weeklyDay !== null && !(Number.isInteger(body.weeklyDay) && body.weeklyDay >= 0 && body.weeklyDay <= 6)) {
      throw new HttpError(400, "Pick a day of the week, or off.");
    }
    settings.weeklyDay = body.weeklyDay;
  }
  if ("weeklyHour" in body) {
    if (!(Number.isInteger(body.weeklyHour) && body.weeklyHour >= 0 && body.weeklyHour <= 23)) {
      throw new HttpError(400, "Pick an hour between 0 and 23.");
    }
    settings.weeklyHour = body.weeklyHour;
  }
  if ("notifyProgress" in body) {
    if (typeof body.notifyProgress !== "boolean") throw new HttpError(400, "notifyProgress must be true or false.");
    settings.notifyProgress = body.notifyProgress;
  }
  db.prepare(`
    INSERT INTO member_settings (member_id, weekly_day, weekly_hour, notify_progress) VALUES (?, ?, ?, ?)
    ON CONFLICT (member_id) DO UPDATE SET
      weekly_day = excluded.weekly_day, weekly_hour = excluded.weekly_hour, notify_progress = excluded.notify_progress
  `).run(memberId, settings.weeklyDay, settings.weeklyHour, settings.notifyProgress ? 1 : 0);
  return settings;
}

// Members who want to hear when someone else reads
export function progressListeners(db, exceptMemberId) {
  return db.prepare(`
    SELECT m.id FROM members m JOIN member_settings s ON s.member_id = m.id
    WHERE m.active = 1 AND s.notify_progress = 1 AND m.id != ?
  `).all(exceptMemberId).map((r) => r.id);
}

// --- Weekly status ---

const WEEKDAYS = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export function localTime(date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, weekday: "short", hour: "numeric", hourCycle: "h23" })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  return { weekday: WEEKDAYS[parts.weekday], hour: Number(parts.hour) };
}

// Members whose weekly status is due: their day, at or after their hour, and not sent in the last day
export function weeklyDue(db, now = new Date()) {
  const { weekday, hour } = localTime(now);
  const dayAgo = new Date(now.getTime() - 23 * 3600 * 1000).toISOString();
  return db.prepare(`
    SELECT m.id FROM members m JOIN member_settings s ON s.member_id = m.id
    WHERE m.active = 1 AND s.weekly_day = ? AND s.weekly_hour <= ? AND (s.weekly_sent_at IS NULL OR s.weekly_sent_at < ?)
    UNION
    -- Members without settings get the default
    SELECT m.id FROM members m
    WHERE m.active = 1 AND NOT EXISTS (SELECT 1 FROM member_settings s WHERE s.member_id = m.id)
      AND ? = ? AND ? <= ?
  `).all(weekday, hour, dayAgo, weekday, DEFAULT_SETTINGS.weeklyDay, DEFAULT_SETTINGS.weeklyHour, hour).map((r) => r.id);
}

export function markWeeklySent(db, memberId, now = new Date()) {
  const s = getSettings(db, memberId);
  db.prepare(`
    INSERT INTO member_settings (member_id, weekly_day, weekly_hour, notify_progress, weekly_sent_at) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT (member_id) DO UPDATE SET weekly_sent_at = excluded.weekly_sent_at
  `).run(memberId, s.weeklyDay, s.weeklyHour, s.notifyProgress ? 1 : 0, now.toISOString());
}

// One line per book: everyone's percentage and pages this week. Null when nothing is being read.
export function weeklyMessage(db, now = new Date()) {
  const books = listProgress(db, now);
  if (books.length === 0) return null;
  const lines = books.map((book) => {
    const people = book.members.map((m) => {
      const where = m.percent === null ? `p. ${m.page}` : `${m.percent} %`;
      return m.weekPages ? `${m.name} ${where} (+${m.weekPages})` : `${m.name} ${where}`;
    });
    return `${book.title}: ${people.join(", ")}`;
  });
  return { title: "Weekly reading status", body: lines.join("\n"), url: "/#/progress", tag: "weekly-status" };
}
