import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSchoolPlan } from "@/hooks/useSchoolPlan";
import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Lock, ShieldCheck, ArrowRight } from "lucide-react";

type AppRole = "teacher" | "school_admin" | "school_recruiter" | "school_academic_lead" | "admin";

const PlanStatusBanner = () => {
  const { user, roles } = useAuth();
  const { isPro, isSchool } = useSchoolPlan();
  const { t } = useLanguage();
  const isGuest = !user;

  if (isGuest) {
    return (
      <div className="px-3 py-1.5 rounded-md border border-border/60 bg-muted/30 flex flex-wrap items-center gap-3 text-xs mb-3">
        <Eye className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-muted-foreground flex-1">{t("tsearch.bannerVisitor")}</span>
        <Button asChild size="sm">
          <Link to="/signup?role=school">{t("talent.createSchool")}</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link to="/login?intent=talent_search">{t("talent.loginAsSchool")}</Link>
        </Button>
      </div>
    );
  }

  if (isSchool && !isPro) {
    return (
      <div className="px-3 py-1.5 rounded-md border border-primary/20 bg-primary/5 flex flex-wrap items-center gap-3 text-xs mb-3">
        <Lock className="h-4 w-4 text-primary shrink-0" />
        <span className="text-foreground flex-1">
          <Badge variant="secondary" className="mr-2">{t("tsearch.planFree")}</Badge>
          {t("tsearch.bannerFree")}
        </span>
        <Button asChild size="sm">
          <Link to="/pricing">
            {t("talent.upgradeCta")}
            <ArrowRight className="h-3.5 w-3.5 ms-1" />
          </Link>
        </Button>
      </div>
    );
  }

  if (isSchool && isPro) {
    return (
      <div className="px-3 py-1.5 rounded-md border border-primary/20 bg-primary/5 flex items-center gap-3 text-xs mb-3">
        <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
        <span className="text-foreground">
          <Badge variant="default" className="mr-2">{t("tsearch.planPro")}</Badge>
          {t("tsearch.bannerPro")}
        </span>
      </div>
    );
  }

  return null;
};

export default PlanStatusBanner;
