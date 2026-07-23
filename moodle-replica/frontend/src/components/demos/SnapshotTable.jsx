// Progress snapshot table. Renders ONLY fields the progress API actually
// supports (percent, activities counted/total, completed state) — it never
// fabricates per-category percentages (spec §31/§32). Before and After panels
// use this same component, so their rows, labels, scales and formatting are
// identical by construction, which is what makes the comparison honest. A
// missing row is shown as "no record" (unknown), never as 0%.
import Badge from "../common/Badge";
import { Bi, ProgressBar, EmptyState, pick } from "./ui";

export default function SnapshotTable({ row, lang = "en" }) {
  if (!row) {
    return (
      <EmptyState
        icon="chart"
        en="No progress record — state unknown."
        ar="لا يوجد سجل تقدّم — الحالة غير معروفة."
      />
    );
  }
  const excluded = Number(row.excluded) || 0;
  return (
    <table className="dm-snap">
      <caption className="dm-visually-hidden">{pick(lang, "Progress snapshot", "لقطة التقدّم")}</caption>
      <thead>
        <tr>
          <th scope="col">
            <Bi en="Item" ar="العنصر" />
          </th>
          <th scope="col">
            <Bi en="Progress" ar="التقدم" />
          </th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th scope="row">
            <Bi en="Percent complete" ar="نسبة الإكمال" />
          </th>
          <td>
            <ProgressBar percent={row.percent} lang={lang} label={pick(lang, "Percent complete", "نسبة الإكمال")} />
          </td>
        </tr>
        <tr>
          <th scope="row">
            <Bi en="Activities completed" ar="الأنشطة المكتملة" />
          </th>
          <td>
            <span className="dm-snap__count">
              {row.counted} / {row.total}
            </span>
            {excluded > 0 && (
              <span className="muted">
                {" · "}
                {excluded} {pick(lang, "hidden / excluded", "مخفية / مستثناة")}
              </span>
            )}
          </td>
        </tr>
        <tr>
          <th scope="row">
            <Bi en="Course completed" ar="إكمال المقرر" />
          </th>
          <td>
            {row.completed ? (
              <Badge variant="green">{row.completed_at || pick(lang, "yes", "نعم")}</Badge>
            ) : (
              <span className="muted">{pick(lang, "not yet", "ليس بعد")}</span>
            )}
          </td>
        </tr>
      </tbody>
    </table>
  );
}
