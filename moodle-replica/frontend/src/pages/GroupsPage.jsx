// Groups (task 06 §4.4): pick a course, then Groups / Groupings / Activity
// policy / Scope check. Every panel fetches on its own; refusals show verbatim.
import { useState } from "react";
import { useSelectedCourse } from "../context/SelectedCourse";
import CourseSelect from "../components/common/CourseSelect";
import CourseModeChip from "../components/common/CourseModeChip";
import PageIntro from "../components/common/PageIntro";
import Term from "../components/common/Term";
import Tabs from "../components/common/Tabs";
import GroupsBoard from "../components/groups/GroupsBoard";
import GroupingPanel from "../components/groups/GroupingPanel";
import ActivityPolicyTable from "../components/groups/ActivityPolicyTable";
import AllowedGroupsPanel from "../components/groups/AllowedGroupsPanel";
import ScopeCheckPanel from "../components/groups/ScopeCheckPanel";

const TABS = ["Groups", "Groupings", "Activity policy", "Scope check"];

export default function GroupsPage() {
  const { courseId, setCourseId } = useSelectedCourse();
  const [tab, setTab] = useState(TABS[0]);

  return (
    <div>
      <h1>Groups</h1>
      <PageIntro line={<>Partitions inside one course: <Term k="group">groups</Term>, <Term k="grouping">groupings</Term>, and who can see whom.</>}>
        <p>A <Term k="group" /> holds people; a <Term k="grouping" /> holds groups. Activities restrict themselves to groupings. The <Term k="group mode" /> decides isolation — and when a course FORCES it, per-activity settings are silently ignored (the highlighted rows).</p>
      </PageIntro>
      <div className="form-row">
        <label>Course</label>
        <CourseSelect value={courseId} onChange={setCourseId} autoSelectFirst />
        <CourseModeChip courseId={courseId} />
      </div>

      {!courseId && <p className="muted">Select a course to view its groups.</p>}
      {courseId && (
        <>
          <Tabs tabs={TABS} active={tab} onChange={setTab} />
          {tab === "Groups" && <GroupsBoard courseId={courseId} />}
          {tab === "Groupings" && <GroupingPanel courseId={courseId} />}
          {tab === "Activity policy" && <ActivityPolicyTable courseId={courseId} />}
          {tab === "Scope check" && (
            <>
              <AllowedGroupsPanel courseId={courseId} />
              <ScopeCheckPanel courseId={courseId} />
            </>
          )}
        </>
      )}
    </div>
  );
}
