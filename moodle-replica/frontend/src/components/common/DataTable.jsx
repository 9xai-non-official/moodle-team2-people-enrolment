// Plain table with the uniform fetch states (task 06 §6):
// loading row → data → empty message → error banner with backend text.
// columns: [{ key, label, render?(row) }]
export default function DataTable({
  columns,
  rows,
  loading = false,
  error = null,
  empty = "Nothing to show.",
  rowKey = (row, i) => row.id ?? i,
  rowClassName,
  onRowClick,
}) {
  return (
    <div className="table-scroll">
      <table className="data-table">
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c.key}>{c.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {loading &&
          [0, 1, 2].map((i) => (
            <tr key={`sk${i}`} aria-hidden="true">
              {columns.map((c) => (
                <td key={c.key}>
                  <span className="skeleton" />
                </td>
              ))}
            </tr>
          ))}
        {!loading && error && (
          <tr>
            <td
              className="data-table__state data-table__state--error"
              colSpan={columns.length}
            >
              {error}
            </td>
          </tr>
        )}
        {!loading && !error && rows.length === 0 && (
          <tr>
            <td className="data-table__state" colSpan={columns.length}>
              {empty}
            </td>
          </tr>
        )}
        {!loading &&
          !error &&
          rows.map((row, i) => (
            <tr
              key={rowKey(row, i)}
              className={
                [
                  onRowClick ? "data-table__row--clickable" : "",
                  rowClassName ? rowClassName(row) : "",
                ]
                  .filter(Boolean)
                  .join(" ") || undefined
              }
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((c) => (
                <td key={c.key}>{c.render ? c.render(row) : row[c.key]}</td>
              ))}
            </tr>
          ))}
      </tbody>
      </table>
    </div>
  );
}
