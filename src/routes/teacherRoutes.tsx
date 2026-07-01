import { Route, Navigate } from "react-router-dom";
import TeacherDashboard from "@/pages/app/teacher/Dashboard";
import Applications from "@/pages/app/teacher/Applications";
import SavedJobs from "@/pages/app/teacher/SavedJobs";
import TeacherProfileRedirect from "@/pages/app/teacher/ProfileRedirect";
// Documents route redirects to Credentials (consolidated)
import TeacherTraining from "@/pages/app/teacher/Training";
import Recommendations from "@/pages/app/teacher/Recommendations";
import TeacherStart from "@/pages/app/teacher/Start";
import TeacherOnboarding from "@/pages/app/teacher/Onboarding";
import MyLearning from "@/pages/app/teacher/MyLearning";
import TeacherPathways from "@/pages/app/teacher/Pathways";
import Practice from "@/pages/app/teacher/Practice";
import Evidence from "@/pages/app/teacher/Evidence";
import Credentials from "@/pages/app/teacher/Credentials";
import TeacherMentors from "@/pages/app/teacher/Mentors";
import TeacherLibrary from "@/pages/app/teacher/Library";
import TeacherSkills from "@/pages/app/teacher/Skills";
import ProfessionalIntelligence from "@/pages/app/teacher/ProfessionalIntelligence";

export const teacherRoutes = (
  <>
    <Route path="/app/teacher/start" element={<TeacherStart />} />
    <Route path="/app/teacher/onboarding" element={<TeacherOnboarding />} />
    <Route path="/app/teacher/dashboard" element={<TeacherDashboard />} />
    <Route path="/app/teacher/applications" element={<Applications />} />
    <Route path="/app/teacher/saved-jobs" element={<SavedJobs />} />
    <Route path="/app/teacher/profile" element={<TeacherProfileRedirect />} />
    <Route path="/app/teacher/documents" element={<Navigate to="/app/teacher/credentials" replace />} />
    <Route path="/app/teacher/training" element={<TeacherTraining />} />
    <Route path="/app/teacher/my-learning" element={<MyLearning />} />
    <Route path="/app/teacher/pathways" element={<TeacherPathways />} />
    <Route path="/app/teacher/practice" element={<Practice />} />
    <Route path="/app/teacher/evidence" element={<Evidence />} />
    <Route path="/app/teacher/credentials" element={<Credentials />} />
    <Route path="/app/teacher/certificates" element={<Navigate to="/app/teacher/credentials" replace />} />
    <Route path="/app/teacher/mentors" element={<TeacherMentors />} />
    <Route path="/app/teacher/library" element={<TeacherLibrary />} />
    <Route path="/app/teacher/skills" element={<TeacherSkills />} />
    <Route path="/app/teacher/recommendations" element={<Recommendations />} />
    <Route path="/app/teacher/talent-profile" element={<ProfessionalIntelligence />} />
  </>
);
