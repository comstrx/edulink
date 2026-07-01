import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { ClipboardList, BarChart3, Award, CheckCircle } from "lucide-react";
import PublicTrainingSubNav from "@/components/training/PublicTrainingSubNav";

const TrainingForSchools = () => {
  const { user, roles } = useAuth();
  const { t } = useLanguage();
  const isSchool = roles.some((r) => r.startsWith("school_"));

  const STEPS = [
    { icon: ClipboardList, title: t("tfs.step1.title"), text: t("tfs.step1.text") },
    { icon: BarChart3, title: t("tfs.step2.title"), text: t("tfs.step2.text") },
    { icon: Award, title: t("tfs.step3.title"), text: t("tfs.step3.text") },
  ];

  const WHAT_YOU_GET = [t("tfs.get1"), t("tfs.get2"), t("tfs.get3"), t("tfs.get4")];
  const HOW_IT_WORKS = [t("tfs.how1"), t("tfs.how2"), t("tfs.how3")];
  const BENEFITS = [t("tfs.benefit1"), t("tfs.benefit2"), t("tfs.benefit3"), t("tfs.benefit4")];

  return (
    <div className="space-y-16 pb-16">
      <PublicTrainingSubNav />
      <section className="bg-muted/40 border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-16 text-center space-y-5">
          <h1 className="text-4xl font-bold text-foreground leading-tight">{t("tfs.hero.title")}</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">{t("tfs.hero.subtitle")}</p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Button asChild size="lg"><Link to="/training/packages?context=school">{t("tfs.hero.browseCta")}</Link></Button>
            <Button asChild size="lg" variant="outline"><Link to="/pricing">{t("tfs.hero.pricingCta")}</Link></Button>
          </div>
          {user && isSchool && (
            <Button asChild size="sm" variant="ghost" className="mt-2"><Link to="/login">{t("tfs.hero.goToDashboard")}</Link></Button>
          )}
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6">
        <div className="grid md:grid-cols-3 gap-6">
          {STEPS.map((s, i) => (
            <Card key={s.title}>
              <CardContent className="pt-6 text-center space-y-3">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10"><s.icon className="h-6 w-6 text-primary" /></div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Step {i + 1}</p>
                <h3 className="text-lg font-semibold text-foreground">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 space-y-4">
        <h2 className="text-2xl font-bold text-foreground text-center">{t("tfs.whatYouGet")}</h2>
        <ul className="max-w-md mx-auto space-y-2">
          {WHAT_YOU_GET.map((item) => (
            <li key={item} className="flex items-center gap-2 text-sm text-foreground"><CheckCircle className="h-4 w-4 text-primary shrink-0" />{item}</li>
          ))}
        </ul>
      </section>

      <section className="max-w-5xl mx-auto px-6 space-y-6">
        <h2 className="text-2xl font-bold text-foreground text-center">{t("tfs.howItWorks")}</h2>
        <ol className="max-w-lg mx-auto space-y-3">
          {HOW_IT_WORKS.map((step, i) => (
            <li key={step} className="flex items-start gap-3 text-sm text-foreground">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">{i + 1}</span>
              {step}
            </li>
          ))}
        </ol>
        <div className="text-center pt-2">
          <Button asChild size="sm" variant="outline"><Link to="/training/courses?context=school">{t("tfs.openSchoolCatalog")}</Link></Button>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 space-y-4 text-center">
        <h2 className="text-2xl font-bold text-foreground">{t("tfs.libraryTitle")}</h2>
        <p className="text-muted-foreground max-w-xl mx-auto text-sm">{t("tfs.libraryText")}</p>
        <Button asChild size="sm">
          <Link to={user && isSchool ? "/login" : "/signup?role=school"}>{t("tfs.libraryOpen")}</Link>
        </Button>
      </section>

      <section className="bg-muted/40 border-y border-border">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-3">
            {BENEFITS.map((b) => (
              <span key={b} className="flex items-center gap-2 text-sm text-foreground font-medium"><CheckCircle className="h-4 w-4 text-primary shrink-0" />{b}</span>
            ))}
          </div>
        </div>
      </section>

      <p className="text-xs text-muted-foreground text-center pb-4">{t("tfs.dashboardNote")}</p>
    </div>
  );
};

export default TrainingForSchools;
