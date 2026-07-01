import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";

const JobAlertCTA = () => {
  const { t } = useLanguage();

  return (
    <Card className="border-dashed">
      <CardContent className="p-4 flex items-center gap-4">
        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Bell className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">{t("jobs.alert.title")}</p>
          <p className="text-xs text-muted-foreground">{t("jobs.alert.desc")}</p>
        </div>
        <Button size="sm" variant="outline" className="shrink-0 whitespace-nowrap">
          {t("jobs.alert.cta")}
        </Button>
      </CardContent>
    </Card>
  );
};

export default JobAlertCTA;
