// Progress (task 06 §4.5): course selector + Report / My progress / Criteria /
// History tabs. Report and Criteria need a course; My progress and History
// work without one.
import { useState } from "react";
import { useSelectedCourse } from "../context/SelectedCourse";
import CourseSelect from "../components/common/CourseSelect";
import CourseModeChip from "../components/common/CourseModeChip";
import Tabs from "../components/common/Tabs";
import CompletionGrid from "../components/progress/CompletionGrid";
import MyProgress from "../components/progress/MyProgress";
import CriteriaEditor from "../components/progress/CriteriaEditor";
import HistoryTimeline from "../components/progress/HistoryTimeline";

const TABS = ["Report", "My progress", "Criteria", "History"];

export default function ProgressPage() {
  const { courseId, setCourseId } = useSelectedCourse();
  const [tab, setTab] = useState("Report");

  return (
    <div>
      <h1>Progress</h1>

      <div className="form-row">
        <label>Course</label>
        <CourseSelect value={courseId} onChange={setCourseId} autoSelectFirst />
        <CourseModeChip courseId={courseId} />
      </div>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

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
