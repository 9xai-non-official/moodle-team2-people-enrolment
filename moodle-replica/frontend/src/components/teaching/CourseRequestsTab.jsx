// Course requests tab (spec §38) — the Moodle course-creation truth, kept:
// teachers REQUEST a course (moodle/course:request); a manager approves, and
// approval makes the requester the course's teacher. Only managers/admins see
// direct-create + approve/reject (§38: don't expose course-creation to the
// unauthorized). All endpoints are mock-only /api/lms; refusals show verbatim.
import { useState } from "react";
import { apiPost } from "../../api";
import Icon from "./icons";
import { Avatar, Bi, EmptyState, ErrorState, TonePill } from "./ui";
import ReasonList from "../common/ReasonList";
import { errReasons, requestStatus } from "../../lib/teaching";

export default function CourseRequestsTab({ actorId, me, courseRequests, reload, lang, announce }) {
  const [form, setForm] = useState({ full_name: "", short_name: "", reason: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [decideBusy, setDecideBusy] = useState(null);
  const isAdmin = Boolean(me?.is_admin);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const canSubmit = form.full_name.trim() && form.short_name.trim();

  async function request() {
    setBusy(true);
    setError(null);
    try {
      await apiPost("/api/lms/course-requests", { actor_id: actorId, ...form });
      announce?.(lang === "ar" ? `تم إرسال طلب "${form.short_name}"` : `Requested "${form.short_name}"`);
      setForm({ full_name: "", short_name: "", reason: "" });
      reload("courseRequests");
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  async function createDirect() {
    setBusy(true);
    setError(null);
    try {
      const c = await apiPost("/api/lms/courses", { actor_id: actorId, ...form });
      announce?.(lang === "ar" ? `تم إنشاء المقرر "${c.short_name}"` : `Created course "${c.short_name}"`);
      setForm({ full_name: "", short_name: "", reason: "" });
      reload("courseRequests");
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  async function decide(r, verb) {
    setDecideBusy(`${verb}:${r.id}`);
    setError(null);
    try {
      await apiPost(`/api/lms/course-requests/${r.id}/${verb}`, { actor_id: actorId });
      announce?.(
        verb === "approve"
          ? lang === "ar" ? `تمت الموافقة على "${r.shortName}"` : `Approved "${r.shortName}"`
          : lang === "ar" ? `تم رفض "${r.shortName}"` : `Rejected "${r.shortName}"`,
      );
      reload("courseRequests");
    } catch (e) {
      setError(e);
    } finally {
      setDecideBusy(null);
    }
  }

  const rows = courseRequests.data ?? [];

  return (
    <div className="t-crtab">
      <div className="t-crtab__grid">
        {/* request / create form */}
        <section className="t-surface t-crform" aria-labelledby="teach-cr-form-head">
          <h3 id="teach-cr-form-head" className="t-sec-title t-sec-title--sm">
            <Icon name="folderPlus" size={18} />
            <Bi en={isAdmin ? "Create or request a course" : "Request a course"} ar={(isAdmin ? "إنشاء أو طلب مقرر" : "طلب مقرر")} />
          </h3>
          <p className="t-note">
            <Icon name="info" size={15} />
            <Bi
              en="Moodle's rule, kept on purpose: a teacher cannot create courses (moodle/course:create belongs to Manager/Course creator). Teachers request; a manager approves — and approval makes the requester the course's teacher."
              ar={"قاعدة Moodle: لا يستطيع المعلّم إنشاء المقررات؛ يقدّم طلبًا ويوافق المدير — وتجعله الموافقة معلّم المقرر."}
            />
          </p>
          <label className="t-field">
            <span className="t-field__label"><Bi en="Full name" ar={"الاسم الكامل"} /></span>
            <input className="t-input" value={form.full_name} onChange={(e) => set({ full_name: e.target.value })} placeholder={lang === "ar" ? "مثال: علوم حاسب متقدمة" : "e.g. Advanced Computer Science"} />
          </label>
          <label className="t-field">
            <span className="t-field__label"><Bi en="Short name" ar={"الاسم المختصر"} /></span>
            <input className="t-input" value={form.short_name} onChange={(e) => set({ short_name: e.target.value })} placeholder="e.g. CS201" />
          </label>
          <label className="t-field">
            <span className="t-field__label"><Bi en="Why is it needed?" ar={"لماذا هو مطلوب؟"} /></span>
            <textarea className="t-textarea" rows={2} value={form.reason} onChange={(e) => set({ reason: e.target.value })} />
          </label>
          <div className="t-crform__actions">
            <button type="button" className="t-btn t-btn--primary" disabled={!canSubmit || busy} onClick={request}>
              {busy ? <Icon name="loader" size={15} className="t-spin" /> : <Icon name="folderPlus" size={15} />}
              <Bi en="Request course" ar={"طلب المقرر"} />
            </button>
            {isAdmin && (
              <button type="button" className="t-btn t-btn--ghost" disabled={!canSubmit || busy} onClick={createDirect}>
                <Icon name="plusCircle" size={15} />
                <Bi en="Create directly" ar={"إنشاء مباشرة"} />
              </button>
            )}
          </div>
          {error && <ReasonList reasons={errReasons(error)} />}
        </section>

        {/* requests list */}
        <section className="t-surface t-crlist" aria-labelledby="teach-cr-list-head">
          <h3 id="teach-cr-list-head" className="t-sec-title t-sec-title--sm">
            <Icon name="folder" size={18} />
            <Bi en={isAdmin ? "Course requests" : "Your requests"} ar={(isAdmin ? "طلبات المقررات" : "طلباتك")} />
          </h3>
          {courseRequests.error ? (
            <ErrorState error={courseRequests.error} onRetry={() => reload("courseRequests")} lang={lang} compact />
          ) : courseRequests.loading ? (
            <div className="t-skel-rows" aria-hidden="true">{[0, 1].map((i) => <div className="t-skel-row" key={i} />)}</div>
          ) : rows.length === 0 ? (
            <EmptyState icon="folder" en="No course requests yet." ar={"لا توجد طلبات مقررات بعد."} compact />
          ) : (
            <ul className="t-crrows">
              {rows.map((r) => {
                const s = requestStatus(r.status);
                return (
                  <li className="t-crrow" key={r.id}>
                    <div className="t-crrow__main">
                      <span className="t-crrow__code">{r.shortName}</span>
                      <span className="t-crrow__name">{r.fullName}</span>
                      <span className="t-crrow__by">
                        <Avatar name={r.requesterName} size={22} />
                        <Bi en={`by ${r.requesterName}`} ar={`بواسطة ${r.requesterName}`} />
                      </span>
                      {r.reason ? <span className="t-crrow__reason" title={r.reason}>“{r.reason}”</span> : null}
                    </div>
                    <div className="t-crrow__side">
                      <TonePill tone={s.tone} icon={s.icon} en={s.en} ar={s.ar} />
                      {isAdmin && r.status === "pending" && (
                        <div className="t-req__actions">
                          <button type="button" className="t-btn t-btn--ok t-btn--sm" disabled={decideBusy != null} onClick={() => decide(r, "approve")}>
                            {decideBusy === `approve:${r.id}` ? <Icon name="loader" size={14} className="t-spin" /> : <Icon name="check" size={14} />}
                            <Bi en="Approve" ar={"موافقة"} />
                          </button>
                          <button type="button" className="t-btn t-btn--danger-outline t-btn--sm" disabled={decideBusy != null} onClick={() => decide(r, "reject")}>
                            <Icon name="x" size={14} />
                            <Bi en="Reject" ar={"رفض"} />
                          </button>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
