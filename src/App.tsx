import { Toaster } from "@/components/ui/toaster"; // Phase 2 cleanup
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import RequireAuth from "@/components/RequireAuth";
import RequireActiveMentor from "@/components/guards/RequireActiveMentor";
import RequireProviderMembership from "@/components/guards/RequireProviderMembership";
import RequireMentorOnboarding from "@/components/guards/RequireMentorOnboarding";
import RequireSchoolMembership from "@/components/guards/RequireSchoolMembership";
import RequireEntitlement from "@/components/guards/RequireEntitlement";
import RequireOnboardingResolved from "@/components/guards/RequireOnboardingResolved";
import NotFound from "./pages/NotFound";
import AccessDenied from "./pages/AccessDenied";
import AccountResolve from "./pages/account/AccountResolve";

import PublicLayout from "./layouts/PublicLayout";
import AppLayout from "./layouts/AppLayout";
import AdminLayout from "./layouts/AdminLayout";

// Sprint 7: Bootstrap Smart Glue intent handlers at app startup
import { bootstrapHandlers } from "@/intelligence/handlers";
// Sprint 11.5: Register QueryClient for centralized cache invalidation
import { registerQueryClient } from "@/smart-glue/bridge";
bootstrapHandlers();

import { publicRoutes } from "./routes/publicRoutes";
import { teacherRoutes } from "./routes/teacherRoutes";
import { schoolStartRoutes, schoolHiringRoutes, schoolTrainingRoutes, schoolGeneralRoutes } from "./routes/schoolRoutes";
import { adminRoutes } from "./routes/adminRoutes";
import { providerRoutes, providerSetupRoutes } from "./routes/providerRoutes";
import { mentorRoutes, mentorOnboardingRoutes } from "./routes/mentorRoutes";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: "always",
      retry: 1,
    },
    mutations: {
      networkMode: "always",
    },
  },
});

// Register QueryClient so Smart Glue bridge can invalidate caches after snapshot writes
registerQueryClient(queryClient);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <LanguageProvider>
            <Routes>
              {/* Public */}
              <Route element={<PublicLayout />}>
                {publicRoutes}
              </Route>

              {/* ── Teacher ─────────────────────────────────────
                  Auth → Role → RequireOnboardingResolved → Workspace
                  RequireOnboardingResolved handles teacher readiness
                  (replaces the old RequireTeacherOnboarding guard). */}
              <Route element={<RequireAuth allowedRoles={["teacher"]} />}>
                <Route element={<RequireOnboardingResolved />}>
                  <Route element={<AppLayout />}>
                    {teacherRoutes}
                  </Route>
                </Route>
              </Route>

              {/* ── Mentor setup/application — teacher only, no entitlement ── */}
              <Route element={<RequireAuth allowedRoles={["teacher"]} />}>
                <Route element={<AppLayout />}>
                  {mentorOnboardingRoutes}
                </Route>
              </Route>

              {/* ── Mentor workspace — teacher + active + entitlement + onboarding ── */}
              <Route element={<RequireAuth allowedRoles={["teacher"]} />}>
                <Route element={<RequireActiveMentor />}>
                  <Route element={<RequireEntitlement check="canUseMentorWorkspace" fallback="/app/teacher/dashboard" />}>
                    <Route element={<RequireMentorOnboarding />}>
                      <Route element={<AppLayout />}>
                        {mentorRoutes}
                      </Route>
                    </Route>
                  </Route>
                </Route>
              </Route>

              {/* ── School Start — all school roles + membership, NO entitlement gate ── */}
              <Route element={<RequireAuth allowedRoles={["school_admin", "school_recruiter", "school_academic_lead", "school_training_manager"]} />}>
                <Route element={<RequireSchoolMembership />}>
                  <Route element={<AppLayout />}>
                    {schoolStartRoutes}
                  </Route>
                </Route>
              </Route>

              {/* ── School Hiring — hiring roles + membership + entitlement + onboarding ── */}
              <Route element={<RequireAuth allowedRoles={["school_admin", "school_recruiter"]} />}>
                <Route element={<RequireSchoolMembership />}>
                  <Route element={<RequireEntitlement check="canUseHiring" fallback="/app/school/start" />}>
                    <Route element={<RequireOnboardingResolved />}>
                      <Route element={<AppLayout />}>
                        {schoolHiringRoutes}
                      </Route>
                    </Route>
                  </Route>
                </Route>
              </Route>

              {/* ── School Training — training roles + membership + entitlement + onboarding ── */}
              <Route element={<RequireAuth allowedRoles={["school_admin", "school_academic_lead", "school_training_manager"]} />}>
                <Route element={<RequireSchoolMembership />}>
                  <Route element={<RequireEntitlement check="canUseTraining" fallback="/app/school/start" />}>
                    <Route element={<RequireOnboardingResolved />}>
                      <Route element={<AppLayout />}>
                        {schoolTrainingRoutes}
                      </Route>
                    </Route>
                  </Route>
                </Route>
              </Route>

              {/* ── School General — all school roles + membership + onboarding ── */}
              <Route element={<RequireAuth allowedRoles={["school_admin", "school_recruiter", "school_academic_lead", "school_training_manager"]} />}>
                <Route element={<RequireSchoolMembership />}>
                  <Route element={<RequireOnboardingResolved />}>
                    <Route element={<AppLayout />}>
                      {schoolGeneralRoutes}
                    </Route>
                  </Route>
                </Route>
              </Route>

              {/* ── Provider setup — role + membership, no entitlement/onboarding ── */}
              <Route element={<RequireAuth allowedRoles={["provider"]} />}>
                <Route element={<RequireProviderMembership />}>
                  <Route element={<AppLayout />}>
                    {providerSetupRoutes}
                  </Route>
                </Route>
              </Route>

              {/* ── Provider workspace — role + membership + entitlement + onboarding ── */}
              <Route element={<RequireAuth allowedRoles={["provider"]} />}>
                <Route element={<RequireProviderMembership />}>
                  <Route element={<RequireEntitlement check="canUseProviderPortal" fallback="/app/provider/start" />}>
                    <Route element={<RequireOnboardingResolved />}>
                      <Route element={<AppLayout />}>
                        {providerRoutes}
                      </Route>
                    </Route>
                  </Route>
                </Route>
              </Route>

              {/* ── Admin ── */}
              <Route element={<RequireAuth allowedRoles={["admin"]} />}>
                <Route element={<RequireEntitlement check="canUseAdminConsole" />}>
                  <Route element={<AdminLayout />}>
                    {adminRoutes}
                  </Route>
                </Route>
              </Route>

              <Route path="/account/resolve" element={<AccountResolve />} />
              <Route path="/access-denied" element={<AccessDenied />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </LanguageProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
