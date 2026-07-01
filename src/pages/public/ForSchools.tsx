import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, Briefcase, GraduationCap, ArrowRight } from "lucide-react";

const sections = [
  {
    icon: Search,
    titleKey: "forSchools.talent.title",
    descKey: "forSchools.talent.desc",
    cta: "forSchools.talent.cta",
    to: "/talent-search",
  },
  {
    icon: Briefcase,
    titleKey: "forSchools.post.title",
    descKey: "forSchools.post.desc",
    cta: "forSchools.post.cta",
    to: "/hire/post-a-job",
  },
  {
    icon: GraduationCap,
    titleKey: "forSchools.develop.title",
    descKey: "forSchools.develop.desc",
    cta: "forSchools.develop.cta",
    to: "/training/for-schools",
  },
];

const ForSchools = () => {
  const { t } = useLanguage();

  return (
    <div className="max-w-4xl mx-auto py-16 px-6">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-foreground mb-3">{t("forSchools.hero.title")}</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">{t("forSchools.hero.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {sections.map((s) => (
          <Card key={s.titleKey} className="flex flex-col">
            <CardContent className="p-6 flex flex-col flex-1">
              <s.icon className="h-8 w-8 text-primary mb-4" />
              <h2 className="text-lg font-semibold text-foreground mb-2">{t(s.titleKey)}</h2>
              <p className="text-sm text-muted-foreground flex-1 mb-4">{t(s.descKey)}</p>
              <Button asChild variant="outline" size="sm" className="gap-1.5 self-start">
                <Link to={s.to}>
                  {t(s.cta)}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center bg-muted/50 rounded-lg p-8">
        <h2 className="text-xl font-semibold text-foreground mb-2">{t("forSchools.cta.title")}</h2>
        <p className="text-sm text-muted-foreground mb-4">{t("forSchools.cta.desc")}</p>
        <Button asChild>
          <Link to="/signup?role=school">{t("forSchools.cta.btn")}</Link>
        </Button>
      </div>
    </div>
  );
};

export default ForSchools;
