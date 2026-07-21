// Page registry — App renders PAGES[active]; nav order is NAV_ITEMS.
import DashboardPage from "./DashboardPage";
import EnrolmentPage from "./EnrolmentPage";
import RolesPage from "./RolesPage";
import GroupsPage from "./GroupsPage";
import ProgressPage from "./ProgressPage";

export const PAGES = {
  Dashboard: DashboardPage,
  Enrolment: EnrolmentPage,
  Roles: RolesPage,
  Groups: GroupsPage,
  Progress: ProgressPage,
};

export const NAV_ITEMS = Object.keys(PAGES);

export {
  DashboardPage as Dashboard,
  EnrolmentPage as Enrolment,
  RolesPage as Roles,
  GroupsPage as Groups,
  ProgressPage as Progress,
};
