// node --test server/access.test.js
import { generateKeyPairSync, sign } from "node:crypto";
import { test } from "node:test";
import assert from "node:assert/strict";
import { createAccessVerifier } from "./access.js";

const TEAM = "testteam";
const AUD = "bookclub-aud-tag";
const cloudflareKey = generateKeyPairSync("rsa", { modulusLength: 2048 });
const otherKey = generateKeyPairSync("rsa", { modulusLength: 2048 });

let keyFetches = 0;
const verify = createAccessVerifier({
  team: TEAM,
  aud: AUD,
  fetchKeys: async () => {
    keyFetches++;
    return [{ ...cloudflareKey.publicKey.export({ format: "jwk" }), kid: "key-1" }];
  },
});

const now = () => Math.floor(Date.now() / 1000);

function jwt(claims, { key = cloudflareKey.privateKey, kid = "key-1" } = {}) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const body = `${encode({ alg: "RS256", kid, typ: "JWT" })}.${encode({
    iss: `https://${TEAM}.cloudflareaccess.com`,
    aud: [AUD],
    email: "Oscar@Example.com",
    nbf: now(),
    exp: now() + 3600,
    ...claims,
  })}`;
  return `${body}.${sign("RSA-SHA256", Buffer.from(body), key).toString("base64url")}`;
}

test("a valid token gives the email, lower-cased", async () => {
  assert.equal(await verify(jwt({})), "oscar@example.com");
});

test("forged, foreign, expired and malformed tokens are refused", async () => {
  assert.equal(await verify(jwt({}, { key: otherKey.privateKey })), null);
  assert.equal(await verify(jwt({ aud: ["another-app"] })), null);
  assert.equal(await verify(jwt({ iss: "https://evil.cloudflareaccess.com" })), null);
  assert.equal(await verify(jwt({ exp: now() - 3600 })), null);
  assert.equal(await verify(jwt({ nbf: now() + 3600 })), null);
  assert.equal(await verify(jwt({ email: undefined })), null);
  assert.equal(await verify("not.a.jwt"), null);
});

test("unknown key ids don't hammer Cloudflare", async () => {
  const before = keyFetches;
  await verify(jwt({}, { kid: "unknown-1" }));
  await verify(jwt({}, { kid: "unknown-2" }));
  assert.ok(keyFetches - before <= 1);
});
