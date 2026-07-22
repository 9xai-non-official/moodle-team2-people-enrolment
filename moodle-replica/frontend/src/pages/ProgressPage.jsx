// Progress (task 06 §4.5): course selector + Report / My progress / Criteria /
// History tabs. Report and Criteria need a course; My progress and History
// work without one.
import { useEffect, useRef, useState } from "react";
import { useSelectedCourse } from "../context/SelectedCourse";
import { useActingUser } from "../context/ActingUser";
import { useSession } from "../context/Session";
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
  const { session } = useSession();
  // Signed-in plain students get ONLY their own world: no Report grid with
  // everyone's cells and Override powers, no Criteria editor, no hidden
  // activity names. Explore mode and teacher/admin sessions keep everything.
  // (Persona students in explore mode still get the "My progress"-first
  // reorder — same tabs, same data, a manual click always wins.)
  const plainStudent =
    session?.mode === "user" && !session.is_admin && !(session.teaches?.length > 0);
  const isStudentPersona = !!actingUser?.username?.startsWith("student.");
  const tabs = plainStudent
    ? ["My progress", "History"]
    : isStudentPersona
      ? ["My progress", "Report", "Criteria", "History"]
      : TABS;
  const [tab, setTab] = useState("Report");
  const picked = useRef(false);
  useEffect(() => {
    if (!picked.current && (plainStudent || isStudentPersona)) setTab("My progress");
  }, [plainStudent, isStudentPersona]);
  const handleTab = (t) => {
    picked.current = true;
    setTab(t);
  };
  const activeTab = tabs.includes(tab) ? tab : tabs[0];

  return (
    <div className="progress-page">
      <h1>Progress</h1>
      <PageIntro line={<>Who finished what — and the record that outlives unenrolment and even course deletion.</>}>
        <p><Term k="completion">Completion</Term> is a fact about the past: dropping a student does not erase it, and the History tab still answers for courses that no longer exist. <Term k="criteria">Criteria</Term> define what "course complete" means.</p>
      </PageIntro>

      {!plainStudent && (
        <div className="form-row">
          <label>Course</label>
          <CourseSelect value={courseId} onChange={setCourseId} autoSelectFirst />
          <CourseModeChip courseId={courseId} />
        </div>
      )}

      <Tabs tabs={tabs} active={activeTab} onChange={handleTab} />

      {activeTab === "Report" &&
        (courseId ? (
          <CompletionGrid courseId={courseId} />
        ) : (
          <p className="muted">Select a course to see its completion report.</p>
        ))}
      {activeTab === "My progress" && <MyProgress />}
      {activeTab === "Criteria" &&
        (courseId ? (
          <CriteriaEditor courseId={courseId} />
        ) : (
          <p className="muted">Select a course to edit completion criteria.</p>
        ))}
      {activeTab === "History" && <HistoryTimeline />}
    </div>
  );
}
