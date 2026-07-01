import { useState } from "react";
import { useProviderOnboardingStatus } from "@/hooks/useProviderOnboardingStatus";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Building2, BookOpen, Users, ShieldCheck, AlertTriangle, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { VisibilityTrustStatusCard } from "@/components/setup/VisibilityTrustStatusCard";
import { toast } from "sonner";

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock; description: string }> = {
  draft: {
    label: "Draft",
    color: "bg-muted text-muted-foreground",
    icon: Clock,
    description: "Your provider profile is in draft. Complete the required fields and submit for review.",
  },
  pending_review: {
    label: "Under Review",
    color: "bg-yellow-100 text-yellow-800",
    icon: Clock,
    description: "Your provider application is being reviewed by the platform team. We'll notify you once a decision is made.",
  },
  rejected: {
    label: "Rejected",
    color: "bg-destructive/10 text-destructive",
    icon: XCircle,
    description: "Your provider application was not approved. Please review the feedback and update your profile to reapply.",
  },
  suspended: {
    label: "Suspended",
    color: "bg-orange-100 text-orange-800",
    icon: AlertTriangle,
    description: "Your provider account has been suspended. Contact support for more information.",
  },
  inactive: {
    label: "Inactive",
    color: "bg-muted text-muted-foreground",
    icon: AlertTriangle,
    description: "Your provider account is currently inactive.",
  },
  active: {
    label: "Active",
    color: "bg-green-100 text-green-800",
    icon: CheckCircle2,
    description: "Your provider is active. You can access the full workspace.",
  },
};

const benefits = [
  {
    icon: BookOpen,
    title: "Publish Training Content",
    description: "Create courses, packages, and resources for the education marketplace.",
  },
  {
    icon: Users,
    title: "Manage Your Team",
    description: "Invite team members with specific roles to collaborate on content.",
  },
  {
    icon: ShieldCheck,
    title: "Platform Verified",
    description: "Earn verification and build trust with schools and educators.",
  },
  {
    icon: Building2,
    title: "Organization Dashboard",
    description: "Track catalog performance, reviews, and team activity.",
  },
];

export default function ProviderStart() {
  const { providerId, providerStatus, readiness, memberRole } = useProviderOnboardingStatus();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [submitting, setSubmitting] = useState(false);

  const config = statusConfig[providerStatus] || statusConfig.draft;
  const StatusIcon = config.icon;

  const showSetupChecklist = providerStatus === "draft" || providerStatus === "rejected";
  const canSubmit = providerStatus === "draft" && readiness.isComplete && ["owner", "admin"].includes(memberRole ?? "");

  const handleSubmitForReview = async () => {
    if (!providerId || !canSubmit) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("providers")
        .update({ status: "pending_review" })
        .eq("id", providerId);
      if (error) throw error;
      toast.success("Provider submitted for review!");
      await qc.invalidateQueries({ queryKey: ["provider_membership"] });
      await qc.invalidateQueries({ queryKey: ["shell_provider_membership"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to submit for review");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-8">
      <div className="text-center space-y-3">
        <Badge variant="secondary" className="text-sm">Provider Workspace</Badge>
        <h1 className="text-3xl font-bold text-foreground">Provider Setup</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Complete your organization profile to access the full provider workspace.
        </p>
      </div>

      {/* Status banner */}
      <Card className="border-border">
        <CardContent className="pt-6 flex items-start gap-4">
          <div className="shrink-0 h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <StatusIcon className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-foreground">Status</h3>
              <Badge className={config.color}>{config.label}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{config.description}</p>
          </div>
        </CardContent>
      </Card>

      {/* Readiness checklist for draft/rejected */}
      {showSetupChecklist && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Setup Progress</CardTitle>
            <CardDescription>
              Complete these items to submit your provider for review.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={readiness.completionPercent} className="h-2" />
            <p className="text-sm text-muted-foreground">
              {readiness.completionPercent}% complete
            </p>
            <ul className="space-y-2">
              {["display_name", "legal_name", "bio", "contact_email", "logo_url"].map((field) => {
                const missing = readiness.missingFields.includes(field);
                return (
                  <li key={field} className="flex items-center gap-2 text-sm">
                    {missing ? (
                      <XCircle className="h-4 w-4 text-destructive" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    )}
                    <span className={missing ? "text-muted-foreground" : "text-foreground"}>
                      {field.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    </span>
                  </li>
                );
              })}
            </ul>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => navigate("/app/provider/organization")}>
                Edit Organization Profile
              </Button>
              {canSubmit && (
                <Button onClick={handleSubmitForReview} disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submit for Review
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Visibility & Trust status */}
      <VisibilityTrustStatusCard persona="provider" />

      {/* Active provider redirect */}
      {providerStatus === "active" && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6 text-center space-y-3">
            <CheckCircle2 className="h-8 w-8 text-primary mx-auto" />
            <p className="font-semibold text-foreground">Your provider is active!</p>
            <Button onClick={() => navigate("/app/provider/dashboard")}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Benefits — shown for pending/draft */}
      {(providerStatus === "draft" || providerStatus === "pending_review") && (
        <div className="grid sm:grid-cols-2 gap-4">
          {benefits.map((b) => (
            <Card key={b.title} className="border-border">
              <CardContent className="pt-6 flex gap-4">
                <div className="shrink-0 h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <b.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{b.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{b.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
