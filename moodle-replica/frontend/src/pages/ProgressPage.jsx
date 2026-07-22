// Progress (task 06 §4.5): course selector + Report / My progress / Criteria /
// History tabs. Report and Criteria need a course; My progress and History
// work without one.
import { useEffect, useRef, useState } from "react";
import { useSelectedCourse } from "../context/SelectedCourse";
import { useActingUser } from "../context/ActingUser";
import CourseSelect from "../components/common/CourseSelect";
import CourseModeChip from "../components/common/CourseModeChip";
import PageIntro from "../components/common/PageIntro";
import Term from "../components/common/Term";
import Tabs from "../components/common/Tabs";
import CompletionGrid from "../components/progress/CompletionGrid";
import MyProgress from "../components/progress/MyProgress";
import CriteriaEditor from "../components/progress/CriteriaEditor";
import HistoryTimeline from "../components/progress/HistoryTimeline";

const TABS = ["Report", "My progress", "Criteria", "History"];

export default function ProgressPage() {
  const { courseId, setCourseId } = useSelectedCourse();
  const { actingUser } = useActingUser();
  // Presentation-level personalization (documented): a student persona
  // (student.* username) opens on "My progress" and sees it first in the strip —
  // the tab that answers "how am I doing". Same tabs, same data, just reordered;
  // teacher/admin personas keep Report-first. A manual tab click always wins.
  const isStudent = !!actingUser?.username?.startsWith("student.");
  const tabs = isStudent
    ? ["My progress", "Report", "Criteria", "History"]
    : TABS;
  const [tab, setTab] = useState("Report");
  const picked = useRef(false);
  useEffect(() => {
    if (!picked.current && isStudent) setTab("My progress");
  }, [isStudent]);
  const handleTab = (t) => {
    picked.current = true;
    setTab(t);
  };

  return (
    <div className="progress-page">
      <h1>Progress</h1>
      <PageIntro line={<>Who finished what — and the record that outlives unenrolment and even course deletion.</>}>
        <p><Term k="completion">Completion</Term> is a fact about the past: dropping a student does not erase it, and the History tab still answers for courses that no longer exist. <Term k="criteria">Criteria</Term> define what "course complete" means.</p>
      </PageIntro>

      <div className="form-row">
        <label>Course</label>
        <CourseSelect value={courseId} onChange={setCourseId} autoSelectFirst />
        <CourseModeChip courseId={courseId} />
      </div>

      <Tabs tabs={tabs} active={tab} onChange={handleTab} />

      {tab === "Report" &&
        (courseId ? (
          <CompletionGrid courseId={courseId} />
        ) : (
          <p className="muted">Select a course to see its completion report.</p>
        ))}
      {tab === "My progress" && <MyProgress />}
      {tab === "Criteria" &&
        (courseId ? (
          <CriteriaEditor courseId={courseId} />
        ) : (
          <p className="muted">Select a course to edit completion criteria.</p>
        ))}
      {tab === "History" && <HistoryTimeline />}
    </div>
  );
}
