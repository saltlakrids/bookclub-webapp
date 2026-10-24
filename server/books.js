import { transaction } from "./db.js";

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function now() {
  return new Date().toISOString();
}

function activeMembers(db) {
  return db.prepare("SELECT id, name FROM members WHERE active = 1 ORDER BY name").all();
}

function baseBook(row) {
  return {
    id: row.id,
    title: row.title,
    pages: row.pages,
    image: row.image || "",
    suggester: row.suggester || "",
    addedAt: row.added_at,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
  };
}

function average(ratings) {
  const scores = ratings.map((r) => r.score).filter((s) => typeof s === "number");
  if (scores.length === 0) return null;
  return scores.reduce((sum, s) => sum + s, 0) / scores.length;
}

const BOOK_SELECT = `
  SELECT b.*, m.name AS suggester
  FROM books b LEFT JOIN members m ON m.id = b.suggester_id
`;

// Scores on books still being read stay hidden until everyone has rated
export function listBooks(db, me) {
  const members = activeMembers(db);
  const ratingRows = db.prepare(`
    SELECT r.book_id, r.member_id, r.score, m.name
    FROM ratings r JOIN members m ON m.id = r.member_id
    ORDER BY m.name
  `).all();
  const ratingsByBook = new Map();
  for (const r of ratingRows) {
    if (!ratingsByBook.has(r.book_id)) ratingsByBook.set(r.book_id, []);
    ratingsByBook.get(r.book_id).push(r);
  }

  const hat = db.prepare(`${BOOK_SELECT} WHERE b.status = 'hat' ORDER BY b.added_at`).all().map(baseBook);

  const reading = db.prepare(`${BOOK_SELECT} WHERE b.status = 'reading' ORDER BY b.started_at`).all().map((row) => {
    const ratings = ratingsByBook.get(row.id) || [];
    const mine = ratings.find((r) => r.member_id === me.id);
    const done = new Set(ratings.map((r) => r.member_id));
    return {
      ...baseBook(row),
      ratedBy: members.filter((m) => done.has(m.id)).map((m) => m.name),
      waitingFor: members.filter((m) => !done.has(m.id)).map((m) => m.name),
      myRating: mine ? { score: mine.score, skipped: mine.score === null } : null,
    };
  });

  const rated = db.prepare(`${BOOK_SELECT} WHERE b.status = 'rated' ORDER BY b.finished_at DESC`).all().map((row) => {
    const ratings = ratingsByBook.get(row.id) || [];
    return {
      ...baseBook(row),
      ratings: ratings.map((r) => ({ member: r.name, score: r.score })),
      average: average(ratings),
    };
  });

  const raters = db.prepare(`
    SELECT DISTINCT m.name FROM ratings r JOIN members m ON m.id = r.member_id
    WHERE r.score IS NOT NULL ORDER BY m.active DESC, m.name
  `).all().map((r) => r.name);

  return { hat, reading, rated, members: members.map((m) => m.name), raters };
}

export function addBook(db, { title, pages, image, suggester }) {
  title = typeof title === "string" ? title.trim() : "";
  if (!title || title.length > 300) {
    throw new HttpError(400, "A title is required.");
  }
  pages = Number.isInteger(pages) && pages > 0 ? pages : null;
  image = typeof image === "string" && /^https?:\/\//.test(image) ? image.replace(/^http:\/\//, "https://") : null;

  const member = db.prepare("SELECT id FROM members WHERE name = ? AND active = 1").get(suggester);
  if (!member) {
    throw new HttpError(400, "Pick who suggested the book.");
  }

  const { lastInsertRowid } = db
    .prepare("INSERT INTO books (title, pages, image, suggester_id, status, added_at) VALUES (?, ?, ?, ?, 'hat', ?)")
    .run(title, pages, image, member.id, now());
  return baseBook(db.prepare(`${BOOK_SELECT} WHERE b.id = ?`).get(lastInsertRowid));
}

// Anyone in the club can give a book a cover, e.g. one the search didn't find
export function setBookImage(db, bookId, image) {
  image = typeof image === "string" ? image.trim() : "";
  if (!/^https?:\/\/\S+$/.test(image) || image.length > 2000) {
    throw new HttpError(400, "That doesn't look like a link to an image.");
  }
  // The site is served over HTTPS, and browsers block plain-HTTP images on it
  image = image.replace(/^http:\/\//, "https://");
  const { changes } = db.prepare("UPDATE books SET image = ? WHERE id = ?").run(image, bookId);
  if (changes === 0) {
    throw new HttpError(404, "Book not found.");
  }
  return baseBook(db.prepare(`${BOOK_SELECT} WHERE b.id = ?`).get(bookId));
}

export function pickBook(db) {
  return transaction(db, () => {
    const row = db.prepare(`${BOOK_SELECT} WHERE b.status = 'hat' ORDER BY random() LIMIT 1`).get();
    if (!row) {
      throw new HttpError(409, "No books to pick from.");
    }
    const startedAt = now();
    db.prepare("UPDATE books SET status = 'reading', started_at = ? WHERE id = ?").run(startedAt, row.id);
    return baseBook({ ...row, status: "reading", started_at: startedAt });
  });
}

// score null = skip. When all active members have rated, the book is finished.
export function rateBook(db, bookId, me, score) {
  if (score !== null && (typeof score !== "number" || !(score >= 1 && score <= 10) || (score * 2) % 1 !== 0)) {
    throw new HttpError(400, "Rating must be between 1 and 10 in steps of 0.5.");
  }

  return transaction(db, () => {
    const book = db.prepare("SELECT id, status FROM books WHERE id = ?").get(bookId);
    if (!book) {
      throw new HttpError(404, "Book not found.");
    }
    if (book.status !== "reading") {
      throw new HttpError(409, "This book is not waiting for ratings.");
    }

    db.prepare(`
      INSERT INTO ratings (book_id, member_id, score, rated_at) VALUES (?, ?, ?, ?)
      ON CONFLICT (book_id, member_id) DO UPDATE SET score = excluded.score, rated_at = excluded.rated_at
    `).run(bookId, me.id, score, now());

    const { missing } = db.prepare(`
      SELECT COUNT(*) AS missing FROM members m
      WHERE m.active = 1 AND NOT EXISTS (SELECT 1 FROM ratings r WHERE r.book_id = ? AND r.member_id = m.id)
    `).get(bookId);

    if (missing === 0) {
      db.prepare("UPDATE books SET status = 'rated', finished_at = ? WHERE id = ?").run(now(), bookId);
    }
    return { finished: missing === 0 };
  });
}
