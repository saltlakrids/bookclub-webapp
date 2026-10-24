// Sign in through Cloudflare Access. Cloudflare puts its login page in front of
// the app and adds a signed JWT (Cf-Access-Jwt-Assertion) to every request it
// lets through. Only a valid signature from the team's keys, for this app's AUD
// and not expired, counts: the header alone proves nothing, anyone can send it.

import { createPublicKey, verify } from "node:crypto";

export const ACCESS_JWT_HEADER = "cf-access-jwt-assertion";

// After an unknown key id, wait this long before asking Cloudflare again
const REFETCH_MIN_MS = 60_000;
const CLOCK_SKEW_SECONDS = 60;

// Returns async (token) => email or null. fetchKeys is only passed in tests.
export function createAccessVerifier({ team, aud, fetchKeys }) {
  const issuer = `https://${team}.cloudflareaccess.com`;
  const loadKeys =
    fetchKeys ||
    (async () => {
      const response = await fetch(`${issuer}/cdn-cgi/access/certs`, { signal: AbortSignal.timeout(10_000) });
      if (!response.ok) throw new Error(`Cloudflare Access certs: HTTP ${response.status}`);
      return (await response.json()).keys;
    });

  let keys = new Map();
  let lastFetch = 0;
  // Shared by requests that arrive while a fetch is running
  let pending = null;

  async function refresh() {
    const fresh = new Map();
    for (const jwk of await loadKeys()) {
      if (typeof jwk.kid === "string") fresh.set(jwk.kid, createPublicKey({ key: jwk, format: "jwk" }));
    }
    keys = fresh;
  }

  // Cloudflare rotates its keys every few weeks, so an unknown kid triggers a (rate-limited) refetch
  async function keyFor(kid) {
    if (!keys.has(kid) && !pending && Date.now() - lastFetch > REFETCH_MIN_MS) {
      lastFetch = Date.now();
      pending = refresh().finally(() => {
        pending = null;
      });
    }
    if (!keys.has(kid) && pending) await pending;
    return keys.get(kid);
  }

  return async function verifyAccessJwt(token) {
    const parts = String(token).split(".");
    if (parts.length !== 3) return null;
    const [headerPart, payloadPart, signaturePart] = parts;
    try {
      const header = JSON.parse(Buffer.from(headerPart, "base64url").toString());
      if (header.alg !== "RS256" || !header.kid) return null;
      const key = await keyFor(header.kid);
      if (!key) return null;
      const signed = Buffer.from(`${headerPart}.${payloadPart}`);
      if (!verify("RSA-SHA256", signed, key, Buffer.from(signaturePart, "base64url"))) return null;

      const claims = JSON.parse(Buffer.from(payloadPart, "base64url").toString());
      const now = Math.floor(Date.now() / 1000);
      const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
      if (claims.iss !== issuer || !audiences.includes(aud)) return null;
      if (typeof claims.exp !== "number" || claims.exp < now - CLOCK_SKEW_SECONDS) return null;
      if (typeof claims.nbf === "number" && claims.nbf > now + CLOCK_SKEW_SECONDS) return null;
      return typeof claims.email === "string" && claims.email ? claims.email.toLowerCase() : null;
    } catch {
      return null;
    }
  };
}
