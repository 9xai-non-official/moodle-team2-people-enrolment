// Activities tab (spec §36) — activity-management workspace: an "Add activity"
// dialog (assignment/quiz builder, preserving the existing ContentTab logic and
// the REAL-for-mock POST /api/lms/courses/{id}/activities contract) plus a type
// filter over the shared course-activities table. No fields the endpoint does
// not accept (name/type/attempts/questions only).
import { useMemo, useState } from "react";
import { apiPost } from "../../api";
import Icon from "./icons";
import { Bi, Dialog, EmptyState } from "./ui";
import ReasonList from "../common/ReasonList";
import CourseActivitiesTable from "./CourseActivitiesTable";
import { activityType, errReasons } from "../../lib/teaching";

const emptyQuestion = () => ({ type: "multichoice", text: "", points: 2, options: "A, B, C, D", answer: 0 });

const TYPE_FILTERS = [
  { key: "all", en: "All", ar: "الكل" },
  { key: "assign", en: "Assignments", ar: "التكاليف" },
  { key: "quiz", en: "Quizzes", ar: "الاختبارات" },
];

// ---- create dialog --------------------------------------------------------
function ActivityCreateDialog({ course, actorId, lang, dir, onClose, onCreated, announce }) {
  const [kind, setKind] = useState("assign");
  const [name, setName] = useState("");
  const [attempts, setAttempts] = useState(3);
  const [questions, setQuestions] = useState([emptyQuestion()]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [invalid, setInvalid] = useState([]);

  const setQ = (i, patch) => setQuestions((qs) => qs.map((q, j) => (j === i ? { ...q, ...patch } : q)));

  function validate() {
    const problems = [];
    if (!name.trim()) problems.push(lang === "ar" ? "الاسم مطلوب." : "Name is required.");
    if (kind === "quiz") {
      if (!(attempts >= 1 && attempts <= 10)) problems.push(lang === "ar" ? "المحاولات المسموحة بين 1 و10." : "Attempts allowed must be 1–10.");
      if (!questions.length) problems.push(lang === "ar" ? "يحتاج الاختبار إلى سؤال واحد على الأقل." : "A quiz needs at least one question.");
      questions.forEach((q, i) => {
        if (!q.text.trim()) problems.push(lang === "ar" ? `السؤال ${i + 1}: النص مطلوب.` : `Question ${i + 1}: text is required.`);
        if (!(Number(q.points) >= 1)) problems.push(lang === "ar" ? `السؤال ${i + 1}: النقاط ≥ 1.` : `Question ${i + 1}: points must be ≥ 1.`);
        if (q.type === "multichoice") {
          const opts = q.options.split(",").map((s) => s.trim()).filter(Boolean);
          if (opts.length < 2) problems.push(lang === "ar" ? `السؤال ${i + 1}: خياران على الأقل.` : `Question ${i + 1}: at least two options.`);
          if (!(Number(q.answer) >= 0 && Number(q.answer) < opts.length)) problems.push(lang === "ar" ? `السؤال ${i + 1}: رقم الإجابة الصحيحة خارج النطاق.` : `Question ${i + 1}: correct-option number is out of range.`);
        }
      });
    }
    return problems;
  }

  async function submit() {
    const problems = validate();
    setInvalid(problems);
    if (problems.length) return;
    setBusy(true);
    setError(null);
    try {
      const body = { actor_id: actorId, activity_type: kind, name: name.trim() };
      if (kind === "quiz") {
        body.attempts_allowed = Number(attempts);
        body.questions = questions.map((q) => ({
          type: q.type,
          text: q.text.trim(),
          points: Number(q.points),
          options: q.type === "multichoice" ? q.options.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
          answer: q.type === "multichoice" ? Number(q.answer) : q.type === "truefalse" ? q.answer === "true" : null,
        }));
      }
      const created = await apiPost(`/api/lms/courses/${course.id}/activities`, body);
      announce?.(lang === "ar" ? `تم إنشاء "${created.name}"` : `Created "${created.name}"`);
      onCreated?.();
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
      size="lg"
      titleEn="Add activity"
      titleAr={"إضافة نشاط"}
      footer={
        <>
          <button type="button" className="t-btn t-btn--ghost" onClick={onClose} disabled={busy}>
            <Bi en="Cancel" ar={"إلغاء"} />
          </button>
          <button type="button" className="t-btn t-btn--primary" onClick={submit} disabled={busy}>
            {busy ? <Icon name="loader" size={15} className="t-spin" /> : <Icon name="plus" size={15} />}
            <Bi en="Create" ar={"إنشاء"} />
          </button>
        </>
      }
    >
      <div className="t-field">
        <span className="t-field__label"><Bi en="Type" ar={"النوع"} /></span>
        <div className="t-segment" role="group" aria-label={lang === "ar" ? "نوع النشاط" : "Activity type"}>
          {["assign", "quiz"].map((k) => {
            const t = activityType(k);
            return (
              <button key={k} type="button" className={`t-segment__opt ${kind === k ? "t-segment__opt--on" : ""}`} aria-pressed={kind === k} onClick={() => setKind(k)}>
                <Icon name={t.icon} size={15} />
                <Bi en={t.en} ar={t.ar} />
              </button>
            );
          })}
        </div>
      </div>

      <label className="t-field">
        <span className="t-field__label"><Bi en="Name" ar={"الاسم"} /></span>
        <input className="t-input" value={name} onChange={(e) => setName(e.target.value)} placeholder={lang === "ar" ? "مثال: التكليف 1" : "e.g. Assignment 1"} autoFocus />
      </label>

      {kind === "quiz" && (
        <>
          <label className="t-field t-field--narrow">
            <span className="t-field__label"><Bi en="Attempts allowed" ar={"المحاولات المسموحة"} /></span>
            <input className="t-input" type="number" min={1} max={10} value={attempts} onChange={(e) => setAttempts(Number(e.target.value))} />
          </label>

          <div className="t-qlist">
            {questions.map((q, i) => (
              <div className="t-qcard" key={i}>
                <div className="t-qcard__head">
                  <strong><Bi en={`Question ${i + 1}`} ar={`السؤال ${i + 1}`} /></strong>
                  {questions.length > 1 && (
                    <button type="button" className="t-iconbtn" aria-label={lang === "ar" ? "حذف السؤال" : "Remove question"} onClick={() => setQuestions((qs) => qs.filter((_, j) => j !== i))}>
                      <Icon name="x" size={16} />
                    </button>
                  )}
                </div>
                <div className="t-qcard__row">
                  <select className="t-select" value={q.type} onChange={(e) => setQ(i, { type: e.target.value })} aria-label={lang === "ar" ? "نوع السؤال" : "Question type"}>
                    <option value="multichoice">{lang === "ar" ? "اختيار من متعدد" : "Multiple choice"}</option>
                    <option value="truefalse">{lang === "ar" ? "صح / خطأ" : "True / false"}</option>
                    <option value="essay">{lang === "ar" ? "مقالي (تصحيح يدوي)" : "Essay (manual marking)"}</option>
                  </select>
                  <input className="t-input t-input--num" type="number" min={1} value={q.points} onChange={(e) => setQ(i, { points: Number(e.target.value) })} aria-label={lang === "ar" ? "النقاط" : "Points"} title={lang === "ar" ? "النقاط" : "Points"} />
                </div>
                <input className="t-input" placeholder={lang === "ar" ? "نص السؤال" : "Question text"} value={q.text} onChange={(e) => setQ(i, { text: e.target.value })} />
                {q.type === "multichoice" && (
                  <div className="t-qcard__row">
                    <input className="t-input" title={lang === "ar" ? "خيارات مفصولة بفواصل" : "Comma-separated options"} value={q.options} onChange={(e) => setQ(i, { options: e.target.value })} />
                    <input className="t-input t-input--num" type="number" min={0} value={q.answer} onChange={(e) => setQ(i, { answer: e.target.value })} aria-label={lang === "ar" ? "رقم الإجابة الصحيحة" : "Correct option #"} title={lang === "ar" ? "رقم الإجابة الصحيحة (يبدأ من 0)" : "Correct option # (0-based)"} />
                  </div>
                )}
                {q.type === "truefalse" && (
                  <select className="t-select" value={String(q.answer)} onChange={(e) => setQ(i, { answer: e.target.value })} aria-label={lang === "ar" ? "الإجابة الصحيحة" : "Correct answer"}>
                    <option value="true">{lang === "ar" ? "صح" : "True"}</option>
                    <option value="false">{lang === "ar" ? "خطأ" : "False"}</option>
                  </select>
                )}
              </div>
            ))}
            <button type="button" className="t-btn t-btn--ghost t-btn--sm" onClick={() => setQuestions((qs) => [...qs, emptyQuestion()])}>
              <Icon name="plus" size={15} />
              <Bi en="Add question" ar={"إضافة سؤال"} />
            </button>
          </div>
        </>
      )}

      {invalid.length > 0 && <ReasonList reasons={invalid} tone="error" />}
      {error && <ReasonList reasons={errReasons(error)} />}
    </Dialog>
  );
}

// ---- tab ------------------------------------------------------------------
export default function ActivitiesTab({ course, actorId, me, activities, reload, lang, dir, onGradeActivity, onGoToTab, announce }) {
  const [filter, setFilter] = useState("all");
  const [creating, setCreating] = useState(false);

  const canAdd = me?.is_admin || (me?.teaches ?? []).includes(course.id);
  const all = activities.data ?? [];
  const rows = useMemo(
    () => (filter === "all" ? activities.data ?? [] : (activities.data ?? []).filter((a) => a.type === filter)),
    [activities.data, filter],
  );

  return (
    <div className="t-acttab">
      <div className="t-toolbar">
        <div className="t-filters" role="group" aria-label={lang === "ar" ? "تصفية النوع" : "Filter by type"}>
          {TYPE_FILTERS.map((f) => (
            <button key={f.key} type="button" className={`t-filter ${filter === f.key ? "t-filter--on" : ""}`} aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>
              <Bi en={f.en} ar={f.ar} />
            </button>
          ))}
        </div>
        {canAdd && (
          <button type="button" className="t-btn t-btn--primary" onClick={() => setCreating(true)}>
            <Icon name="plus" size={16} />
            <Bi en="Add activity" ar={"إضافة نشاط"} />
          </button>
        )}
      </div>

      <div className="t-surface">
        {!activities.loading && !activities.error && all.length === 0 ? (
          <EmptyState icon="clipboardList" en="No activities have been created." ar={"لم يتم إنشاء أنشطة."}>
            {canAdd && (
              <button type="button" className="t-btn t-btn--primary t-btn--sm" onClick={() => setCreating(true)}>
                <Icon name="plus" size={15} />
                <Bi en="Add activity" ar={"إضافة نشاط"} />
              </button>
            )}
          </EmptyState>
        ) : (
          <CourseActivitiesTable
            activities={rows}
            lang={lang}
            loading={activities.loading}
            error={activities.error}
            onRetry={() => reload("activities")}
            onGrade={(a) => {
              onGradeActivity?.(a);
              onGoToTab("grading");
            }}
          />
        )}
      </div>

      {creating && (
        <ActivityCreateDialog
          course={course}
          actorId={actorId}
          lang={lang}
          dir={dir}
          announce={announce}
          onClose={() => setCreating(false)}
          onCreated={() => reload("activities")}
        />
      )}
    </div>
  );
}
