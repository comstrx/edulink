import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSchoolOnboardingStatus } from "@/hooks/useSchoolOnboardingStatus";
import { useCurrentSchoolWorkspace } from "@/hooks/useCurrentSchoolWorkspace";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import TaxonomySingleSelect from "@/components/taxonomy/TaxonomySingleSelect";
import TaxonomyMultiSelect from "@/components/taxonomy/TaxonomyMultiSelect";
import { toast } from "sonner";
import { Search, GraduationCap, AlertCircle, CheckCircle2 } from "lucide-react";
import OnboardingProgress from "@/components/onboarding/OnboardingProgress";

const SchoolStart = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();
  const { isCompleted, isLoading: statusLoading } = useSchoolOnboardingStatus();
  const { workspace } = useCurrentSchoolWorkspace();

  const [loading, setLoading] = useState(false);

  // Onboarding form state — pre-filled from workspace draft if available
  const [schoolName, setSchoolName] = useState("");
  const [countryTermId, setCountryTermId] = useState("");
  const [schoolTypeTermId, setSchoolTypeTermId] = useState("");
  const [curriculumTermIds, setCurriculumTermIds] = useState<string[]>([]);
  const [prefilled, setPrefilled] = useState(false);

  // Pre-fill from existing draft organization (created by bootstrap)
  const { profile: orgProfile } = useSchoolOnboardingStatus();

  useEffect(() => {
    if (prefilled) return;
    if (!workspace && !orgProfile) return;

    const name = workspace?.schoolName ?? (orgProfile as any)?.name;
    if (name && name !== "My School") setSchoolName(name);

    const country = (orgProfile as any)?.country_term_id;
    if (country) setCountryTermId(country);

    const schoolType = (orgProfile as any)?.school_type_term_id;
    if (schoolType) setSchoolTypeTermId(schoolType);

    const curricula = (orgProfile as any)?.curriculum_term_ids;
    if (curricula?.length) setCurriculumTermIds(curricula);

    setPrefilled(true);
  }, [workspace, orgProfile, prefilled]);

  const showOnboardingMessage = location.state?.reason === "onboarding";

  const canSubmitProfile =
    schoolName.trim() !== "" &&
    countryTermId !== "" &&
    schoolTypeTermId !== "" &&
    curriculumTermIds.length > 0;

  const handleCompleteProfile = async () => {
    if (!user || !canSubmitProfile) return;
    setLoading(true);

    // Update the school_organization if workspace exists
    if (workspace) {
      const { error } = await supabase
        .from("school_organizations")
        .update({
          name: schoolName.trim(),
          country_term_id: countryTermId,
          school_type_term_id: schoolTypeTermId,
          curriculum_term_ids: curriculumTermIds,
          onboarding_completed: true,
        })
        .eq("id", workspace.schoolId);

      // Legacy school_profiles sync is no longer needed — 
      // all runtime flows now use school_organizations

      setLoading(false);
      if (error) {
        toast.error(error.message || "Failed to save profile");
        return;
      }
    } else {
      // No workspace — should not happen for new schools, but handle gracefully
      setLoading(false);
      toast.error("No school workspace found. Please try signing in again.");
      return;
    }

    // Invalidate all school-related caches including entitlements
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["school_onboarding_status"] }),
      qc.invalidateQueries({ queryKey: ["school_onboarding"] }),
      qc.invalidateQueries({ queryKey: ["school_onboarding_org"] }),
      qc.invalidateQueries({ queryKey: ["school_memberships"] }),
      qc.invalidateQueries({ queryKey: ["shell_school_membership"] }),
      qc.invalidateQueries({ queryKey: ["my_school_profile"] }),
      qc.invalidateQueries({ queryKey: ["org_entitlements"] }),
    ]);

    toast.success("Your school is ready — hiring and training are now active.");

    const returnTo = location.state?.returnTo;
    const destination = typeof returnTo === "string" && returnTo.startsWith("/app/school/")
      ? returnTo
      : "/app/school/dashboard";
    navigate(destination, { replace: true });
  };

  const handleChoice = async (choice: "hiring" | "training") => {
    if (!user) return;
    setLoading(true);

    // Update preferred_start on legacy school_profiles (still used for redirect)
    await supabase
      .from("school_profiles")
      .upsert(
        { user_id: user.id, preferred_start: choice },
        { onConflict: "user_id" }
      );

    const target =
      choice === "hiring"
        ? "/app/school/hiring/jobs"
        : "/app/school/training/catalog";
    navigate(target, { replace: true });
  };

  if (statusLoading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-8">
        <OnboardingProgress
          steps={[
            { label: "Account", completed: true, active: false },
            { label: "School Profile", completed: isCompleted, active: !isCompleted },
            { label: "Get Started", completed: false, active: isCompleted },
          ]}
          className="mb-2"
        />

        {showOnboardingMessage && (
          <Alert variant="destructive" className="text-left">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Complete your school profile to activate hiring features.
            </AlertDescription>
          </Alert>
        )}

        {!isCompleted && (
          <Card>
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-xl">Set up your school profile</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Fill in the basics to unlock hiring and talent search features.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>School Name *</Label>
                <Input
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder="e.g. Cairo International Academy"
                />
              </div>

              <TaxonomySingleSelect
                domainKey="countries"
                value={countryTermId}
                onChange={setCountryTermId}
                label="Country *"
                placeholder="Select country"
              />

              <TaxonomySingleSelect
                domainKey="school_types"
                value={schoolTypeTermId}
                onChange={setSchoolTypeTermId}
                label="School Type *"
                placeholder="Select school type"
              />

              <TaxonomyMultiSelect
                domainKey="curriculums"
                values={curriculumTermIds}
                onChange={setCurriculumTermIds}
                label="Curricula Offered *"
              />

              <Button
                className="w-full gap-1.5 mt-2"
                onClick={handleCompleteProfile}
                disabled={!canSubmitProfile || loading}
              >
                <CheckCircle2 className="h-4 w-4" />
                {loading ? "Saving..." : "Complete Profile & Start"}
              </Button>
            </CardContent>
          </Card>
        )}

        {isCompleted && (
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-bold text-foreground">
              Where would you like to start?
            </h1>

            <div className="grid gap-4 sm:grid-cols-2">
              <Card
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => !loading && handleChoice("hiring")}
              >
                <CardContent className="flex flex-col items-center gap-3 p-6">
                  <Search className="h-10 w-10 text-primary" />
                  <span className="text-lg font-semibold text-foreground">Hiring</span>
                  <span className="text-sm text-muted-foreground">Search Teachers</span>
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => !loading && handleChoice("training")}
              >
                <CardContent className="flex flex-col items-center gap-3 p-6">
                  <GraduationCap className="h-10 w-10 text-primary" />
                  <span className="text-lg font-semibold text-foreground">Training</span>
                  <span className="text-sm text-muted-foreground">Develop Your Team</span>
                </CardContent>
              </Card>
            </div>

            <p className="text-xs text-muted-foreground">
              You can change this later in Settings.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SchoolStart;
