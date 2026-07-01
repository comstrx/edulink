import { Route, Navigate } from "react-router-dom";
import WorkforceIntelligence from "@/pages/app/school/WorkforceIntelligence";
import HiringOverview from "@/pages/app/school/hiring/Overview";
import HiringJobs from "@/pages/app/school/hiring/Jobs";
import SchoolTalentSearch from "@/pages/app/school/hiring/TalentSearch";
import Applicants from "@/pages/app/school/hiring/Applicants";
import Pipeline from "@/pages/app/school/hiring/Pipeline";
import Interviews from "@/pages/app/school/hiring/Interviews";
import HiringAnalytics from "@/pages/app/school/hiring/Analytics";
import SchoolTrainingOverview from "@/pages/app/school/training/Overview";
import TrainingCatalog from "@/pages/app/school/training/Catalog";
import AssignTraining from "@/pages/app/school/training/Assign";
import TeamProgress from "@/pages/app/school/training/TeamProgress";
import SchoolCredentials from "@/pages/app/school/training/Credentials";
import SchoolCompliance from "@/pages/app/school/training/Compliance";
import SchoolLibrary from "@/pages/app/school/training/Library";
import SchoolMentors from "@/pages/app/school/training/Mentors";
import SchoolCohorts from "@/pages/app/school/training/Cohorts";
import Billing from "@/pages/app/school/Billing";
import SchoolSettings from "@/pages/app/school/Settings";
import SchoolStart from "@/pages/app/school/Start";
import Team from "@/pages/app/school/Team";
import SchoolDashboard from "@/pages/app/school/Dashboard";

export const schoolStartRoutes = (
  <Route path="/app/school/start" element={<SchoolStart />} />
);

/** Hiring-specific routes — gated by canUseHiring entitlement */
export const schoolHiringRoutes = (
  <>
    <Route path="/app/school/hiring/overview" element={<HiringOverview />} />
    <Route path="/app/school/hiring/jobs" element={<HiringJobs />} />
    <Route path="/app/school/hiring/talent-search" element={<SchoolTalentSearch />} />
    <Route path="/app/school/hiring/applicants" element={<Applicants />} />
    <Route path="/app/school/hiring/pipeline" element={<Pipeline />} />
    <Route path="/app/school/hiring/interviews" element={<Interviews />} />
    <Route path="/app/school/hiring/analytics" element={<HiringAnalytics />} />
  </>
);

/** Training-specific routes — gated by canUseTraining entitlement */
export const schoolTrainingRoutes = (
  <>
    <Route path="/app/school/training/overview" element={<SchoolTrainingOverview />} />
    <Route path="/app/school/training/catalog" element={<TrainingCatalog />} />
    <Route path="/app/school/training/assign" element={<AssignTraining />} />
    <Route path="/app/school/training/team-progress" element={<TeamProgress />} />
    <Route path="/app/school/training/credentials" element={<SchoolCredentials />} />
    <Route path="/app/school/training/certificates" element={<Navigate to="/app/school/training/credentials" replace />} />
    <Route path="/app/school/training/compliance" element={<SchoolCompliance />} />
    <Route path="/app/school/training/library" element={<SchoolLibrary />} />
    <Route path="/app/school/training/mentors" element={<SchoolMentors />} />
    <Route path="/app/school/training/cohorts" element={<SchoolCohorts />} />
  </>
);

/** General school routes — no specific module entitlement needed */
export const schoolGeneralRoutes = (
  <>
    <Route path="/app/school/dashboard" element={<SchoolDashboard />} />
    <Route path="/app/school/billing" element={<Billing />} />
    <Route path="/app/school/settings" element={<SchoolSettings />} />
    <Route path="/app/school/team" element={<Team />} />
    <Route path="/app/school/workforce" element={<WorkforceIntelligence />} />
  </>
);
