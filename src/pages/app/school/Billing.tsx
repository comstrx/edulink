import { useCurrentSchoolWorkspace } from "@/hooks/useCurrentSchoolWorkspace";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CreditCard, CheckCircle, Users, Briefcase, BookOpen, Building } from "lucide-react";
import { useEffectiveEntitlements } from "@/hooks/useEffectiveEntitlements";

const PLAN_FEATURES: Record<string, { label: string; features: string[] }> = {
  free: {
    label: "Free",
    features: [
      "Up to 2 active job listings",
      "Basic applicant tracking",
      "Team progress overview",
      "Community training catalog",
    ],
  },
  pro: {
    label: "Pro",
    features: [
      "Unlimited job listings",
      "Full talent search & contact reveal",
      "Advanced hiring pipeline",
      "Training assignments & compliance",
      "Workforce intelligence",
      "Priority support",
    ],
  },
  enterprise: {
    label: "Enterprise",
    features: [
      "Everything in Pro",
      "Custom integrations",
      "Dedicated account manager",
      "Advanced analytics & reporting",
      "SSO & advanced security",
    ],
  },
};

const Billing = () => {
  const { workspace } = useCurrentSchoolWorkspace();
  const { canUseHiring, canUseTraining } = useEffectiveEntitlements();

  const { data: org, isLoading } = useQuery({
    queryKey: ["school_org_billing", workspace?.schoolId],
    queryFn: async () => {
      if (!workspace?.schoolId) return null;
      const { data, error } = await supabase
        .from("school_organizations")
        .select("id, name, plan, status, created_at")
        .eq("id", workspace.schoolId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!workspace?.schoolId,
  });

  const { data: memberCount } = useQuery({
    queryKey: ["school_member_count", workspace?.schoolId],
    queryFn: async () => {
      if (!workspace?.schoolId) return 0;
      const { count, error } = await supabase
        .from("school_members")
        .select("id", { count: "exact", head: true })
        .eq("school_id", workspace.schoolId)
        .eq("status", "active");
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!workspace?.schoolId,
  });

  const currentPlan = org?.plan ?? "free";
  const planInfo = PLAN_FEATURES[currentPlan] ?? PLAN_FEATURES.free;

  if (isLoading) {
    return (
      <div className="p-6 max-w-3xl space-y-4">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-48 bg-muted/50 rounded-lg animate-pulse" />
        <div className="h-32 bg-muted/50 rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-primary" />
          Billing & Plan
        </h1>
        <p className="text-muted-foreground">
          {workspace?.schoolName ?? "School"} — Subscription & usage
        </p>
      </div>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Current Plan</CardTitle>
              <CardDescription>Your active subscription</CardDescription>
            </div>
            <Badge
              variant={currentPlan === "free" ? "secondary" : "default"}
              className="text-sm px-3 py-1"
            >
              {planInfo.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <UsageStat
              icon={Users}
              label="Team Members"
              value={String(memberCount ?? 0)}
            />
            <UsageStat
              icon={Briefcase}
              label="Hiring"
              value={canUseHiring ? "Active" : "Inactive"}
              active={canUseHiring}
            />
            <UsageStat
              icon={BookOpen}
              label="Training"
              value={canUseTraining ? "Active" : "Inactive"}
              active={canUseTraining}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Plan Features</p>
            <ul className="space-y-1.5">
              {planInfo.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {currentPlan === "free" && (
            <div className="pt-2">
              <Button size="sm" className="gap-1.5">
                <Building className="h-4 w-4" />
                Upgrade to Pro
              </Button>
              <p className="text-xs text-muted-foreground mt-1.5">
                Unlock full hiring & training capabilities
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Organization</span>
            <span className="font-medium text-foreground">{org?.name ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status</span>
            <Badge variant="outline" className="capitalize">{org?.status ?? "—"}</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Member Since</span>
            <span className="text-foreground">
              {org?.created_at
                ? new Date(org.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long" })
                : "—"}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

function UsageStat({
  icon: Icon,
  label,
  value,
  active,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  active?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border/50 p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className={`text-lg font-bold ${active === false ? "text-muted-foreground" : "text-foreground"}`}>
        {value}
      </p>
    </div>
  );
}

export default Billing;
