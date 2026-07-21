// ApiError — carries the backend's "why" to the UI.
// The UI must show backend reasons verbatim (task 06 §6): `reasons` feeds
// ReasonList; `message` is the fallback single-line text.
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
  }
}
