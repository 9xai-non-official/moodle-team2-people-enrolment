// Page registry — App renders PAGES[active]; nav order is NAV_ITEMS.
// navFor(session) scopes the nav to who is signed in: students never see
// admin tooling, teachers get Teaching, explore mode sees everything.
import DashboardPage from "./DashboardPage";
import DemosPage from "./DemosPage";
import CatalogPage from "./CatalogPage";
import TeachingPage from "./TeachingPage";
import AdminPage from "./AdminPage";
import EnrolmentPage from "./EnrolmentPage";
import RolesPage from "./RolesPage";
import GroupsPage from "./GroupsPage";
import ProgressPage from "./ProgressPage";

export const PAGES = {
  Dashboard: DashboardPage,
  Courses: CatalogPage,
  Teaching: TeachingPage,
  Admin: AdminPage,
  Demos: DemosPage,
  Enrolment: EnrolmentPage,
  Roles: RolesPage,
  Groups: GroupsPage,
  Progress: ProgressPage,
};

export const NAV_ITEMS = Object.keys(PAGES);

export function navFor(session) {
  if (!session || session.mode === "explore" || session.is_admin) return NAV_ITEMS;
  if (session.teaches?.length) return NAV_ITEMS.filter((p) => p !== "Admin"); // teachers: everything but site admin
  return ["Dashboard", "Courses", "Progress"]; // student: their world only
}

export {
  DashboardPage as Dashboard,
  DemosPage as Demos,
  CatalogPage as Catalog,
  TeachingPage as Teaching,
  EnrolmentPage as Enrolment,
  RolesPage as Roles,
  GroupsPage as Groups,
  ProgressPage as Progress,
};
