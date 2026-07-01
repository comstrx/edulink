import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Briefcase, Users, BarChart3, CheckCircle, ArrowLeft } from "lucide-react";

const PostAJob = () => {
  const { t } = useLanguage();

  return (
    <div className="max-w-4xl mx-auto py-16 px-6">
      <Button asChild variant="ghost" size="sm" className="mb-6">
        <Link to="/hire">
          <ArrowLeft className="h-4 w-4 me-2" />
          {t("postJob.backToHire")}
        </Link>
      </Button>

      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-foreground mb-3">{t("postJob.hero.title")}</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">{t("postJob.hero.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {[
          { icon: Briefcase, titleKey: "postJob.step1.title", descKey: "postJob.step1.desc" },
          { icon: Users, titleKey: "postJob.step2.title", descKey: "postJob.step2.desc" },
          { icon: BarChart3, titleKey: "postJob.step3.title", descKey: "postJob.step3.desc" },
        ].map((s) => (
          <Card key={s.titleKey}>
            <CardContent className="p-6 text-center">
              <s.icon className="h-8 w-8 text-primary mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-foreground mb-2">{t(s.titleKey)}</h2>
              <p className="text-sm text-muted-foreground">{t(s.descKey)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mb-12">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">{t("postJob.features.title")}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {["postJob.feat1", "postJob.feat2", "postJob.feat3", "postJob.feat4"].map((key) => (
              <div key={key} className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground">{t(key)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="text-center bg-muted/50 rounded-lg p-8">
        <h2 className="text-xl font-semibold text-foreground mb-2">{t("postJob.cta.title")}</h2>
        <p className="text-sm text-muted-foreground mb-4">{t("postJob.cta.desc")}</p>
        <Button asChild>
          <Link to="/signup?role=school">{t("postJob.cta.btn")}</Link>
        </Button>
      </div>
    </div>
  );
};

export default PostAJob;
