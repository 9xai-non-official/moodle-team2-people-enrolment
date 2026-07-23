// Other users (spec §36-37): people who hold a role in this course but have no
// enrolment row. Real endpoint GET /api/enrolment/courses/{id}/other-users →
// {user_id, full_name, roles[], note}. Each row offers a one-click Enrol (opens
// the prefilled enrol modal) where authorized; refusals surface on submit.
import { useEffect, useState } from "react";
import { apiGet } from "../../api";
import Icon from "./icons";
import { Avatar, EmptyState, ScopedError, Spinner, T, both, friendlyError, roleMeta } from "./ui";

const PREVIEW = 5;

export default function OtherUsersPanel({ courseId, refreshKey, onEnrol, lang }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAll, setShowAll] = useState(false);

  const load = () => {
    setLoading(true);
    setError(null);
    apiGet(`/api/enrolment/courses/${courseId}/other-users`)
      .then(setRows)
      .catch((e) => setError(friendlyError(e, lang)))
      .finally(() => setLoading(false));
  };

  useEffect(load, [courseId, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const shown = showAll ? rows : rows.slice(0, PREVIEW);

  return (
    <section className="enr-rail__panel enr-others" aria-label={both("Other users", "مستخدمون آخرون")}>
      <header className="enr-rail__head">
        <h2 className="enr-rail__title">
          <T en="Other users" ar="مستخدمون آخرون" />
        </h2>
      </header>
      <p className="enr-rail__intro">
        <T
          en="Users with roles in this course but not enrolled."
          ar="مستخدمون لديهم أدوار في هذا المقرر ولكنهم غير مسجلين."
        />
      </p>

      {loading && <Spinner lang={lang} />}
      {!loading && error && <ScopedError message={error} onRetry={load} lang={lang} />}
      {!loading && !error && rows.length === 0 && (
        <EmptyState
          icon="users"
          en="Everyone with a role here is enrolled."
          ar="كل من له دور هنا مسجَّل."
        />
      )}

      {!loading && !error && shown.length > 0 && (
        <ul className="enr-others__list">
          {shown.map((u) => {
            const rm = roleMeta(u.roles?.[0]);
            return (
              <li key={u.user_id} className="enr-others__row">
                <Avatar name={u.full_name} size={34} />
                <div className="enr-others__id" title={u.note}>
                  <span className="enr-others__name">{u.full_name}</span>
                  <span className="enr-others__role">
                    <Icon name={rm.icon} size={13} />
                    <T en={rm.en} ar={rm.ar} />
                  </span>
                </div>
                <button
                  type="button"
                  className="enr-btn enr-btn--outline enr-btn--sm"
                  onClick={() => onEnrol(u.user_id)}
                >
                  <Icon name="userPlus" size={15} />
                  <T en="Enrol" ar="تسجيل" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {!loading && !error && rows.length > PREVIEW && (
        <footer className="enr-rail__foot">
          <button type="button" className="enr-link" onClick={() => setShowAll((s) => !s)}>
            {showAll ? (
              <T en="Show fewer" ar="عرض أقل" />
            ) : (
              <T
                en={`View all other users (${rows.length})`}
                ar={`عرض كل المستخدمين الآخرين (${rows.length})`}
              />
            )}
            <Icon name={showAll ? "chevronDown" : "chevronRight"} size={15} />
          </button>
        </footer>
      )}
    </section>
  );
}
