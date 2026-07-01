import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { UserCircle, Sparkles, Briefcase, Target } from "lucide-react";

const steps = [
  { icon: UserCircle, label: "Complete your profile", desc: "Add your experience, qualifications, and preferences" },
  { icon: Target, label: "Add your skills", desc: "Skills power matching, gap analysis, and job recommendations", link: "/app/teacher/profile" },
  { icon: Briefcase, label: "Explore opportunities", desc: "Browse jobs that match your background" },
];

const DashboardEmptyState = () => (
  <section className="rounded-xl border border-border bg-gradient-to-br from-primary/[0.06] to-transparent p-6 sm:p-8 space-y-6">
    <div>
      <h2 className="text-lg font-bold text-foreground">Let's get you started</h2>
      <p className="text-sm text-muted-foreground mt-1">
        Complete a few steps to unlock your career insights
      </p>
    </div>

    <ol className="space-y-3">
      {steps.map((step, i) => (
        <li key={i} className="flex items-start gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {i + 1}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">{step.label}</p>
            <p className="text-xs text-muted-foreground">{step.desc}</p>
          </div>
        </li>
      ))}
    </ol>

    <div className="flex flex-wrap gap-3 pt-2">
      <Button asChild>
        <Link to="/app/teacher/profile">Complete your profile</Link>
      </Button>
      <Button variant="outline" asChild>
        <Link to="/jobs">Browse jobs</Link>
      </Button>
    </div>
  </section>
);

export default DashboardEmptyState;
