// API helper. Points at the FastAPI backend during development.
// Mock mode (VITE_USE_MOCKS=1): known routes are served from src/mocks/*;
// anything unmatched falls through to the real backend, so landed endpoints
// keep working while missing ones stay mocked (task 06 §8).
import { ApiError } from "./errors";
import { mockRequest } from "./mocks";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8010";
const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === "1";

// Principal header (interim identity assertion — see backend app/deps.py).
// ActingUser context keeps this in sync; the server validates the account
// and makes every capability decision itself.
//
// Two identity mechanisms coexist in this backend (both derive AUTHORITY
// server-side from the id — never from the client):
//   • X-Acting-User header  — app/deps.current_user (enrolment/groups/… routes)
//   • Authorization: Bearer — app/services/auth.get_current_user (the roles &
//     permissions mutations + /check + /assignable, which are actor-relative).
// The SPA has no login/IdP, so we mint the Bearer via the backend's DEV-ONLY
// /permissions/dev-login (gated by AUTH_DEV_LOGIN + AUTH_SECRET). It is
// best-effort: if dev-login is unavailable (mock mode, or a deploy with the
// gate off) we simply send no token and the Bearer-gated routes answer 401
// honestly. The token's `sub` IS the acting user — so "Acting as X" is a true
// statement about backend identity, not a UI fiction.
let actingUserId = null;
let bearerToken = null; // token for `actingUserId`, or null
let tokenForId = null; // which id `bearerToken` belongs to
let tokenPromise = null; // in-flight dev-login, so we mint at most once per id

export function setApiActingUser(id) {
  if (id === actingUserId) return;
  actingUserId = id;
  // Invalidate any token from the previous identity and pre-warm the new one.
  bearerToken = null;
  tokenForId = null;
  tokenPromise = null;
  if (id != null && !USE_MOCKS) ensureToken(id);
}

// Mint (and cache) a Bearer token for `id` via the dev-login stand-in. Never
// throws — a failure just means no token is attached (routes 401 honestly).
async function ensureToken(id) {
  if (bearerToken && tokenForId === id) return bearerToken;
  if (tokenPromise && tokenForId === id) return tokenPromise;
  tokenForId = id;
  tokenPromise = fetch(`${BASE_URL}/api/permissions/dev-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: id }),
  })
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      if (data?.token && tokenForId === id) bearerToken = data.token;
      return bearerToken;
    })
    .catch(() => null);
  return tokenPromise;
}

// Global activity + write signals: the shell renders a thin top progress bar
// while anything is in flight and a toast after successful writes — zero
// per-component wiring, so no fetch can feel like a hang and no save can go
// unacknowledged.
let inflight = 0;
function signalActivity(delta) {
  inflight = Math.max(0, inflight + delta);
  window.dispatchEvent(new CustomEvent("api-activity", { detail: inflight }));
}
function signalWrite(method, path) {
  window.dispatchEvent(new CustomEvent("api-write", { detail: { method, path } }));
}

async function request(method, path, body) {
  if (USE_MOCKS) {
    signalActivity(+1);
    try {
      const hit = await mockRequest(method, path, body, { actingUserId });
      if (hit) {
        if (method !== "GET") signalWrite(method, path);
        return hit.data; // mock 403/409s throw ApiError from the handler
      }
    } finally {
      signalActivity(-1);
    }
  }

  // Bearer-gated routes need a token for the acting identity; mint-and-cache
  // it first (no-op after the first call, and for open routes the header is
  // simply ignored). Best-effort: a null token just isn't attached.
  const token =
    actingUserId != null ? await ensureToken(actingUserId).catch(() => null) : null;

  signalActivity(+1);
  try {
    const headers = {};
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (actingUserId != null) headers["X-Acting-User"] = String(actingUserId);
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      // FastAPI: {"detail": ...}; domain endpoints: reason/reasons fields.
      let payload = null;
      try {
        payload = await res.json();
      } catch {
        payload = { detail: res.statusText };
      }
      throw new ApiError(res.status, payload, `${method} ${path.split("?")[0]}`);
    }
    if (method !== "GET") signalWrite(method, path);
    if (res.status === 204) return null;
    return res.json();
  } finally {
    signalActivity(-1);
  }
}

export const apiGet = (path) => request("GET", path);
export const apiPost = (path, body) => request("POST", path, body ?? {});
export const apiPut = (path, body) => request("PUT", path, body ?? {});
export const apiPatch = (path, body) => request("PATCH", path, body ?? {});
export const apiDelete = (path) => request("DELETE", path);

export { BASE_URL, USE_MOCKS, ApiError };
