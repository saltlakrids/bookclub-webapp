// node --test server/search.test.js
import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { searchBooks } from "./search.js";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const json = (body) => ({ ok: true, status: 200, json: async () => body });
const googleBody = { items: [{ id: "g1", volumeInfo: { title: "From Google", authors: ["A"], pageCount: 100 } }] };
const openLibraryBody = { docs: [{ key: "/works/1", title: "From Open Library", author_name: ["B"] }] };

// Fake sources: google is "ok", "empty", "error" or "slow-error"; Open Library answers after olMs
function fakeFetch({ google, olMs }) {
  return async (url) => {
    if (url.includes("googleapis")) {
      if (google === "error") return { ok: false, status: 429 };
      if (google === "empty") return json({});
      return json(googleBody);
    }
    await delay(olMs);
    return json(openLibraryBody);
  };
}

test("Google's answer is used without waiting for a slow Open Library", async () => {
  globalThis.fetch = fakeFetch({ google: "ok", olMs: 3000 });
  const started = Date.now();
  const result = await searchBooks("test one", "key");
  assert.equal(result[0].title, "From Google");
  assert.ok(Date.now() - started < 1000);
});

test("Open Library takes over when Google fails or finds nothing", async () => {
  globalThis.fetch = fakeFetch({ google: "error", olMs: 10 });
  assert.equal((await searchBooks("test two", "key"))[0].title, "From Open Library");
  globalThis.fetch = fakeFetch({ google: "empty", olMs: 10 });
  assert.equal((await searchBooks("test three", "key"))[0].title, "From Open Library");
});

test("without a key only Open Library is asked", async () => {
  let googleAsked = false;
  const inner = fakeFetch({ google: "ok", olMs: 10 });
  globalThis.fetch = (url) => {
    if (url.includes("googleapis")) googleAsked = true;
    return inner(url);
  };
  assert.equal((await searchBooks("test four", ""))[0].title, "From Open Library");
  assert.equal(googleAsked, false);
});
