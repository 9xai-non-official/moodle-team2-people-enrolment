// Course activities — desktop table + mobile card list, shared by the
// Participants tab (overview, spec §29) and the Activities tab (management,
// §36). Presentational: the parent owns fetching + the "Add activity" affordance
// and passes rows in. Icons match their type consistently across the app (§30).
import Icon from "./icons";
import { Bi, EmptyState, ErrorState, TonePill } from "./ui";
import { activityType, groupModeLabel } from "../../lib/teaching";

function TypeChip({ type }) {
  const t = activityType(type);
  return (
    <span className="t-actype">
      <span className={`t-actish t-actish--${t.tone}`} aria-hidden="true">
        <Icon name={t.icon} size={16} />
      </span>
      <span className="t-actype__txt">
        <Bi en={t.en} ar={t.ar} />
      </span>
    </span>
  );
}

function CompletionCell({ enabled }) {
  return enabled ? (
    <TonePill
      tone="green"
      icon="clipboardCheck"
      en="Completion tracking enabled"
      ar={"تتبّع الإكمال مفعّل"}
    />
  ) : (
    <TonePill tone="grey" en="Completion disabled" ar={"بلا تتبّع إكمال"} />
  );
}

function GroupModeCell({ mode, forced }) {
  const g = groupModeLabel(mode);
  return (
    <span className="t-gmode">
      <Icon name={g.icon} size={16} className="t-gmode__ic" />
      <span className="t-gmode__txt">
        <Bi en={g.en} ar={g.ar} />
        {forced ? (
          <span className="t-gmode__sub">
            <Bi en="course default (forced)" ar={"افتراضي المقرر (مفروض)"} />
          </span>
        ) : null}
      </span>
    </span>
  );
}

function GradeAction({ a, onGrade }) {
  const gradable = a.type === "assign" || a.type === "quiz";
  if (!gradable) return <span className="t-muted">—</span>;
  return (
    <button type="button" className="t-btn t-btn--ghost t-btn--sm" onClick={() => onGrade?.(a)}>
      <Icon name={a.type === "quiz" ? "clipboardCheck" : "fileCheck"} size={15} />
      <Bi en="Grade" ar={"تقييم"} />
    </button>
  );
}

export default function CourseActivitiesTable({ activities, lang, loading, error, onRetry, onGrade }) {
  if (error) return <ErrorState error={error} onRetry={onRetry} lang={lang} compact />;
  if (loading)
    return (
      <div className="t-table-wrap" aria-hidden="true">
        <div className="t-skel-rows">
          {[0, 1, 2].map((i) => (
            <div className="t-skel-row" key={i} />
          ))}
        </div>
      </div>
    );
  if (!activities.length)
    return (
      <EmptyState
        icon="clipboardList"
        en="No activities have been created."
        ar={"لم يتم إنشاء أنشطة."}
        compact
      />
    );

  return (
    <>
      {/* Desktop table */}
      <div className="t-table-wrap t-only-wide">
        <table className="t-table">
          <thead>
            <tr>
              <th scope="col"><Bi en="Activity" ar={"النشاط"} /></th>
              <th scope="col"><Bi en="Type" ar={"النوع"} /></th>
              <th scope="col"><Bi en="Group mode" ar={"وضع المجموعة"} /></th>
              <th scope="col"><Bi en="Completion" ar={"إتمام النشاط"} /></th>
              <th scope="col" className="t-col-actions"><Bi en="Actions" ar={"الإجراءات"} /></th>
            </tr>
          </thead>
          <tbody>
            {activities.map((a) => (
              <tr key={a.id}>
                <td>
                  <div className="t-actname">
                    <span className={`t-actish t-actish--${activityType(a.type).tone}`} aria-hidden="true">
                      <Icon name={activityType(a.type).icon} size={17} />
                    </span>
                    <span className="t-actname__txt">
                      <span className="t-actname__name">{a.name}</span>
                      {!a.visible ? (
                        <span className="t-actname__sub">
                          <Bi en="Hidden from students" ar={"مخفي عن الطلاب"} />
                        </span>
                      ) : null}
                    </span>
                  </div>
                </td>
                <td><TypeChip type={a.type} lang={lang} /></td>
                <td><GroupModeCell mode={a.groupMode} forced={a.groupModeForced} lang={lang} /></td>
                <td><CompletionCell enabled={a.completionEnabled} lang={lang} /></td>
                <td className="t-col-actions"><GradeAction a={a} lang={lang} onGrade={onGrade} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="t-cards t-only-narrow">
        {activities.map((a) => (
          <li className="t-card" key={a.id}>
            <div className="t-card__head">
              <span className={`t-actish t-actish--${activityType(a.type).tone}`} aria-hidden="true">
                <Icon name={activityType(a.type).icon} size={18} />
              </span>
              <span className="t-card__title">
                {a.name}
                {!a.visible ? (
                  <span className="t-actname__sub">
                    <Bi en="Hidden from students" ar={"مخفي عن الطلاب"} />
                  </span>
                ) : null}
              </span>
            </div>
            <dl className="t-card__grid">
              <div><dt><Bi en="Type" ar={"النوع"} /></dt><dd><TypeChip type={a.type} lang={lang} /></dd></div>
              <div><dt><Bi en="Group mode" ar={"وضع المجموعة"} /></dt><dd><GroupModeCell mode={a.groupMode} forced={a.groupModeForced} lang={lang} /></dd></div>
              <div><dt><Bi en="Completion" ar={"الإتمام"} /></dt><dd><CompletionCell enabled={a.completionEnabled} lang={lang} /></dd></div>
            </dl>
            <div className="t-card__foot">
              <GradeAction a={a} lang={lang} onGrade={onGrade} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
