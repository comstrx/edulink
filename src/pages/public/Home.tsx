import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Building2, CheckCircle, ArrowRight, LayoutDashboard, Search, BookOpen } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const Home = () => {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col">
      {/* ─── HERO ─── */}
      <section className="py-20 px-6 text-center space-y-6 max-w-3xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground leading-tight">
          {t("home.hero.title")}
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          {t("home.hero.subtitle")}
        </p>
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <Button asChild size="lg">
            <Link to="/signup">{t("home.hero.getStarted")}</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/pricing">{t("home.hero.viewPricing")}</Link>
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          {t("home.hero.browseNote")}
        </p>
      </section>

      {/* ─── CHOOSE YOUR PATH ─── */}
      <section className="py-16 px-6 bg-muted/50">
        <div className="max-w-4xl mx-auto text-center mb-10">
          <h2 className="text-2xl font-bold text-foreground">{t("home.path.title")}</h2>
          <p className="text-muted-foreground mt-2">{t("home.path.subtitle")}</p>
        </div>
        <div className="max-w-4xl mx-auto grid gap-6 md:grid-cols-2">
          {/* Teacher Card */}
          <Card className="transition-shadow hover:shadow-md">
            <CardHeader>
              <div className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-primary" />
                <CardTitle className="text-xl">{t("home.path.teacher.title")}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  {t("home.path.teacher.point1")}
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  {t("home.path.teacher.point2")}
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  {t("home.path.teacher.point3")}
                </li>
              </ul>
              <div className="flex flex-col gap-2">
                <Button asChild>
                  <Link to="/for-teachers">
                    {t("home.path.teacher.cta")}
                    <ArrowRight className="h-4 w-4 ms-1" />
                  </Link>
                </Button>
                <Button asChild variant="link" className="px-0 text-xs">
                  <Link to="/jobs">{t("home.path.teacher.secondary")}</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* School Card */}
          <Card className="transition-shadow hover:shadow-md">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <CardTitle className="text-xl">{t("home.path.school.title")}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  {t("home.path.school.point1")}
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  {t("home.path.school.point2")}
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  {t("home.path.school.point3")}
                </li>
              </ul>
              <div className="flex flex-col gap-2">
                <Button asChild>
                  <Link to="/for-schools">
                    {t("home.path.school.cta")}
                    <ArrowRight className="h-4 w-4 ms-1" />
                  </Link>
                </Button>
                <Button asChild variant="link" className="px-0 text-xs">
                  <Link to="/hire">{t("home.path.school.secondary")}</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ─── WHY EDULINK IS DIFFERENT ─── */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto text-center mb-10">
          <h2 className="text-2xl font-bold text-foreground">{t("home.why.title")}</h2>
        </div>
        <div className="max-w-4xl mx-auto grid gap-8 md:grid-cols-3">
          <div className="text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <LayoutDashboard className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">{t("home.why.dashboards")}</h3>
            <p className="text-sm text-muted-foreground">{t("home.why.dashboardsDesc")}</p>
          </div>
          <div className="text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Search className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">{t("home.why.taxonomy")}</h3>
            <p className="text-sm text-muted-foreground">{t("home.why.taxonomyDesc")}</p>
          </div>
          <div className="text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">{t("home.why.training")}</h3>
            <p className="text-sm text-muted-foreground">{t("home.why.trainingDesc")}</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
