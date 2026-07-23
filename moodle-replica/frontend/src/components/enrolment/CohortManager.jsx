// Cohorts tab (spec §45-47). Cohort list + selected-cohort detail (members,
// add/remove). Real endpoints: GET/POST /cohorts, GET /cohorts/{id}/members,
// POST/DELETE members. Every membership write triggers a backend cohort sync
// (enrol on add, UNENROL on remove) so we refetch after each — no optimistic UI
// — and warn before a removal. 409 duplicates and capability refusals surface
// verbatim via ReasonList; the member picker also hides current members.
import { useEffect, useMemo, useRef, useState } from "react";
import { apiGet, apiPost, apiDelete, ApiError } from "../../api";
import { cachedGet } from "../../lib/catalog";
import { useLang } from "../../context/Lang";
import ReasonList from "../common/ReasonList";
import Icon from "./icons";
import {
  Avatar,
  Dialog,
  EmptyState,
  ScopedError,
  Spinner,
  T,
  UserCombo,
  both,
} from "./ui";

export default function CohortManager() {
  const { lang, dir } = useLang();
  const [cohorts, setCohorts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedId, setSelectedId] = useState(null);
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState(null);
  // Some backend builds don't expose GET /cohorts/{id}/members (it isn't in the
  // enrolment router). Rather than show a scary error, degrade honestly: lean on
  // the cohort's member_count + the add/remove routes that DO exist.
  const [membersUnavailable, setMembersUnavailable] = useState(false);

  const [users, setUsers] = useState([]);
  const [addUserId, setAddUserId] = useState(null);
  const [memberReasons, setMemberReasons] = useState(null);
  const [memberError, setMemberError] = useState(null);
  const [syncNote, setSyncNote] = useState(null);
  const [busy, setBusy] = useState(false);
  const [removeTarget, setRemoveTarget] = useState(null);

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newId, setNewId] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [createReasons, setCreateReasons] = useState(null);
  const [createError, setCreateError] = useState(null);

  const selected = cohorts.find((c) => c.id === selectedId) || null;

  const loadCohorts = () => {
    setLoading(true);
    setError(null);
    apiGet("/api/enrolment/cohorts")
      .then((rows) => {
        setCohorts(rows);
        setSelectedId((cur) => cur ?? rows[0]?.id ?? null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(loadCohorts, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    cachedGet("/api/users").then(setUsers).catch(() => setUsers([]));
  }, []);

  const memberReq = useRef(0);
  const loadMembers = (id) => {
    if (id == null) return;
    const rid = ++memberReq.current; // ignore a slower earlier fetch (fast cohort switches)
    setMembersLoading(true);
    setMembers([]);
    setMembersError(null);
    setMembersUnavailable(false);
    apiGet(`/api/enrolment/cohorts/${id}/members`)
      .then((data) => {
        if (rid === memberReq.current) setMembers(data);
      })
      .catch((e) => {
        if (rid !== memberReq.current) return;
        // 404/405 = this API build doesn't expose a members listing. The REAL
        // router registers /cohorts/{id}/members for POST+DELETE only, so a GET
        // returns 405 Method Not Allowed (the mock returns a list). Either way,
        // degrade honestly rather than alarm the operator.
        if (e instanceof ApiError && (e.status === 404 || e.status === 405)) setMembersUnavailable(true);
        else setMembersError(e.message);
      })
      .finally(() => {
        if (rid === memberReq.current) setMembersLoading(false);
      });
  };
  useEffect(() => {
    setMemberReasons(null);
    setMemberError(null);
    setSyncNote(null);
    setAddUserId(null);
    loadMembers(selectedId);
  }, [selectedId]);

  const nonMembers = useMemo(() => {
    const ids = new Set(members.map((m) => m.user_id));
    return users.filter((u) => !ids.has(u.id));
  }, [users, members]);

  const createCohort = () => {
    setBusy(true);
    setCreateReasons(null);
    setCreateError(null);
    apiPost("/api/enrolment/cohorts", {
      name: newName,
      id_number: newId || undefined,
      description: newDesc || undefined,
    })
      .then((c) => {
        setCreating(false);
        setNewName("");
        setNewId("");
        setNewDesc("");
        loadCohorts();
        // Real backend returns {ok, cohort:{id,…}}; the mock returns a flat row.
        const newId = c?.cohort?.id ?? c?.id;
        if (newId != null) setSelectedId(newId);
      })
      .catch((e) => {
        if (e instanceof ApiError) setCreateReasons(e.reasons);
        else setCreateError(e.message);
      })
      .finally(() => setBusy(false));
  };

  const addMember = () => {
    if (!addUserId || !selectedId) return;
    setBusy(true);
    setMemberReasons(null);
    setMemberError(null);
    setSyncNote(null);
    apiPost(`/api/enrolment/cohorts/${selectedId}/members`, { user_id: addUserId })
      .then((res) => {
        setAddUserId(null);
        // Backend returns {ok, synced:[{method_id, added, removed, kept}, …]} —
        // per-method user-id lists, not course names. Report the real total.
        const synced = res?.synced ?? [];
        const added = synced.reduce((n, s) => n + (s.added?.length ?? 0), 0);
        setSyncNote(
          added > 0
            ? { tone: "ok", en: `Sync ran — ${added} enrolment${added === 1 ? "" : "s"} added. Check Participants.`, ar: `تمت المزامنة — أُضيف ${added} تسجيل. راجع المشاركين.` }
            : { tone: "ok", en: "Sync ran — no new enrolments. Check Participants.", ar: "تمت المزامنة — لا تسجيلات جديدة. راجع المشاركين." },
        );
        loadMembers(selectedId);
        loadCohorts();
      })
      .catch((e) => {
        if (e instanceof ApiError) setMemberReasons(e.reasons);
        else setMemberError(e.message);
      })
      .finally(() => setBusy(false));
  };

  const doRemove = () => {
    const t = removeTarget;
    setRemoveTarget(null);
    setBusy(true);
    setMemberReasons(null);
    setMemberError(null);
    setSyncNote(null);
    apiDelete(`/api/enrolment/cohorts/${selectedId}/members/${t.user_id}`)
      .then(() => {
        setSyncNote({ tone: "warn", en: "Sync ran — cohort-linked enrolments were updated.", ar: "تمت المزامنة — تم تحديث التسجيلات المرتبطة بالفوج." });
        loadMembers(selectedId);
        loadCohorts();
      })
      .catch((e) => {
        if (e instanceof ApiError) setMemberReasons(e.reasons);
        else setMemberError(e.message);
      })
      .finally(() => setBusy(false));
  };

  return (
    <section className="enr-card">
      <header className="enr-card__head">
        <span className="enr-card__ic enr-card__ic--purple">
          <Icon name="usersRound" size={19} />
        </span>
        <h2 className="enr-card__title">
          <T en="Cohorts" ar="الأفواج" />
        </h2>
        <div className="enr-card__actions">
          <button type="button" className="enr-btn enr-btn--primary" onClick={() => setCreating(true)}>
            <Icon name="usersRoundPlus" size={16} />
            <T en="Create cohort" ar="إنشاء فوج" />
          </button>
        </div>
      </header>

      <div className="enr-card__body">
        {loading && <Spinner lang={lang} />}
        {!loading && error && <ScopedError message={error} onRetry={loadCohorts} lang={lang} />}
        {!loading && !error && cohorts.length === 0 && (
          <EmptyState
            icon="usersRound"
            en="No cohorts yet."
            ar="لا توجد أفواج بعد."
            action={
              <button type="button" className="enr-btn enr-btn--primary" onClick={() => setCreating(true)}>
                <Icon name="usersRoundPlus" size={15} />
                <T en="Create cohort" ar="إنشاء فوج" />
              </button>
            }
          />
        )}

        {!loading && !error && cohorts.length > 0 && (
          <div className="enr-cohorts">
            <ul className="enr-cohorts__list" role="listbox" aria-label={both("Cohorts", "الأفواج")}>
              {cohorts.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={c.id === selectedId}
                    className={`enr-cohort-row ${c.id === selectedId ? "enr-cohort-row--on" : ""}`}
                    onClick={() => setSelectedId(c.id)}
                  >
                    <span className="enr-cohort-row__ic">
                      <Icon name="usersRound" size={18} />
                    </span>
                    <span className="enr-cohort-row__body">
                      <span className="enr-cohort-row__name">{c.name}</span>
                      <span className="enr-cohort-row__meta">
                        {c.id_number && <span className="enr-user">#{c.id_number}</span>}
                        {c.synced_courses?.length > 0 && (
                          <span className="enr-muted">
                            <Icon name="refreshCw" size={12} /> {c.synced_courses.join(", ")}
                          </span>
                        )}
                      </span>
                    </span>
                    <span className="enr-badge enr-badge--xs enr-badge--neutral">
                      {c.member_count}
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            <div className="enr-cohorts__detail">
              {!selected ? (
                <EmptyState icon="usersRound" en="Select a cohort." ar="اختر فوجًا." />
              ) : (
                <>
                  <div className="enr-cohort-detail__head">
                    <h3 className="enr-cohort-detail__title">{selected.name}</h3>
                    {selected.synced_courses?.length > 0 && (
                      <p className="enr-muted">
                        <T en="Synced courses:" ar="المقررات المتزامنة:" /> {selected.synced_courses.join(", ")}
                      </p>
                    )}
                  </div>

                  <div className="enr-cohort-add">
                    <UserCombo
                      users={nonMembers}
                      value={addUserId}
                      onChange={setAddUserId}
                      placeholderEn="Add a member…"
                      placeholderAr="أضف عضوًا…"
                    />
                    <button
                      type="button"
                      className="enr-btn enr-btn--primary"
                      disabled={busy || !addUserId}
                      onClick={addMember}
                    >
                      <Icon name="userPlus" size={15} />
                      <T en="Add" ar="إضافة" />
                    </button>
                  </div>

                  {syncNote && (
                    <div className={`enr-sync ${syncNote.tone === "warn" ? "enr-sync--warn" : "enr-sync--ok"}`}>
                      <Icon name={syncNote.tone === "warn" ? "info" : "circleCheck"} size={15} />
                      <T en={syncNote.en} ar={syncNote.ar} />
                    </div>
                  )}
                  {memberError && <div className="error-banner">{memberError}</div>}
                  {memberReasons && (
                    <ReasonList reasons={memberReasons} tone="error" title={both("Could not update membership", "تعذّر تحديث العضوية")} />
                  )}

                  {membersLoading && <Spinner lang={lang} />}
                  {!membersLoading && membersError && (
                    <ScopedError message={membersError} onRetry={() => loadMembers(selectedId)} lang={lang} />
                  )}
                  {!membersLoading && !membersError && membersUnavailable && (
                    <EmptyState
                      icon="info"
                      en={`This API build doesn't expose a cohort-members listing. Membership count (${selected.member_count}) is shown above; add and remove still work.`}
                      ar={`لا يوفّر هذا الإصدار قائمة أعضاء الفوج. يظهر العدد (${selected.member_count}) بالأعلى؛ والإضافة والإزالة تعملان.`}
                    />
                  )}
                  {!membersLoading && !membersError && !membersUnavailable && members.length === 0 && (
                    <EmptyState icon="users" en="No members yet." ar="لا يوجد أعضاء بعد." />
                  )}
                  {!membersLoading && !membersError && !membersUnavailable && members.length > 0 && (
                    <ul className="enr-mlist">
                      {members.map((m) => (
                        <li key={m.user_id} className="enr-mlist__row">
                          <Avatar name={m.full_name} size={32} />
                          <span className="enr-mlist__name">
                            {m.full_name} <span className="enr-user">{m.username}</span>
                          </span>
                          <button
                            type="button"
                            className="enr-iconbtn enr-iconbtn--danger"
                            disabled={busy}
                            aria-label={both(`Remove ${m.full_name}`, `إزالة ${m.full_name}`)}
                            title={both("Remove from cohort", "إزالة من الفوج")}
                            onClick={() => setRemoveTarget(m)}
                          >
                            <Icon name="userMinus" size={16} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create cohort */}
      <Dialog open={creating} onClose={() => setCreating(false)} dir={dir} icon="usersRoundPlus" title="Create cohort" titleAr="إنشاء فوج">
        {createError && <div className="error-banner">{createError}</div>}
        <div className="enr-field">
          <label className="enr-field__label" htmlFor="co-name">
            <T en="Name" ar="الاسم" />
          </label>
          <input id="co-name" className="enr-input" value={newName} onChange={(e) => setNewName(e.target.value)} />
        </div>
        <div className="enr-field-grid">
          <div className="enr-field">
            <label className="enr-field__label" htmlFor="co-id">
              <T en="ID number" ar="الرقم التعريفي" />
            </label>
            <input
              id="co-id"
              className="enr-input"
              value={newId}
              onChange={(e) => setNewId(e.target.value)}
              placeholder={both("optional", "اختياري")}
            />
          </div>
        </div>
        <div className="enr-field">
          <label className="enr-field__label" htmlFor="co-desc">
            <T en="Description" ar="الوصف" />
          </label>
          <textarea
            id="co-desc"
            className="enr-input enr-input--area"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder={both("optional", "اختياري")}
          />
        </div>
        {createReasons && <ReasonList reasons={createReasons} tone="error" title={both("Could not create cohort", "تعذّر إنشاء الفوج")} />}
        <div className="enr-form-actions">
          <button type="button" className="enr-btn" onClick={() => setCreating(false)}>
            <T en="Cancel" ar="إلغاء" />
          </button>
          <button type="button" className="enr-btn enr-btn--primary" disabled={busy || !newName.trim()} onClick={createCohort}>
            {busy && <Icon name="loader" size={15} className="enr-spin" />}
            <T en="Create cohort" ar="إنشاء الفوج" />
          </button>
        </div>
      </Dialog>

      {/* Remove member confirm */}
      <Dialog
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        dir={dir}
        icon="triangleAlert"
        variant="danger"
        title="Remove cohort member?"
        titleAr="إزالة عضو من الفوج؟"
        footer={
          <>
            <button type="button" className="enr-btn" onClick={() => setRemoveTarget(null)}>
              <T en="Cancel" ar="إلغاء" />
            </button>
            <button type="button" className="enr-btn enr-btn--danger" onClick={doRemove}>
              <Icon name="userMinus" size={15} />
              <T en="Remove" ar="إزالة" />
            </button>
          </>
        }
      >
        {removeTarget && (
          <p className="enr-confirm__note enr-confirm__note--warn">
            <Icon name="triangleAlert" size={16} />
            <T
              en={`Removing ${removeTarget.full_name} runs a cohort sync that may UNENROL them from every course this cohort feeds. Enrolments via another method are unaffected.`}
              ar={`إزالة ${removeTarget.full_name} تُشغّل مزامنة قد تُلغي تسجيله من كل مقرر يغذّيه هذا الفوج. لا تتأثر التسجيلات عبر طريقة أخرى.`}
            />
          </p>
        )}
      </Dialog>
    </section>
  );
}
