// Course dropdown fed by /api/courses. value = course id (number) or "".
import { useEffect, useState } from "react";
import { cachedGet } from "../../lib/catalog";

export default function CourseSelect({
  value,
  onChange,
  includeDeleted = false,
  autoSelectFirst = false,
}) {
  const [courses, setCourses] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    cachedGet(`/api/courses${includeDeleted ? "?include_deleted=1" : ""}`)
      .then((list) => {
        setCourses(list);
        if (autoSelectFirst && list.length && !value) onChange(list[0].id);
      })
      .catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeDeleted]);

  if (error) return <span className="inline-error">courses: {error}</span>;
  return (
    <select
      className="select"
      aria-label="Course"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
    >
      <option value="">— course —</option>
      {courses.map((c) => (
        <option key={c.id} value={c.id}>
          {c.short_name}
          {c.deleted ? " (deleted)" : ""}
        </option>
      ))}
    </select>
  );
}
