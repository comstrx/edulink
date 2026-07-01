import { Route } from "react-router-dom";
import MentorSessions from "@/pages/app/mentor/Sessions";
import MentorStart from "@/pages/app/mentor/Start";
import MentorOnboarding from "@/pages/app/mentor/Onboarding";

/** Pre-workspace routes — accessible to any teacher with mentor entitlement */
export const mentorOnboardingRoutes = (
  <>
    <Route path="/app/mentor/start" element={<MentorStart />} />
    <Route path="/app/mentor/onboarding" element={<MentorOnboarding />} />
  </>
);

/** Workspace routes — require active mentor + completed onboarding */
export const mentorRoutes = (
  <>
    <Route path="/app/mentor/sessions" element={<MentorSessions />} />
  </>
);
