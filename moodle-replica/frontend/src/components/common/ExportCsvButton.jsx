// Client-side CSV download. rows: array of objects; columns: [{key, label,
// value?(row)}] — value() lets callers flatten nested fields. Evidence files
// for the written deliverables (rules need reproducible exports).
function csvEscape(v) {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function ExportCsvButton({ filename, rows, columns, label = "Export CSV" }) {
  function download() {
    const head = columns.map((c) => csvEscape(c.label)).join(",");
    const body = rows.map((r) =>
      columns.map((c) => csvEscape(c.value ? c.value(r) : r[c.key])).join(","),
    );
    const blob = new Blob([[head, ...body].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <button className="btn" onClick={download} disabled={!rows?.length} title="Download what this table currently shows">
      {label}
    </button>
  );
}
