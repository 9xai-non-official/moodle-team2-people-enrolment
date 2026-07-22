// Selected course, shared across pages — switching Enrolment → Groups →
// Progress keeps the same course in focus (found as friction while walking
// the real-DB demo; every page previously reset to the first course).
//
// Also the enforcement point for the deleted_at policy (T2-DATA-004):
//
//   current-state actions (enrol, roster, groups) must NOT operate on a
//   soft-deleted course; historical reads (progress, audit) may.
//
// GET /api/courses already excludes soft-deleted rows unless include_deleted=1
// (courses.py:20), so "selected id is not in the default catalog" IS the
// signal — no extra endpoint needed.
//
// `courseDeleted` is ADDITIVE: courseId/setCourseId behave exactly as before,
// and pages opt in to the guard. It defaults to false and stays false if the
// catalog cannot be read, so a failed fetch can never wrongly block a write.
import { createContext, useContext, useEffect, useState } from "react";

import { cachedGet } from "../lib/catalog";

const SelectedCourseContext = createContext({
  courseId: null,
  setCourseId: () => {},
  courseDeleted: false,
});

export function SelectedCourseProvider({ children }) {
  const [courseId, setCourseId] = useState(null);
  const [courseDeleted, setCourseDeleted] = useState(false);

  useEffect(() => {
    if (courseId == null) {
      setCourseDeleted(false);
      return;
    }
    let live = true;
    cachedGet("/api/courses")
      .then((courses) => {
        if (!live) return;
        // Present in the live catalog => not soft-deleted.
        setCourseDeleted(!courses.some((c) => c.id === courseId));
      })
      .catch(() => {
        if (live) setCourseDeleted(false); // fail open: never block on a read error
      });
    return () => {
      live = false;
    };
  }, [courseId]);

  return (
    <SelectedCourseContext.Provider
      value={{ courseId, setCourseId, courseDeleted }}
    >
      {children}
    </SelectedCourseContext.Provider>
  );
}

export function useSelectedCourse() {
  return useContext(SelectedCourseContext);
}
