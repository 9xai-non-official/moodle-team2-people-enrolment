// ApiError — carries the backend's "why" to the UI.
// The UI must show backend reasons verbatim (task 06 §6): `reasons` feeds
// ReasonList; `message` is the fallback single-line text.
//
// Three payload shapes reach here:
//   1. FastAPI's own          {detail}
//   2. domain endpoints       {ok, reason} / {reasons} / {blocking_reasons}
//   3. the global DB handler  {ok, code, reason, detail, constraint?}
//
// Shape 3 is new (backend app/errors.py) and is what a constraint violation
// now looks like instead of a bare 500 — a lost race on the guest-method index
// arrives as code "conflict", a write-once completion as "restricted". `code`
// is the stable machine-readable half: branch on it rather than string-matching
// `reason`, which is the database's own prose and will change wording.
export class ApiError extends Error {
  constructor(status, payload, request) {
    const detail = payload?.detail ?? payload?.reason ?? null;
    const reasons =
      payload?.reasons ?? payload?.blocking_reasons ?? (detail ? [detail] : []);
    const base =
      typeof detail === "string"
        ? detail
        : reasons.length
          ? String(reasons[0])
          : `HTTP ${status}`;
    // Self-locating message ("GET /api/x → 404: Not Found") so an error banner
    // names the endpoint — that's how bugs get filed to the owning teammate
    // (task 06 §5). reasons[] stays verbatim for ReasonList.
    super(request ? `${request} → ${status}: ${base}` : base);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload ?? null;
    this.reasons = reasons.map((r) =>
      typeof r === "string" ? r : (r.reason ?? JSON.stringify(r)),
    );
    // Stable across wording changes; null for shapes 1 and 2.
    this.code = payload?.code ?? null;
    // Which constraint failed, when the database named one. Useful for telling
    // two 409s apart — a duplicate guest method vs a duplicate crit-compl.
    this.constraint = payload?.constraint ?? null;
  }

  // A conflict the user can act on (retry, or pick different input) rather
  // than a bug: unique/FK/restrict violations, and any 409.
  get isConflict() {
    return (
      this.status === 409 ||
      ["conflict", "foreign_key", "restricted", "rejected"].includes(this.code)
    );
  }
}
