// Grading tab (spec §37) — preserves the existing grading behaviour: assignment
// submissions + quiz attempts, HC-3 group-scope enforcement (can_grade), and
// essay marking. Restructured into an activity selector + list + an accessible
// grading dialog. All endpoints are mock-only /api/lms; refusals show verbatim.
import { useEffect, useRef, useState } from "react";
import { apiGet, apiPost } from "../../api";
import Icon from "./icons";
import { Avatar, Bi, Dialog, EmptyState, ErrorState, TonePill } from "./ui";
import ReasonList from "../common/ReasonList";
import { activityType, attemptState, errReasons, formatDate, submissionStatus } from "../../lib/teaching";

function OutsideGroups({ lang }) {
  return (
    <TonePill
      tone="red"
      icon="userX"
      en="Outside your groups"
      ar={"خارج مجموعاتك"}
      title={lang === "ar" ? "منع الوصول لكل المجموعات ولا مجموعة مشتركة (الحالة الصعبة 3)" : "access-all-groups prevented + no shared group (hard case 3)"}
    />
  );
}

// ---- grading dialog (assignment grade OR quiz essay marking) --------------
function GradingDialog({ mode, item, activity, actorId, lang, dir, onClose, onSaved, announce }) {
  const isAssign = mode === "assign";
  const [grade, setGrade] = useState(item.grade ?? "");
  const [feedback, setFeedback] = useState(item.feedback ?? "");
  const [essays, setEssays] = useState(() => {
    if (isAssign) return {};
    const q = (item.questions ?? []).filter((x) => x.type === "essay");
    return Object.fromEntries(q.map((x) => [x.id, item.essay_scores?.[x.id] ?? ""]));
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [invalid, setInvalid] = useState(null);

  const essayQuestions = isAssign ? [] : (item.questions ?? []).filter((x) => x.type === "essay");

  async function save() {
    setError(null);
    setInvalid(null);
    if (isAssign) {
      const g = Number(grade);
      if (grade === "" || !Number.isFinite(g) || g < 0 || g > 100) {
        setInvalid(lang === "ar" ? "الدرجة يجب أن تكون رقمًا بين 0 و100." : "Grade must be a number between 0 and 100.");
        return;
      }
      setBusy(true);
      try {
        await apiPost(`/api/lms/submissions/${item.id}/grade`, { actor_id: actorId, grade: g, feedback });
        announce?.(lang === "ar" ? `تم تقييم عمل ${item.user?.full_name}` : `Graded ${item.user?.full_name}'s submission`);
        onSaved?.();
        onClose();
      } catch (e) {
        setError(e);
      } finally {
        setBusy(false);
      }
      return;
    }
    // quiz: validate every essay, then post each
    for (const q of essayQuestions) {
      const v = Number(essays[q.id]);
      if (essays[q.id] === "" || !Number.isFinite(v) || v < 0 || v > q.points) {
        setInvalid(lang === "ar" ? `النقاط لكل سؤال بين 0 و${q.points}.` : `Each essay's points must be between 0 and its maximum.`);
        return;
      }
    }
    setBusy(true);
    try {
      for (const q of essayQuestions) {
        await apiPost(`/api/lms/attempts/${item.id}/grade-essay`, { actor_id: actorId, question_id: q.id, points: Number(essays[q.id]) });
      }
      announce?.(lang === "ar" ? `تم تقييم محاولة ${item.user?.full_name}` : `Marked ${item.user?.full_name}'s attempt`);
      onSaved?.();
      onClose();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      dir={dir}
      size="md"
      titleEn={`Grade — ${item.user?.full_name ?? ""}`}
      titleAr={"تقييم"}
      footer={
        <>
          <button type="button" className="t-btn t-btn--ghost" onClick={onClose} disabled={busy}>
            <Bi en="Cancel" ar={"إلغاء"} />
          </button>
          <button type="button" className="t-btn t-btn--primary" onClick={save} disabled={busy}>
            {busy ? <Icon name="loader" size={15} className="t-spin" /> : <Icon name="star" size={15} />}
            <Bi en="Save grade" ar={"حفظ التقييم"} />
          </button>
        </>
      }
    >
      <p className="t-dialog__note">
        <strong>{activity.name}</strong> · <Bi en={activityType(activity.type).en} ar={activityType(activity.type).ar} />
      </p>

      {isAssign ? (
        <>
          {item.text ? <p className="t-quote">{item.text}</p> : null}
          {item.files?.length ? (
            <p className="t-files">
              <Icon name="fileCheck" size={15} /> {item.files.map((f) => f.name).join(" · ")}
            </p>
          ) : null}
          <label className="t-field t-field--narrow">
            <span className="t-field__label"><Bi en="Grade (0–100)" ar={"الدرجة (0–100)"} /></span>
            <input className="t-input t-input--num" type="number" min={0} max={100} value={grade} onChange={(e) => setGrade(e.target.value)} autoFocus />
          </label>
          <label className="t-field">
            <span className="t-field__label"><Bi en="Feedback" ar={"ملاحظات"} /></span>
            <textarea className="t-textarea" rows={3} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder={lang === "ar" ? "ملاحظات للطالب (اختياري)" : "Feedback for the student (optional)"} />
          </label>
        </>
      ) : (
        essayQuestions.map((q) => (
          <div className="t-essay" key={q.id}>
            <p className="t-essay__q">{q.text}</p>
            <blockquote className="t-quote">{item.answers?.[q.id] ?? <em>{lang === "ar" ? "لا إجابة" : "no answer"}</em>}</blockquote>
            <label className="t-field t-field--narrow">
              <span className="t-field__label"><Bi en={`Points (0–${q.points})`} ar={`النقاط (0–${q.points})`} /></span>
              <input className="t-input t-input--num" type="number" min={0} max={q.points} value={essays[q.id]} onChange={(e) => setEssays((s) => ({ ...s, [q.id]: e.target.value }))} />
            </label>
          </div>
        ))
      )}

      {invalid && <ReasonList reasons={[invalid]} tone="error" />}
      {error && <ReasonList reasons={errReasons(error)} />}
    </Dialog>
  );
}

// ---- tab ------------------------------------------------------------------
export default function GradingTab({ course, actorId, activities, lang, dir, initialActivityId, announce }) {
  const gradable = (activities.data ?? []).filter((a) => a.type === "assign" || a.type === "quiz");
  const [selectedId, setSelectedId] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [grading, setGrading] = useState(null);
  const token = useRef(0);

  const selected = gradable.find((a) => a.id === selectedId) ?? null;

  // preselect when arriving via a "Grade" action, or the first gradable activity
  useEffect(() => {
    if (selectedId && gradable.some((a) => a.id === selectedId)) return;
    const next = (initialActivityId && gradable.some((a) => a.id === initialActivityId)) ? initialActivityId : gradable[0]?.id ?? null;
    setSelectedId(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course.id, initialActivityId, activities.data]);

  function loadItems(activity) {
    if (!activity) {
      setItems([]);
      return;
    }
    const my = ++token.current;
    setLoading(true);
    setError(null);
    const path =
      activity.type === "assign"
        ? `/api/lms/activities/${activity.id}/submissions?actor_id=${actorId}`
        : `/api/lms/activities/${activity.id}/attempts?actor_id=${actorId}`;
    apiGet(path)
      .then((rows) => {
        if (my !== token.current) return; // stale course/activity — ignore
        setItems(rows);
        setLoading(false);
      })
      .catch((e) => {
        if (my !== token.current) return;
        setError(e);
        setLoading(false);
      });
  }

  useEffect(() => {
    loadItems(selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, actorId]);

  if (!gradable.length)
    return (
      <EmptyState
        icon="clipboardCheck"
        en="No gradable activities in this course yet."
        ar={"لا توجد أنشطة قابلة للتقييم في هذا المقرر بعد."}
      />
    );

  return (
    <div className="t-grade">
      {/* activity selector */}
      <div className="t-gradesel" role="group" aria-label={lang === "ar" ? "اختر نشاطًا للتقييم" : "Choose an activity to grade"}>
        {gradable.map((a) => {
          const t = activityType(a.type);
          const on = a.id === selectedId;
          return (
            <button key={a.id} type="button" className={`t-gradesel__opt ${on ? "t-gradesel__opt--on" : ""}`} aria-pressed={on} onClick={() => setSelectedId(a.id)}>
              <span className={`t-actish t-actish--${t.tone}`} aria-hidden="true"><Icon name={t.icon} size={15} /></span>
              <span className="t-gradesel__name">{a.name}</span>
            </button>
          );
        })}
      </div>

      {error ? (
        <ErrorState error={error} onRetry={() => loadItems(selected)} lang={lang} />
      ) : loading ? (
        <div className="t-skel-rows" aria-hidden="true">{[0, 1, 2].map((i) => <div className="t-skel-row" key={i} />)}</div>
      ) : selected?.type === "assign" ? (
        items.length === 0 ? (
          <EmptyState icon="fileX" en="No submissions yet." ar={"لا توجد تسليمات بعد."} />
        ) : (
          <ul className="t-gradelist">
            {items.map((s) => {
              const ss = submissionStatus(s.status);
              return (
                <li className="t-gradeitem" key={s.id}>
                  <div className="t-gradeitem__who">
                    <Avatar name={s.user?.full_name} size={34} />
                    <div className="t-who__txt">
                      <span className="t-who__name">{s.user?.full_name}</span>
                      {s.submitted_at ? <span className="t-who__sub">{formatDate(s.submitted_at, lang)}</span> : null}
                    </div>
                  </div>
                  <div className="t-gradeitem__meta">
                    <TonePill tone={ss.tone} en={ss.en} ar={ss.ar} />
                    {s.status === "graded" ? <span className="t-grade-val">{s.grade}/100</span> : null}
                    {!s.can_grade ? <OutsideGroups lang={lang} /> : null}
                  </div>
                  <div className="t-gradeitem__act">
                    {s.status === "draft" ? (
                      <span className="t-muted"><Bi en="Not submitted" ar={"لم يُسلَّم"} /></span>
                    ) : (
                      <button type="button" className="t-btn t-btn--ghost t-btn--sm" disabled={!s.can_grade} title={!s.can_grade ? (lang === "ar" ? "خارج مجموعاتك" : "Outside your groups") : undefined} onClick={() => setGrading({ mode: "assign", item: s })}>
                        <Icon name="penLine" size={15} />
                        <Bi en={s.status === "graded" ? "Re-grade" : "Grade"} ar={(s.status === "graded" ? "إعادة تقييم" : "تقييم")} />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )
      ) : selected?.type === "quiz" ? (
        items.length === 0 ? (
          <EmptyState icon="fileX" en="No attempts yet." ar={"لا توجد محاولات بعد."} />
        ) : (
          <ul className="t-gradelist">
            {items.map((a) => {
              const st = attemptState(a.state);
              const hasEssays = (a.questions ?? []).some((q) => q.type === "essay");
              return (
                <li className="t-gradeitem" key={a.id}>
                  <div className="t-gradeitem__who">
                    <Avatar name={a.user?.full_name} size={34} />
                    <span className="t-who__name">{a.user?.full_name}</span>
                  </div>
                  <div className="t-gradeitem__meta">
                    <TonePill tone={st.tone} en={st.en} ar={st.ar} />
                    <span className="t-muted">{lang === "ar" ? `تلقائي ${a.auto_score}` : `auto ${a.auto_score}`}{a.total != null ? (lang === "ar" ? ` · الإجمالي ${a.total}` : ` · total ${a.total}`) : ""}</span>
                    {!a.can_grade ? <OutsideGroups lang={lang} /> : null}
                  </div>
                  <div className="t-gradeitem__act">
                    {a.state === "finished" && hasEssays ? (
                      <button type="button" className="t-btn t-btn--ghost t-btn--sm" disabled={!a.can_grade} title={!a.can_grade ? (lang === "ar" ? "خارج مجموعاتك" : "Outside your groups") : undefined} onClick={() => setGrading({ mode: "quiz", item: a })}>
                        <Icon name="penLine" size={15} />
                        <Bi en="Mark essays" ar={"تصحيح المقالي"} />
                      </button>
                    ) : (
                      <span className="t-muted"><Bi en={a.state === "graded" ? "Fully graded" : "In progress"} ar={(a.state === "graded" ? "مُقيَّم بالكامل" : "قيد التنفيذ")} /></span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )
      ) : null}

      {grading && (
        <GradingDialog
          mode={grading.mode}
          item={grading.item}
          activity={selected}
          actorId={actorId}
          lang={lang}
          dir={dir}
          announce={announce}
          onClose={() => setGrading(null)}
          onSaved={() => loadItems(selected)}
        />
      )}
    </div>
  );
}
