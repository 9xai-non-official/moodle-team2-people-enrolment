// Student's assignment workspace: online text + file/image upload, saved as
// draft until submitted with the Moodle submission statement. Submitted work
// locks (ask the teacher to revert — same as Moodle); graded work shows the
// grade and feedback.
import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../../api";
import Badge from "../common/Badge";
import ReasonList from "../common/ReasonList";

const STATUS_BADGE = {
  none: ["neutral", "not started"],
  draft: ["amber", "draft — not submitted"],
  submitted: ["blue", "submitted"],
  graded: ["green", "graded"],
};

// Images small enough to inline get a thumbnail; everything else keeps
// name/size only — it's a mock store, not a file server.
const PREVIEW_LIMIT = 300 * 1024;

function readFile(file) {
  return new Promise((resolve) => {
    const meta = { name: file.name, size: file.size, type: file.type };
    if (!file.type.startsWith("image/") || file.size > PREVIEW_LIMIT)
      return resolve(meta);
    const reader = new FileReader();
    reader.onload = () => resolve({ ...meta, data_url: reader.result });
    reader.onerror = () => resolve(meta);
    reader.readAsDataURL(file);
  });
}

const fmtSize = (n) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(n / 1024)} KB`);

export default function AssignmentPanel({ activity, userId }) {
  const [sub, setSub] = useState(null);
  const [text, setText] = useState("");
  const [files, setFiles] = useState([]);
  const [statement, setStatement] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setError(null);
    apiGet(`/api/lms/activities/${activity.id}/submission?user_id=${userId}`)
      .then((s) => {
        setSub(s);
        setText(s.text ?? "");
        setFiles(s.files ?? []);
        setStatement(Boolean(s.statement_accepted));
      })
      .catch(setError);
  }, [activity.id, userId]);

  async function save(action) {
    setError(null);
    setBusy(true);
    try {
      const s = await apiPost(`/api/lms/activities/${activity.id}/submission`, {
        user_id: userId,
        text,
        files,
        action,
        statement_accepted: statement,
      });
      setSub(s);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  async function pickFiles(e) {
    const picked = await Promise.all([...e.target.files].map(readFile));
    setFiles((cur) => [...cur, ...picked].slice(0, 5));
    e.target.value = "";
  }

  if (!sub) return error ? <ReasonList reasons={error.reasons ?? [error.message]} /> : <p className="muted">loading…</p>;

  const [variant, label] = STATUS_BADGE[sub.status ?? "none"];
  const locked = sub.status === "submitted" || sub.status === "graded";

  return (
    <div className="panel">
      <div className="panel__title">
        📄 {activity.name} <Badge variant={variant}>{label}</Badge>
      </div>

      {sub.status === "graded" && (
        <div className="grade-box">
          <div className="card__number">{sub.grade}/100</div>
          {sub.feedback && <p className="muted">“{sub.feedback}”</p>}
        </div>
      )}

      {locked ? (
        <>
          {sub.text && <p>{sub.text}</p>}
          <FileChips files={sub.files} />
          <p className="muted">
            submitted {sub.submitted_at?.slice(0, 16).replace("T", " ")} — locked; ask your
            teacher to revert to draft if you need changes.
          </p>
        </>
      ) : (
        <>
          <textarea
            className="input input--area"
            rows={4}
            placeholder="Online text — type your answer here…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="form-row">
            <label className="btn">
              📎 Add files / images
              <input type="file" multiple hidden onChange={pickFiles} />
            </label>
            <span className="muted">{files.length}/5 files</span>
          </div>
          <FileChips files={files} onRemove={(i) => setFiles(files.filter((_, j) => j !== i))} />
          <label className="form-row statement">
            <input type="checkbox" checked={statement} onChange={(e) => setStatement(e.target.checked)} />
            This submission is my own work (submission statement — required, like Moodle)
          </label>
          <div className="form-row">
            <button className="btn" disabled={busy} onClick={() => save("draft")}>
              Save draft
            </button>
            <button className="btn btn--primary" disabled={busy || !statement} onClick={() => save("submit")}>
              Submit for grading
            </button>
          </div>
        </>
      )}
      {error && <ReasonList reasons={error.reasons?.length ? error.reasons : [error.message]} />}
    </div>
  );
}

export function FileChips({ files, onRemove }) {
  if (!files?.length) return null;
  return (
    <div className="file-chips">
      {files.map((f, i) => (
        <span key={i} className="file-chip" title={`${f.type || "file"} · ${fmtSize(f.size)}`}>
          {f.data_url ? <img src={f.data_url} alt={f.name} /> : <span className="file-chip__icon">📄</span>}
          {f.name}
          {onRemove && (
            <button className="file-chip__x" onClick={() => onRemove(i)} title="remove">
              ×
            </button>
          )}
        </span>
      ))}
    </div>
  );
}
