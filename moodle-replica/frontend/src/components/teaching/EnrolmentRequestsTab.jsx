// Enrolment requests tab (spec §35) — a full workspace, not a copy of the side
// preview: search by requester + status filters + the complete request list
// with approve/reject. Same mock-backed /api/lms enrol-request endpoints; the
// count and rows are always derived from the same data.
import { useMemo, useState } from "react";
import { apiPost } from "../../api";
import Icon from "./icons";
import { Avatar, Bi, EmptyState, ErrorState, TonePill } from "./ui";
import ReasonList from "../common/ReasonList";
import { errReasons, formatDate, requestStatus } from "../../lib/teaching";

const FILTERS = [
  { key: "all", en: "All", ar: "الكل", icon: "clipboardList", match: () => true },
  { key: "pending", en: "Pending", ar: "معلّقة", icon: "clock", match: (r) => r.status === "pending" },
  { key: "approved", en: "Approved", ar: "مقبولة", icon: "checkCircle", match: (r) => r.status === "approved" },
  { key: "rejected", en: "Rejected", ar: "مرفوضة", icon: "xCircle", match: (r) => r.status === "denied" || r.status === "rejected" },
];

function StatusCell({ status }) {
  const s = requestStatus(status);
  return <TonePill tone={s.tone} icon={s.icon} en={s.en} ar={s.ar} />;
}

export default function EnrolmentRequestsTab({ actorId, requests, reload, lang, announce }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState(null);
  const [confirmReject, setConfirmReject] = useState(null);
  const [error, setError] = useState(null);

  const matcher = FILTERS.find((f) => f.key === filter) ?? FILTERS[0];
  const q = query.trim().toLowerCase();

  const rows = useMemo(
    () => (requests.data ?? []).filter(matcher.match).filter((r) => !q || r.name.toLowerCase().includes(q)),
    [requests.data, matcher, q],
  );

  const counts = useMemo(
    () => Object.fromEntries(FILTERS.map((f) => [f.key, (requests.data ?? []).filter(f.match).length])),
    [requests.data],
  );

  async function decide(req, verb) {
    setBusy(req.id);
    setError(null);
    try {
      await apiPost(`/api/lms/enrol-requests/${req.id}/${verb}`, { actor_id: actorId });
      announce?.(
        verb === "approve"
          ? lang === "ar" ? `تمت الموافقة على طلب ${req.name}` : `Approved ${req.name}'s request`
          : lang === "ar" ? `تم رفض طلب ${req.name}` : `Rejected ${req.name}'s request`,
      );
      setConfirmReject(null);
      reload("requests");
      reload("participants");
      reload("progress");
    } catch (e) {
      setError(e);
    } finally {
      setBusy(null);
    }
  }

  function actions(r) {
    if (r.status !== "pending")
      return <span className="t-muted">{r.decidedBy === actorId ? (lang === "ar" ? "بواسطتك" : "by you") : "—"}</span>;
    if (confirmReject === r.id)
      return (
        <div className="t-req__actions">
          <button type="button" className="t-btn t-btn--danger t-btn--sm" disabled={busy != null} onClick={() => decide(r, "deny")}>
            {busy === r.id ? <Icon name="loader" size={14} className="t-spin" /> : <Icon name="x" size={14} />}
            <Bi en="Confirm" ar={"تأكيد"} />
          </button>
          <button type="button" className="t-btn t-btn--ghost t-btn--sm" disabled={busy != null} onClick={() => setConfirmReject(null)}>
            <Bi en="Cancel" ar={"إلغاء"} />
          </button>
        </div>
      );
    return (
      <div className="t-req__actions">
        <button type="button" className="t-btn t-btn--ok t-btn--sm" disabled={busy != null} onClick={() => decide(r, "approve")}>
          {busy === r.id ? <Icon name="loader" size={14} className="t-spin" /> : <Icon name="check" size={14} />}
          <Bi en="Approve" ar={"موافقة"} />
        </button>
        <button type="button" className="t-btn t-btn--danger-outline t-btn--sm" disabled={busy != null} onClick={() => setConfirmReject(r.id)}>
          <Icon name="x" size={14} />
          <Bi en="Reject" ar={"رفض"} />
        </button>
      </div>
    );
  }

  return (
    <div className="t-reqtab">
      <div className="t-toolbar">
        <div className="t-search">
          <Icon name="search" size={17} className="t-search__ic" />
          <input
            type="search"
            className="t-search__input"
            placeholder={lang === "ar" ? "ابحث باسم مقدّم الطلب…" : "Search by requester…"}
            aria-label={lang === "ar" ? "بحث في الطلبات" : "Search requests"}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="t-filters" role="group" aria-label={lang === "ar" ? "تصفية الحالة" : "Filter by status"}>
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              className={`t-filter ${filter === f.key ? "t-filter--on" : ""}`}
              aria-pressed={filter === f.key}
              onClick={() => setFilter(f.key)}
            >
              <Icon name={f.icon} size={14} />
              <Bi en={f.en} ar={f.ar} />
              <span className="t-filter__n">{counts[f.key] ?? 0}</span>
            </button>
          ))}
        </div>
      </div>

      {requests.error ? (
        <ErrorState error={requests.error} onRetry={() => reload("requests")} lang={lang} />
      ) : requests.loading ? (
        <div className="t-skel-rows" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div className="t-skel-row" key={i} />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={filter === "pending" ? "userCheck" : "inbox"}
          en={q ? "No requests match your search." : "No enrolment requests to show."}
          ar={(q ? "لا توجد طلبات مطابقة." : "لا توجد طلبات تسجيل.")}
        />
      ) : (
        <>
          {error && <ReasonList reasons={errReasons(error)} />}
          <div className="t-table-wrap t-only-wide">
            <table className="t-table">
              <thead>
                <tr>
                  <th scope="col"><Bi en="Requester" ar={"مقدّم الطلب"} /></th>
                  <th scope="col"><Bi en="Requested" ar={"التاريخ"} /></th>
                  <th scope="col"><Bi en="Message" ar={"الرسالة"} /></th>
                  <th scope="col"><Bi en="Status" ar={"الحالة"} /></th>
                  <th scope="col" className="t-col-actions"><Bi en="Actions" ar={"الإجراءات"} /></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div className="t-who">
                        <Avatar name={r.name} size={32} />
                        <span className="t-who__name">{r.name}</span>
                      </div>
                    </td>
                    <td>{formatDate(r.requestedAt, lang)}</td>
                    <td className="t-msgcell">{r.message ? <span title={r.message}>“{r.message}”</span> : <span className="t-muted">—</span>}</td>
                    <td><StatusCell status={r.status} lang={lang} /></td>
                    <td className="t-col-actions">{actions(r)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="t-cards t-only-narrow">
            {rows.map((r) => (
              <li className="t-card" key={r.id}>
                <div className="t-card__head">
                  <Avatar name={r.name} size={36} />
                  <span className="t-card__title">{r.name}<span className="t-who__sub">{formatDate(r.requestedAt, lang)}</span></span>
                  <StatusCell status={r.status} lang={lang} />
                </div>
                {r.message ? <p className="t-card__msg">“{r.message}”</p> : null}
                <div className="t-card__foot">{actions(r)}</div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
