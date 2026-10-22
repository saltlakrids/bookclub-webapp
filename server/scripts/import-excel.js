// One-off import of the old ratings spreadsheet into SQLite.
//
//   node server/scripts/import-excel.js <sheet.xlsx> [--db path] [--firestore export.json] [--covers] [--replace]
//
// Expected columns: Title, one column per member with their score, Started at,
// Finished at, Pages. Rows with a title but no "Finished at" are imported as
// currently being read. --firestore takes the output of export-firestore.js and
// borrows cover images and suggesters from it, --covers looks up missing covers
// on Open Library.

import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { readFileSync } from "node:fs";
import ExcelJS from "exceljs";
import { openDb, transaction } from "../db.js";
import { searchOpenLibrary } from "../search.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const { values: options, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    db: { type: "string", default: join(here, "..", "..", "data", "bookclub.db") },
    firestore: { type: "string" },
    covers: { type: "boolean", default: false },
    replace: { type: "boolean", default: false },
  },
});

if (positionals.length !== 1) {
  console.error("Usage: node server/scripts/import-excel.js <sheet.xlsx> [--db path] [--firestore export.json] [--covers] [--replace]");
  process.exit(1);
}

// Old suggester names that belong to a current member
const NAME_ALIASES = { Michael: "Dumstrei" };

const MONTHS = {
  jan: 1, feb: 2, mar: 3, apr: 4, maj: 5, may: 6, jun: 7, jul: 8,
  aug: 9, sep: 10, okt: 10, oct: 10, nov: 11, dec: 12,
};

function pad(n) {
  return String(n).padStart(2, "0");
}

// Handles real dates, "28.05.2021" and month names like "marts 2021"
function parseDate(value) {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) {
    return `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())}`;
  }
  const text = String(value).trim().toLowerCase();
  let match = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (match) return `${match[3]}-${pad(match[2])}-${pad(match[1])}`;
  match = text.match(/^([a-zæøå]+)\.?\s+(\d{4})$/);
  if (match && MONTHS[match[1].slice(0, 3)]) return `${match[2]}-${pad(MONTHS[match[1].slice(0, 3)])}-01`;
  console.warn(`  Could not read date "${value}", leaving it empty`);
  return null;
}

function cellValue(cell) {
  const value = cell.value;
  if (value && typeof value === "object" && !(value instanceof Date)) {
    if ("result" in value) return value.result;
    if ("text" in value) return value.text;
    if (value.richText) return value.richText.map((part) => part.text).join("");
  }
  return value;
}

function words(title) {
  return String(title).toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean);
}

// Every word of the sheet title appears in the other title, or the other way round
function sameBook(a, b) {
  const wa = words(a);
  const wb = words(b);
  return wa.every((w) => wb.includes(w)) || wb.every((w) => wa.includes(w));
}

async function readSheet(path) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path);
  const sheet = workbook.worksheets[0];
  const header = sheet.getRow(1).values.map((v) => (typeof v === "string" ? v.trim() : v));
  const column = (name) => header.findIndex((h) => typeof h === "string" && h.toLowerCase() === name.toLowerCase());

  const rows = [];
  sheet.eachRow({ includeEmpty: false }, (row, number) => {
    if (number === 1) return;
    const get = (index) => (index > 0 ? cellValue(row.getCell(index)) : null);
    const title = get(column("Title"));
    if (title === null || title === undefined || String(title).trim() === "") return;
    rows.push({ get, title: String(title).trim() });
  });
  return { rows, header, column };
}

const { rows, header, column } = await readSheet(positionals[0]);
const db = openDb(options.db);
const members = db.prepare("SELECT id, name FROM members").all();
const memberColumns = members
  .map((m) => ({ ...m, index: column(m.name) }))
  .filter((m) => m.index > 0);
const unknown = header.filter((h) => typeof h === "string" && /^[A-ZÆØÅ][a-zæøå]+$/.test(h) &&
  !["Title", "Average", "Pages"].includes(h) && !members.some((m) => m.name === h));
if (unknown.length) {
  console.warn(`Columns that look like people but are not members, ignored: ${unknown.join(", ")}`);
}

const firestore = options.firestore ? JSON.parse(readFileSync(options.firestore, "utf8")) : null;
// The "rated" collection held test data, so only the hat and waiting list are trusted for suggesters
const firestoreBooks = firestore ? [...firestore.books, ...firestore.ratings, ...firestore.rated] : [];
const trustedSuggesters = firestore ? [...firestore.books, ...firestore.ratings] : [];

function fromFirestore(title) {
  const matches = firestoreBooks.filter((b) => b.title && sameBook(title, b.title));
  const image = matches.map((b) => b.image).find(Boolean) || null;
  const pages = Number(matches.map((b) => b.pages).find(Boolean)) || null;
  const names = new Set(trustedSuggesters
    .filter((b) => b.title && sameBook(title, b.title) && b.suggester)
    .map((b) => NAME_ALIASES[b.suggester] || b.suggester));
  return {
    image: image && image.replace(/^http:\/\//, "https://"),
    pages,
    suggester: names.size === 1 ? [...names][0] : null,
  };
}

const books = [];
for (const { get, title } of rows) {
  const extra = fromFirestore(title);
  if (!extra.image && options.covers) {
    try {
      const [hit] = await searchOpenLibrary(title, 1);
      extra.image = hit?.image || null;
    } catch (error) {
      console.warn(`  No cover for "${title}": ${error.message}`);
    }
  }
  const finishedAt = parseDate(get(column("Finished at")));
  const pages = Number(get(column("Pages")));
  books.push({
    title,
    pages: Number.isFinite(pages) && pages > 0 ? Math.round(pages) : extra.pages,
    image: extra.image,
    suggesterId: members.find((m) => m.name === extra.suggester)?.id ?? null,
    startedAt: parseDate(get(column("Started at"))),
    finishedAt,
    status: finishedAt ? "rated" : "reading",
    ratings: memberColumns
      .filter((m) => get(m.index) !== null && get(m.index) !== "")
      .map((m) => ({ memberId: m.id, score: Number(get(m.index)) }))
      .filter((r) => r.score >= 1 && r.score <= 10),
  });
}

transaction(db, () => {
  const existing = db.prepare("SELECT COUNT(*) AS count FROM books").get().count;
  if (existing > 0 && !options.replace) {
    throw new Error(`The database already has ${existing} books. Use --replace to wipe them first.`);
  }
  if (options.replace) {
    db.exec("DELETE FROM ratings; DELETE FROM books;");
  }

  const insertBook = db.prepare(`
    INSERT INTO books (title, pages, image, suggester_id, status, added_at, started_at, finished_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertRating = db.prepare("INSERT INTO ratings (book_id, member_id, score, rated_at) VALUES (?, ?, ?, ?)");

  for (const book of books) {
    const addedAt = book.startedAt || new Date().toISOString();
    const { lastInsertRowid } = insertBook.run(
      book.title, book.pages, book.image, book.suggesterId, book.status, addedAt, book.startedAt, book.finishedAt
    );
    for (const rating of book.ratings) {
      insertRating.run(lastInsertRowid, rating.memberId, rating.score, book.finishedAt || addedAt);
    }
  }
});

db.close();

const rated = books.filter((b) => b.status === "rated");
console.log(`Imported ${rated.length} rated books and ${books.length - rated.length} being read into ${options.db}`);
console.log(`Covers: ${books.filter((b) => b.image).length}/${books.length}, suggesters: ${books.filter((b) => b.suggesterId).length}/${books.length}`);
