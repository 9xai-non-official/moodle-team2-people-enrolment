// API-event-log recorder. Wraps a real request so the log row IS the request:
// a "pending" row appears before the call, then flips to the true HTTP result
// (or the ApiError's status + verbatim reasons) when it settles. The trail is
// the proof — nothing here is fabricated.
//
// SECURITY: only method, endpoint, status, duration and a caller-supplied SAFE
// summary are stored. Never pass request/response bodies containing passwords,
// tokens, headers or full user records to `summarize`.
import { useCallback, useState } from "react";
import { ApiError } from "../../api";

const MAX_ENTRIES = 200; // bound the log so repeated runs can't grow unbounded (§51)
let seq = 0;
const clock = () =>
  typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();

export function useApiLog() {
  const [entries, setEntries] = useState([]);
  const clear = useCallback(() => setEntries([]), []);

  const record = useCallback(async (method, endpoint, fn, opts = {}) => {
    const id = ++seq;
    const started = clock();
    const row = { id, method, endpoint, at: new Date(), step: opts.step ?? null, status: "pending" };
    setEntries((l) => cap([...l, row]));
    const patch = (extra) =>
      setEntries((l) => l.map((e) => (e.id === id ? { ...e, ...extra } : e)));

    try {
      const data = await fn();
      // The api layer collapses status to json|null (204), so success codes are
      // inferred from the verb: DELETE→204, everything else→200. Only ever set
      // AFTER the promise resolves (spec §28).
      patch({
        status: opts.status ?? (method === "DELETE" ? 204 : 200),
        ok: true,
        ms: Math.round(clock() - started),
        detail: opts.summarize ? opts.summarize(data) : undefined,
      });
      return data;
    } catch (err) {
      const status = err instanceof ApiError ? err.status : "ERR";
      const reasons =
        err instanceof ApiError && err.reasons?.length ? err.reasons : [err.message];
      patch({
        status,
        ok: false,
        ms: Math.round(clock() - started),
        error: err.message,
        reasons,
      });
      throw err;
    }
  }, []);

  return { entries, record, clear };
}

function cap(list) {
  return list.length > MAX_ENTRIES ? list.slice(list.length - MAX_ENTRIES) : list;
}
