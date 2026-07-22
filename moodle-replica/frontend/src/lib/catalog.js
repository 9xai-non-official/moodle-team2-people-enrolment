// Promise cache for read-only catalog lists (users, courses, roles,
// contexts, capabilities). Every select/chip used to refetch on mount —
// against the real DB (~0.9s RTT) a single page switch cost 3-5 identical
// requests. 30s TTL; failures evict so errors stay retryable.
//
// ONLY for lists this UI never mutates — mutated data (participants, groups,
// completion…) keeps the refetch-after-write rule and must NOT go through
// this cache.
import { apiGet } from "../api";

const TTL_MS = 30_000;
const cache = new Map(); // path → { at, promise }

export function cachedGet(path) {
  const hit = cache.get(path);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.promise;
  const promise = apiGet(path).catch((e) => {
    cache.delete(path);
    throw e;
  });
  cache.set(path, { at: Date.now(), promise });
  return promise;
}
