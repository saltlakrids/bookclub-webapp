// Slow Guys Book Club server: JSON API + the built Vue app, backed by SQLite.
//
// Login comes from Tailscale. The server only listens on localhost and
// `tailscale serve` proxies to it, adding the Tailscale-User-Login header for
// whoever is on the other end. Each Tailscale login claims one member once.

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { openDb } from "./db.js";
import { HttpError, addBook, listBooks, pickBook, rateBook } from "./books.js";
import { searchBooks } from "./search.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const PORT = Number(process.env.PORT || 8100);
const HOST = process.env.HOST || "127.0.0.1";
const DB_PATH = process.env.DB_PATH || join(here, "..", "data", "bookclub.db");
const STATIC_DIR = resolve(process.env.STATIC_DIR || join(here, "..", "dist"));
const GOOGLE_BOOKS_API_KEY = process.env.GOOGLE_BOOKS_API_KEY || "";
const DEV_LOGIN = process.env.NODE_ENV === "production" ? "" : process.env.DEV_LOGIN || "";

const db = openDb(DB_PATH);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".mp3": "audio/mpeg",
  ".woff2": "font/woff2",
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "same-origin",
    ...headers,
  });
  res.end(body);
}

function sendJson(res, status, data) {
  send(res, status, JSON.stringify(data), {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
}

// Every write must be JSON, so a plain HTML form on another site cannot post here
function requireJson(req) {
  if (req.method !== "GET" && !(req.headers["content-type"] || "").startsWith("application/json")) {
    throw new HttpError(415, "Expected JSON.");
  }
}

async function readJson(req) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 10_000) throw new HttpError(413, "Request too large.");
  }
  try {
    return body ? JSON.parse(body) : {};
  } catch {
    throw new HttpError(400, "Invalid JSON.");
  }
}

function currentLogin(req) {
  const login = req.headers["tailscale-user-login"];
  return (typeof login === "string" && login) || DEV_LOGIN || null;
}

function memberFor(login) {
  return db.prepare("SELECT id, name FROM members WHERE tailscale_login = ? AND active = 1").get(login) || null;
}

function requireMember(req) {
  const login = currentLogin(req);
  if (!login) throw new HttpError(401, "Open the app through Tailscale to sign in.");
  const member = memberFor(login);
  if (!member) throw new HttpError(403, "Choose who you are first.");
  return member;
}

async function handleApi(req, res, url) {
  const route = `${req.method} ${url.pathname}`;
  requireJson(req);

  if (route === "GET /api/me") {
    const login = currentLogin(req);
    const members = db.prepare("SELECT name, tailscale_login IS NULL AS free FROM members WHERE active = 1 ORDER BY name").all();
    return sendJson(res, 200, {
      login,
      member: login ? memberFor(login) : null,
      members: members.map((m) => m.name),
      unclaimed: members.filter((m) => m.free).map((m) => m.name),
    });
  }

  if (route === "POST /api/me/claim") {
    const login = currentLogin(req);
    if (!login) throw new HttpError(401, "Open the app through Tailscale to sign in.");
    if (memberFor(login)) throw new HttpError(409, "You have already chosen who you are.");
    const { member } = await readJson(req);
    const { changes } = db
      .prepare("UPDATE members SET tailscale_login = ? WHERE name = ? AND active = 1 AND tailscale_login IS NULL")
      .run(login, String(member || ""));
    if (changes === 0) throw new HttpError(409, "That member is already taken.");
    return sendJson(res, 200, { member: memberFor(login) });
  }

  const me = requireMember(req);

  if (route === "GET /api/books") {
    return sendJson(res, 200, listBooks(db, me));
  }

  if (route === "POST /api/books") {
    const body = await readJson(req);
    return sendJson(res, 201, addBook(db, body));
  }

  if (route === "POST /api/pick") {
    return sendJson(res, 200, pickBook(db));
  }

  const ratingMatch = url.pathname.match(/^\/api\/books\/(\d+)\/rating$/);
  if (ratingMatch && req.method === "PUT") {
    const { score = null } = await readJson(req);
    return sendJson(res, 200, rateBook(db, Number(ratingMatch[1]), me, score));
  }

  if (route === "GET /api/search") {
    const query = (url.searchParams.get("q") || "").trim();
    if (query.length < 3) return sendJson(res, 200, []);
    try {
      return sendJson(res, 200, await searchBooks(query.slice(0, 200), GOOGLE_BOOKS_API_KEY));
    } catch (error) {
      console.error("Search failed:", error.message);
      throw new HttpError(502, "Search is not working right now, try again later.");
    }
  }

  throw new HttpError(404, "Not found.");
}

async function serveStatic(req, res, url) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return send(res, 405, "Method not allowed");
  }
  let path = normalize(join(STATIC_DIR, decodeURIComponent(url.pathname)));
  if (path !== STATIC_DIR && !path.startsWith(STATIC_DIR + sep)) {
    return send(res, 404, "Not found");
  }
  try {
    if ((await stat(path)).isDirectory()) path = join(path, "index.html");
  } catch {
    // Unknown paths get the app, the router lives after the #
    path = join(STATIC_DIR, "index.html");
  }
  try {
    const body = await readFile(path);
    const hashed = /[.-][0-9a-f]{8}\.(js|css|png|jpe?g|gif|svg|woff2?)$/.test(path);
    send(res, 200, req.method === "HEAD" ? undefined : body, {
      "Content-Type": MIME[extname(path).toLowerCase()] || "application/octet-stream",
      "Cache-Control": hashed ? "public, max-age=31536000, immutable" : "no-cache",
    });
  } catch {
    send(res, 404, "Not found");
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  try {
    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url);
    } else {
      await serveStatic(req, res, url);
    }
  } catch (error) {
    if (error instanceof HttpError) {
      sendJson(res, error.status, { error: error.message });
    } else {
      console.error(error);
      sendJson(res, 500, { error: "Something went wrong." });
    }
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Book club listening on http://${HOST}:${PORT} (db: ${DB_PATH})`);
  if (DEV_LOGIN) console.log(`Dev login: ${DEV_LOGIN}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    server.close();
    db.close();
    process.exit(0);
  });
}
