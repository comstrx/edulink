import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { useMentorOnboardingStatus } from "@/hooks/useMentorOnboardingStatus";
import { fetchMentorProfile, updateMentor } from "@/lib/supabase-typed-queries";
import { submitForm } from "@/lib/form-submission";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle, Clock, XCircle, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { mentorProfileSchema } from "@/lib/validation-schemas";

export default function MentorOnboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { mentorId, mentorStatus, readiness, isLoading } = useMentorOnboardingStatus();

  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load current mentor data
  useEffect(() => {
    if (!mentorId || loaded) return;
    (async () => {
      const data = await fetchMentorProfile(mentorId);
      if (data) {
        setHeadline(data.headline || "");
        setBio(data.bio || "");
        setYearsExperience(data.years_experience?.toString() || "");
      }
      setLoaded(true);
    })();
  }, [mentorId, loaded]);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!mentorId) {
    navigate("/app/mentor/start", { replace: true });
    return null;
  }

  // Status messages for non-draft states
  if (mentorStatus === "pending_review") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 space-y-6">
        <Alert className="border-warning">
          <Clock className="h-4 w-4" />
          <AlertTitle>Application Under Review</AlertTitle>
          <AlertDescription>
            Your mentor application has been submitted and is being reviewed. You'll be notified once a decision is made.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (mentorStatus === "rejected") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 space-y-6">
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Application Not Approved</AlertTitle>
          <AlertDescription>
            Your mentor application was not approved at this time. You may update your profile and reapply.
          </AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => handleReapply()}>
          Update & Reapply
        </Button>
      </div>
    );
  }

  if (mentorStatus === "paused") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 space-y-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Mentor Profile Paused</AlertTitle>
          <AlertDescription>
            Your mentor profile is currently paused. You are not visible in the directory and cannot accept new sessions.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (mentorStatus === "suspended") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 space-y-6">
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Mentor Profile Suspended</AlertTitle>
          <AlertDescription>
            Your mentor profile has been suspended. Please contact support for more information.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const handleReapply = async () => {
    try {
      await updateMentor(mentorId, { status: "draft", onboarding_current_step: "profile" });
      await qc.invalidateQueries({ queryKey: ["mentor_onboarding_status"] });
    } catch {
      toast.error("Failed to reapply. Please try again.");
    }
  };

  const formData = () => ({
    headline: headline.trim(),
    bio: bio.trim(),
    years_experience: yearsExperience ? parseInt(yearsExperience, 10) : 0,
  });

  const handleSave = async () => {
    setSaving(true);
    await submitForm({
      schema: mentorProfileSchema,
      data: formData(),
      mutation: async (parsed) => {
        await updateMentor(mentorId, {
          headline: parsed.headline,
          bio: parsed.bio,
          years_experience: parsed.years_experience,
        });
      },
      successMessage: "Progress saved",
      queryClient: qc,
      invalidateKeys: [["mentor_onboarding_status"]],
    });
    setSaving(false);
  };

  const handleSubmitForReview = async () => {
    if (!readiness.isComplete) {
      toast.error("Please complete all required fields before submitting.");
      return;
    }
    setSubmitting(true);
    const ok = await submitForm({
      schema: mentorProfileSchema,
      data: formData(),
      mutation: async (parsed) => {
        await updateMentor(mentorId, {
          headline: parsed.headline,
          bio: parsed.bio,
          years_experience: parsed.years_experience,
          status: "pending_review",
          onboarding_completed_at: new Date().toISOString(),
          onboarding_current_step: "complete",
        });
      },
      successMessage: "Application submitted for review!",
      queryClient: qc,
      invalidateKeys: [["mentor_onboarding_status"], ["shell_mentor_status"]],
    });
    setSubmitting(false);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Complete Your Mentor Profile</h1>
        <p className="text-muted-foreground">
          Fill in the required information to apply as a mentor on EduLink.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Profile Completeness</span>
          <span className="font-medium text-foreground">{readiness.completionPercent}%</span>
        </div>
        <Progress value={readiness.completionPercent} className="h-2" />
        {readiness.missingFields.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {readiness.missingFields.map((f) => (
              <Badge key={f} variant="outline" className="text-xs capitalize">
                {f.replace(/_/g, " ")}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Profile Information</CardTitle>
          <CardDescription>This information will be visible in the mentor directory.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="headline">Professional Headline *</Label>
            <Input
              id="headline"
              placeholder="e.g. Senior Math Teacher & Curriculum Specialist"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio *</Label>
            <Textarea
              id="bio"
              placeholder="Describe your teaching background, areas of expertise, and what you can offer as a mentor (min. 20 characters)..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="experience">Years of Teaching Experience *</Label>
            <Input
              id="experience"
              type="number"
              min="0"
              max="60"
              value={yearsExperience}
              onChange={(e) => setYearsExperience(e.target.value)}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            * Specializations and languages are managed from your mentor profile settings once approved.
          </p>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3 justify-end">
        <Button variant="outline" onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Progress
        </Button>
        <Button onClick={handleSubmitForReview} disabled={submitting || !readiness.isComplete}>
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {readiness.isComplete ? "Submit for Review" : "Complete Required Fields"}
        </Button>
      </div>
    </div>
  );
}
