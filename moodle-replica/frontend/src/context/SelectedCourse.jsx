// Selected course, shared across pages — switching Enrolment → Groups →
// Progress keeps the same course in focus (found as friction while walking
// the real-DB demo; every page previously reset to the first course).
import { createContext, useContext, useState } from "react";

const SelectedCourseContext = createContext({
  courseId: null,
  setCourseId: () => {},
});

export function SelectedCourseProvider({ children }) {
  const [courseId, setCourseId] = useState(null);
  return (
    <SelectedCourseContext.Provider value={{ courseId, setCourseId }}>
      {children}
    </SelectedCourseContext.Provider>
  );
}

export function useSelectedCourse() {
  return useContext(SelectedCourseContext);
}
