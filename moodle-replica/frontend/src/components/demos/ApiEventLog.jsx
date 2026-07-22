// API event log — a real, accessible table of the actual requests a demo made,
// in execution order. Method + status badges carry colour AND text; rows expand
// to a safe detail summary (step, duration, verbatim backend reasons); the
// endpoint and error detail are copyable. Auto-scrolls only when the reader is
// already at the bottom, and never steals focus (spec §26/§29/§30/§48).
import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "./icons";
import Dialog from "./Dialog";
import { Bi, MethodBadge, StatusBadge, CopyButton, EmptyState, pick } from "./ui";

function fmtTime(d) {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "";
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function DetailRow({ entry, lang, cols }) {
  const safe = entry.detail && typeof entry.detail === "object" ? JSON.stringify(entry.detail, null, 2) : entry.detail;
  return (
    <tr className="dm-log__detailrow">
      <td colSpan={cols}>
        <div className="dm-log__detail">
          <dl className="dm-log__meta">
            {entry.step && (
              <>
                <dt>{pick(lang, "Step", "الخطوة")}</dt>
                <dd>{entry.step}</dd>
              </>
            )}
            {typeof entry.ms === "number" && (
              <>
                <dt>{pick(lang, "Duration", "المدة")}</dt>
                <dd>{entry.ms} ms</dd>
              </>
            )}
          </dl>
          {entry.ok === false && entry.reasons?.length > 0 && (
            <div className="dm-log__reasons">
              <div className="dm-log__reasons-head">
                <Icon name="alert" />
                {pick(lang, "Backend reason", "سبب الخادم")}
                <CopyButton text={entry.reasons.join("\n")} label={pick(lang, "Copy reason", "نسخ السبب")} />
              </div>
              <ul>
                {entry.reasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}
          {entry.ok && safe && (
            <pre className="dm-log__json" aria-label={pick(lang, "Response summary", "ملخص الاستجابة")}>
              {safe}
            </pre>
          )}
        </div>
      </td>
    </tr>
  );
}

function LogTable({ entries, lang, scrollRef }) {
  const [open, setOpen] = useState(() => new Set());
  const toggle = (id) =>
    setOpen((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const COLS = 5;
  return (
    <div className="dm-log__scroll" ref={scrollRef}>
      <table className="dm-log">
        <thead>
          <tr>
            <th scope="col" className="dm-log__exp-h">
              <span className="dm-visually-hidden">{pick(lang, "Details", "التفاصيل")}</span>
            </th>
            <th scope="col">
              <Bi en="Time" ar="الوقت" />
            </th>
            <th scope="col">Method</th>
            <th scope="col">
              <Bi en="Endpoint" ar="نقطة النهاية" />
            </th>
            <th scope="col">
              <Bi en="Status" ar="الحالة" />
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => {
            const isOpen = open.has(e.id);
            const canExpand = e.step || typeof e.ms === "number" || e.reasons?.length || e.detail;
            return (
              <ExpandableRows key={e.id} entry={e} isOpen={isOpen} toggle={toggle} canExpand={canExpand} lang={lang} cols={COLS} />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Split out so the detail <tr> is a sibling of its row (valid inside one tbody).
function ExpandableRows({ entry: e, isOpen, toggle, canExpand, lang, cols }) {
  return (
    <>
      <tr className={`dm-log__row${e.ok === false ? " dm-log__row--err" : ""}`}>
        <td className="dm-log__exp" data-label="">
          {canExpand ? (
            <button
              type="button"
              className="dm-log__expbtn"
              aria-expanded={isOpen}
              aria-label={
                isOpen ? pick(lang, "Hide details", "إخفاء التفاصيل") : pick(lang, "Show details", "عرض التفاصيل")
              }
              onClick={() => toggle(e.id)}
            >
              <Icon name={isOpen ? "chevronDown" : "chevron"} />
            </button>
          ) : null}
        </td>
        <td data-label={pick(lang, "Time", "الوقت")} className="dm-log__time">
          <Icon name="clock" className="dm-log__clock" />
          {fmtTime(e.at)}
        </td>
        <td data-label="Method">
          <MethodBadge method={e.method} />
        </td>
        <td data-label={pick(lang, "Endpoint", "نقطة النهاية")} className="dm-log__ep">
          <code>{e.endpoint}</code>
          <CopyButton text={e.endpoint} label={pick(lang, "Copy endpoint", "نسخ نقطة النهاية")} />
        </td>
        <td data-label={pick(lang, "Status", "الحالة")}>
          <StatusBadge status={e.status} reason={e.reasons?.[0]} lang={lang} />
        </td>
      </tr>
      {isOpen && <DetailRow entry={e} lang={lang} cols={cols} />}
    </>
  );
}

export default function ApiEventLog({ entries, lang = "en", dir = "ltr" }) {
  const scrollRef = useRef(null);
  const dlgScrollRef = useRef(null);
  const [full, setFull] = useState(false);
  const [fMethod, setFMethod] = useState("ALL");
  const [fClass, setFClass] = useState("ALL");
  const titleId = "dm-log-title";

  // Auto-scroll to the newest row only when the reader is already near the
  // bottom — never yank a reader who scrolled up.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    if (nearBottom) el.scrollTop = el.scrollHeight;
  }, [entries]);

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (fMethod !== "ALL" && e.method !== fMethod) return false;
      if (fClass === "ALL") return true;
      if (fClass === "pending") return e.status === "pending";
      const n = Number(e.status);
      if (fClass === "2xx") return n >= 200 && n < 300;
      if (fClass === "4xx") return n >= 400 && n < 500;
      if (fClass === "5xx") return (Number.isFinite(n) && n >= 500) || !Number.isFinite(n);
      return true;
    });
  }, [entries, fMethod, fClass]);

  return (
    <section className="dm-panel dm-logpanel" aria-labelledby={titleId}>
      <div className="dm-panel__head">
        <h3 id={titleId} className="dm-panel__title">
          <Icon name="terminal" />
          <Bi en="API event log" ar="سجل أحداث API" />
        </h3>
        {entries.length > 0 && (
          <button type="button" className="dm-linkbtn" onClick={() => setFull(true)}>
            <Bi en="View full log" ar="عرض السجل الكامل" />
            <Icon name="maximize" />
          </button>
        )}
      </div>

      {entries.length === 0 ? (
        <EmptyState
          icon="terminal"
          en="Run the demo to see API events."
          ar="شغّل العرض لمشاهدة أحداث API."
        />
      ) : (
        <LogTable entries={entries} lang={lang} scrollRef={scrollRef} />
      )}

      <Dialog open={full} onClose={() => setFull(false)} labelledBy="dm-fulllog-title" className="dm-dialog--wide" dir={dir}>
        <div className="dm-dialog__head">
          <h2 id="dm-fulllog-title" className="dm-dialog__title">
            <Icon name="terminal" />
            <Bi en="Full API log" ar="السجل الكامل لـ API" />
          </h2>
          <button type="button" className="dm-iconbtn" aria-label={pick(lang, "Close", "إغلاق")} onClick={() => setFull(false)}>
            <Icon name="x" />
          </button>
        </div>
        <div className="dm-dialog__toolbar">
          <label className="dm-filter">
            <Bi en="Method" ar="الطريقة" />
            <select value={fMethod} onChange={(e) => setFMethod(e.target.value)}>
              <option value="ALL">{pick(lang, "All", "الكل")}</option>
              <option>GET</option>
              <option>POST</option>
              <option>PATCH</option>
              <option>DELETE</option>
            </select>
          </label>
          <label className="dm-filter">
            <Bi en="Status" ar="الحالة" />
            <select value={fClass} onChange={(e) => setFClass(e.target.value)}>
              <option value="ALL">{pick(lang, "All", "الكل")}</option>
              <option value="2xx">2xx</option>
              <option value="4xx">4xx</option>
              <option value="5xx">5xx</option>
              <option value="pending">{pick(lang, "Pending", "قيد التنفيذ")}</option>
            </select>
          </label>
          <CopyButton
            text={filtered.map((e) => `${fmtTime(e.at)}  ${e.method}  ${e.endpoint}  ${e.status}`).join("\n")}
            label={pick(lang, "Copy all shown", "نسخ الكل")}
          />
        </div>
        <div className="dm-dialog__body">
          {filtered.length === 0 ? (
            <EmptyState icon="terminal" en="No events match the filter." ar="لا توجد أحداث مطابقة." />
          ) : (
            <LogTable entries={filtered} lang={lang} scrollRef={dlgScrollRef} />
          )}
        </div>
        <div className="dm-dialog__foot">
          <button type="button" className="btn" onClick={() => setFull(false)}>
            <Bi en="Close" ar="إغلاق" />
          </button>
        </div>
      </Dialog>
    </section>
  );
}
