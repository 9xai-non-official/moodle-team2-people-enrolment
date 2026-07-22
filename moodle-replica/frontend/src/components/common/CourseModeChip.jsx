// Course group-mode at a glance, next to every course selector.
// Keeps rule GRP-012 on screen: when force_group_mode is on, per-activity
// modes are silently ignored — the "forced" badge warns before anyone
// wonders why an activity setting does nothing.
import { useEffect, useState } from "react";
import { cachedGet } from "../../lib/catalog";
import Badge from "./Badge";

const MODE_VARIANT = { none: "neutral", separate: "amber", visible: "blue" };

export default function CourseModeChip({ courseId }) {
  const [course, setCourse] = useState(null);

  useEffect(() => {
    setCourse(null);
    if (!courseId) return;
    cachedGet("/api/courses?include_deleted=1")
      .then((list) => setCourse(list.find((c) => c.id === courseId) ?? null))
      .catch(() => setCourse(null)); // chip is decoration — never blocks the page
  }, [courseId]);

  if (!course) return null;
  return (
    <span>
      <Badge
        variant={MODE_VARIANT[course.group_mode] ?? "neutral"}
        title="course-level group mode"
      >
        groups: {course.group_mode}
      </Badge>
      {course.force_group_mode && (
        <Badge
          variant="amber"
          title="force_group_mode is on — per-activity group modes are silently ignored (GRP-012)"
        >
          forced
        </Badge>
      )}
      {course.deleted && <Badge variant="red">deleted</Badge>}
    </span>
  );
}
