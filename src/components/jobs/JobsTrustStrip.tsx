import { LayoutDashboard, SlidersHorizontal, GraduationCap } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const items = [
  { icon: LayoutDashboard, key: "jobs.trust.dashboards" },
  { icon: SlidersHorizontal, key: "jobs.trust.filters" },
  { icon: GraduationCap, key: "jobs.trust.training" },
] as const;

const JobsTrustStrip = () => {
  const { t } = useLanguage();

  return (
    <div className="border-t bg-muted/30">
      <div className="max-w-6xl mx-auto px-6 py-4 flex flex-wrap justify-center gap-x-10 gap-y-2">
        {items.map(({ icon: Icon, key }) => (
          <span key={key} className="flex items-center gap-2 text-xs text-muted-foreground">
            <Icon className="h-3.5 w-3.5" />
            {t(key)}
          </span>
        ))}
      </div>
    </div>
  );
};

export default JobsTrustStrip;
