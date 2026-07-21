// ApiError — carries the backend's "why" to the UI.
// The UI must show backend reasons verbatim (task 06 §6): `reasons` feeds
// ReasonList; `message` is the fallback single-line text.
export class ApiError extends Error {
  constructor(status, payload) {
    const detail = payload?.detail ?? payload?.reason ?? null;
    const reasons =
      payload?.reasons ?? payload?.blocking_reasons ?? (detail ? [detail] : []);
    super(
      typeof detail === "string"
        ? detail
        : reasons.length
          ? String(reasons[0])
          : `HTTP ${status}`,
    );
    this.name = "ApiError";
    this.status = status;
    this.payload = payload ?? null;
    this.reasons = reasons.map((r) =>
      typeof r === "string" ? r : (r.reason ?? JSON.stringify(r)),
    );
  }
}
