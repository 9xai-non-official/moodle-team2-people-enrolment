// My Groups (student view). Answers "which group am I in, and who else is in
// it?" for one course. A student never had a Groups nav entry — the existing
// Groups page is manager tooling (group:manage) — so this is their read-only
// window onto their own membership.
//
// Data: GET /api/groups/my?course_id=X returns the caller's own groups, each
// with the members they are allowed to see (the backend applies group
// visibility from the student's vantage — separate mode shows co-members of a
// shared group, an OWN/NONE group hides the rest). No management actions here.
import { useEffect, useState } from "react";
import { apiGet, ApiError } from "../api";
import { useActingUser } from "../context/ActingUser";
import { useSelectedCourse } from "../context/SelectedCourse";
import CourseSelect from "../components/common/CourseSelect";
import PageIntro from "../components/common/PageIntro";

function memberName(m) {
  const full = [m.first_name, m.last_name].filter(Boolean).join(" ").trim();
  return full || m.username || `user ${m.user_id}`;
}

export default function MyGroupsPage() {
  const { actingUser } = useActingUser();
  const { courseId, setCourseId } = useSelectedCourse();
  const [groups, setGroups] = useState(null); // null = not loaded yet
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!courseId) {
      setGroups(null);
      setError(null);
      return;
    }
    setBusy(true);
    setError(null);
    apiGet(`/api/groups/my?course_id=${courseId}`)
      .then((rows) => setGroups(Array.isArray(rows) ? rows : []))
      .catch((e) => {
        setGroups(null);
        setError(e instanceof ApiError ? e.detail || e.message : e.message);
      })
      .finally(() => setBusy(false));
    // actingUser is part of the key: switching persona re-scopes "my" groups.
  }, [courseId, actingUser?.id]);

  return (
    <div className="page">
      <h1 className="page-title">
        My groups <span lang="ar">مجموعاتي</span>
      </h1>
      <PageIntro line="The groups you belong to in a course, and the classmates you share them with.">
        You only ever see groups you are a member of. Who you can see inside a
        group follows the course’s group mode and each group’s visibility — in
        separate-groups mode you see the people in your own group, not others.
      </PageIntro>

      <div className="form-row" style={{ maxWidth: 360 }}>
        <label>Course</label>
        <CourseSelect value={courseId} onChange={setCourseId} autoSelectFirst />
      </div>

      {!actingUser && (
        <div className="error-banner">Sign in to see your groups.</div>
      )}
      {error && <div className="error-banner">{error}</div>}
      {busy && <div className="muted">Loading your groups…</div>}

      {!busy && !error && courseId && groups && groups.length === 0 && (
        <div className="empty-state">
          You’re not in any group in this course yet.
        </div>
      )}

      {!busy && !error && groups && groups.length > 0 && (
        <div className="groups-list" style={{ display: "grid", gap: "1rem" }}>
          {groups.map((g) => (
            <section key={g.id} className="card" style={{ padding: "1rem" }}>
              <header
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  gap: ".5rem",
                }}
              >
                <h2 style={{ margin: 0 }}>{g.name}</h2>
                <span className="muted">
                  {g.member_count} member{g.member_count === 1 ? "" : "s"}
                </span>
              </header>
              {g.description && (
                <p className="muted" style={{ marginTop: ".25rem" }}>
                  {g.description}
                </p>
              )}

              {g.members && g.members.length > 0 ? (
                <ul
                  className="member-list"
                  style={{ margin: ".5rem 0 0", paddingLeft: "1.1rem" }}
                >
                  {g.members.map((m) => (
                    <li key={m.user_id}>
                      {memberName(m)}
                      {m.user_id === actingUser?.id && (
                        <span className="badge" style={{ marginLeft: ".4rem" }}>
                          you
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted" style={{ marginTop: ".5rem" }}>
                  Member list is hidden for this group.
                </p>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
