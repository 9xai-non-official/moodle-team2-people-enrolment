// Pending enrolment requests — the side preview beside the participant area
// (spec §26-28). Approve → manual enrol (mock-only /api/lms), Reject → confirm
// then deny. Per-request busy state prevents double-submit; the count badge is
// derived from the list (never hard-coded); backend refusals show verbatim.
import { useState } from "react";
import { apiPost } from "../../api";
import Icon from "./icons";
import { Avatar, Bi, EmptyState, ErrorState } from "./ui";
import ReasonList from "../common/ReasonList";
import { errReasons, formatDate } from "../../lib/teaching";

export default function PendingRequestsPanel({
  requests,
  loading,
  error,
  onRetry,
  actorId,
  lang,
  announce,
  onDecided,
  onViewAll,
}) {
  const [busy, setBusy] = useState(null); // request id being processed
  const [confirmReject, setConfirmReject] = useState(null);
  const [actionError, setActionError] = useState(null);

  const pending = (requests ?? []).filter((r) => r.status === "pending");

  async function decide(req, verb) {
    setBusy(req.id);
    setActionError(null);
    try {
      await apiPost(`/api/lms/enrol-requests/${req.id}/${verb}`, { actor_id: actorId });
      announce?.(
        verb === "approve"
          ? lang === "ar"
            ? `تمت الموافقة على طلب ${req.name}`
            : `Approved ${req.name}'s request`
          : lang === "ar"
            ? `تم رفض طلب ${req.name}`
            : `Rejected ${req.name}'s request`,
      );
      setConfirmReject(null);
      onDecided?.();
    } catch (e) {
      setActionError(e);
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="t-panel" aria-labelledby="teach-requests-head">
      <div className="t-panel__head">
        <h3 id="teach-requests-head" className="t-panel__title">
          <Icon name="userPlus" size={17} />
          <Bi en="Pending enrolment requests" ar={"طلبات التسجيل المعلقة"} />
        </h3>
        {!loading && !error && pending.length > 0 && (
          <span className="t-count" aria-label={lang === "ar" ? `${pending.length} معلق` : `${pending.length} pending`}>
            {pending.length}
          </span>
        )}
      </div>

      <div className="t-panel__body">
        {error ? (
          <ErrorState error={error} onRetry={onRetry} lang={lang} compact />
        ) : loading ? (
          <div className="t-skel-rows" aria-hidden="true">
            {[0, 1].map((i) => (
              <div className="t-skel-req" key={i} />
            ))}
          </div>
        ) : pending.length === 0 ? (
          <EmptyState
            icon="userCheck"
            en="No pending enrolment requests."
            ar={"لا توجد طلبات تسجيل معلقة."}
            compact
          />
        ) : (
          <ul className="t-reqlist">
            {pending.map((r) => (
              <li className="t-req" key={r.id}>
                <Avatar name={r.name} size={34} />
                <div className="t-req__info">
                  <span className="t-req__name">{r.name}</span>
                  {r.message ? <span className="t-req__msg" title={r.message}>“{r.message}”</span> : null}
                  <span className="t-req__date">{formatDate(r.requestedAt, lang)}</span>
                </div>
                <div className="t-req__actions">
                  {confirmReject === r.id ? (
                    <>
                      <button
                        type="button"
                        className="t-btn t-btn--danger t-btn--sm"
                        disabled={busy === r.id}
                        onClick={() => decide(r, "deny")}
                      >
                        {busy === r.id ? <Icon name="loader" size={14} className="t-spin" /> : <Icon name="x" size={14} />}
                        <Bi en="Confirm" ar={"تأكيد"} />
                      </button>
                      <button
                        type="button"
                        className="t-btn t-btn--ghost t-btn--sm"
                        disabled={busy === r.id}
                        onClick={() => setConfirmReject(null)}
                      >
                        <Bi en="Cancel" ar={"إلغاء"} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="t-btn t-btn--ok t-btn--sm"
                        disabled={busy != null}
                        onClick={() => decide(r, "approve")}
                      >
                        {busy === r.id ? <Icon name="loader" size={14} className="t-spin" /> : <Icon name="check" size={14} />}
                        <Bi en="Approve" ar={"موافقة"} />
                      </button>
                      <button
                        type="button"
                        className="t-btn t-btn--danger-outline t-btn--sm"
                        disabled={busy != null}
                        onClick={() => setConfirmReject(r.id)}
                      >
                        <Icon name="x" size={14} />
                        <Bi en="Reject" ar={"رفض"} />
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {actionError && <ReasonList reasons={errReasons(actionError)} />}
      </div>

      {!error && (
        <div className="t-panel__foot">
          <button type="button" className="t-link" onClick={onViewAll}>
            <Bi en="View all requests" ar={"عرض جميع الطلبات"} />
            <Icon name="arrowRight" size={15} className="t-link__arw" />
          </button>
        </div>
      )}
    </section>
  );
}
