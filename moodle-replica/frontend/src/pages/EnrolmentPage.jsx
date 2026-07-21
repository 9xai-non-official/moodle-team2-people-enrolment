// Enrolment section (task 06 §4.2): course selector → Participants / Methods /
// Cohorts / Other users / Self-enrol demo. Clicking a participant name opens
// the per-user paths drawer (HC-1).
import { useEffect, useState } from "react";
import { apiGet } from "../api";
import { useSelectedCourse } from "../context/SelectedCourse";
import CourseSelect from "../components/common/CourseSelect";
import Tabs from "../components/common/Tabs";
import DataTable from "../components/common/DataTable";
import ParticipantsTable from "../components/enrolment/ParticipantsTable";
import MethodsPanel from "../components/enrolment/MethodsPanel";
import SelfEnrolDemo from "../components/enrolment/SelfEnrolDemo";
import UserPathsDrawer from "../components/enrolment/UserPathsDrawer";

const TABS = ["Participants", "Methods", "Cohorts", "Other users", "Self-enrol demo"];

function CohortsTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    apiGet("/api/enrolment/cohorts")
      .then(setRows)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DataTable
      loading={loading}
      error={error}
      rows={rows}
      empty="No cohorts."
      columns={[
        { key: "name", label: "Cohort" },
        { key: "id_number", label: "ID number" },
        { key: "member_count", label: "Members" },
        {
          key: "synced_courses",
          label: "Synced courses",
          render: (r) =>
            r.synced_courses.length ? r.synced_courses.join(", ") : "—",
        },
      ]}
    />
  );
}

function OtherUsersTab({ courseId }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    apiGet(`/api/enrolment/courses/${courseId}/other-users`)
      .then(setRows)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [courseId]);

  return (
    <DataTable
      loading={loading}
      error={error}
      rows={rows}
      empty="No users with a role but no enrolment."
      rowKey={(r) => r.user_id}
      columns={[
        { key: "full_name", label: "Name" },
        {
          key: "roles",
          label: "Roles",
          render: (r) => r.roles.join(", ") || "—",
        },
        {
          key: "note",
          label: "Note",
          render: (r) => <span className="muted">{r.note}</span>,
        },
      ]}
    />
  );
}

export default function EnrolmentPage() {
  const { courseId, setCourseId } = useSelectedCourse();
  const [tab, setTab] = useState("Participants");
  const [drawer, setDrawer] = useState(null); // { id, name }

  return (
    <div>
      <h1>Enrolment</h1>
      <div className="form-row">
        <label>Course</label>
        <CourseSelect value={courseId} onChange={setCourseId} autoSelectFirst />
      </div>

      {!courseId ? (
        <p className="muted">Select a course to manage enrolment.</p>
      ) : (
        <>
          <Tabs tabs={TABS} active={tab} onChange={setTab} />
          {tab === "Participants" && (
            <ParticipantsTable
              courseId={courseId}
              onOpenUser={(id, name) => setDrawer({ id, name })}
            />
          )}
          {tab === "Methods" && <MethodsPanel courseId={courseId} />}
          {tab === "Cohorts" && <CohortsTab />}
          {tab === "Other users" && <OtherUsersTab courseId={courseId} />}
          {tab === "Self-enrol demo" && <SelfEnrolDemo courseId={courseId} />}
        </>
      )}

      {drawer && (
        <UserPathsDrawer
          userId={drawer.id}
          userName={drawer.name}
          onClose={() => setDrawer(null)}
        />
      )}
    </div>
  );
}
