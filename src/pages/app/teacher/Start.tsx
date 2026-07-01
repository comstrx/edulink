import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { safeMutation } from "@/lib/safe-mutation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Briefcase, GraduationCap } from "lucide-react";
import OnboardingProgress from "@/components/onboarding/OnboardingProgress";

const TeacherStart = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);

  const handleChoice = async (choice: "jobs" | "training") => {
    if (!user || saving) return;
    setSaving(true);

    const { success } = await safeMutation(
      () =>
        supabase
          .from("teacher_profiles")
          .upsert(
            { user_id: user.id, preferred_start: choice },
            { onConflict: "user_id" }
          ),
      { errorMessage: "Failed to save your preference. Please try again." }
    );

    if (!success) {
      setSaving(false);
      return;
    }

    // Invalidate readiness so the onboarding guard sees the updated preferred_start
    await qc.invalidateQueries({ queryKey: ["teacher_readiness"] });
    navigate(choice === "jobs" ? "/jobs" : "/app/teacher/training", { replace: true });
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-2xl space-y-8 text-center">
        <OnboardingProgress
          steps={[
            { label: "Account", completed: true, active: false },
            { label: "Get Started", completed: false, active: true },
          ]}
          className="mb-2"
        />
        <div>
          <h1 className="text-3xl font-bold text-foreground">Where would you like to start?</h1>
          <p className="mt-2 text-muted-foreground">Choose your default landing area after login.</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <Card
            className="cursor-pointer transition-shadow hover:shadow-lg"
            onClick={() => handleChoice("jobs")}
          >
            <CardHeader className="items-center">
              <Briefcase className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Find Jobs</CardTitle>
              <CardDescription>Browse teaching opportunities locally and internationally.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" disabled={saving}>Find Jobs</Button>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer transition-shadow hover:shadow-lg"
            onClick={() => handleChoice("training")}
          >
            <CardHeader className="items-center">
              <GraduationCap className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Develop My Skills</CardTitle>
              <CardDescription>Upgrade your skills and earn certifications.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" disabled={saving}>Develop My Skills</Button>
            </CardContent>
          </Card>
        </div>

        <p className="text-xs text-muted-foreground">You can change this later in your profile.</p>
      </div>
    </div>
  );
};

export default TeacherStart;
