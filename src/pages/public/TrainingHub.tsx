import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GraduationCap, Package, Route, User, School, Link2, Layers, TrendingUp, CheckCircle } from "lucide-react";
import { useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import PublicTrainingSubNav from "@/components/training/PublicTrainingSubNav";

const TrainingHub = () => {
  const productsRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();

  const scrollToProducts = () => {
    productsRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const PRODUCTS = [
    { icon: GraduationCap, title: t("training.courses.title"), description: t("training.courses.desc"), highlights: [t("training.courses.h1"), t("training.courses.h2"), t("training.courses.h3")], cta: t("training.courses.cta"), href: "/training/courses" },
    { icon: Package, title: t("training.packages.title"), description: t("training.packages.desc"), highlights: [t("training.packages.h1"), t("training.packages.h2"), t("training.packages.h3")], cta: t("training.packages.cta"), href: "/training/packages" },
    { icon: Route, title: t("training.pathways.title"), description: t("training.pathways.desc"), highlights: [t("training.pathways.h1"), t("training.pathways.h2"), t("training.pathways.h3")], cta: t("training.pathways.cta"), href: "/training/pathways" },
  ];

  const PILLARS = [
    { icon: Link2, text: t("training.pillar1") },
    { icon: Layers, text: t("training.pillar2") },
    { icon: TrendingUp, text: t("training.pillar3") },
  ];

  return (
    <div className="space-y-16 pb-16">
      <PublicTrainingSubNav />
      <section className="bg-muted/40 border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-16 text-center space-y-5">
          <h1 className="text-4xl font-bold text-foreground leading-tight">{t("training.hero.title")}</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">{t("training.hero.subtitle")}</p>
          <div className="flex justify-center gap-3 pt-2">
            <Button size="lg" onClick={scrollToProducts}>{t("training.hero.browseAll")}</Button>
            <Button asChild size="lg" variant="outline"><Link to="/training/for-schools">{t("training.hero.forSchools")}</Link></Button>
          </div>
        </div>
      </section>

      <section ref={productsRef} className="max-w-5xl mx-auto px-6 space-y-6">
        <h2 className="text-2xl font-bold text-foreground text-center">{t("training.chooseLearningFormat")}</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {PRODUCTS.map((p) => (
            <Card key={p.href} className="flex flex-col">
              <CardHeader>
                <p.icon className="h-7 w-7 text-primary mb-2" />
                <CardTitle className="text-xl">{p.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col space-y-4">
                <p className="text-sm text-muted-foreground">{p.description}</p>
                <ul className="space-y-1.5 flex-1">
                  {p.highlights.map((h) => (
                    <li key={h} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />{h}
                    </li>
                  ))}
                </ul>
                <Button asChild className="w-full"><Link to={p.href}>{p.cta}</Link></Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 space-y-6">
        <h2 className="text-2xl font-bold text-foreground text-center">{t("training.forIndividualsAndInstitutions")}</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">{t("training.forTeachers")}</h3>
              </div>
              <ul className="space-y-1.5">
                {[t("training.teacher1"), t("training.teacher2"), t("training.teacher3")].map((txt) => (
                  <li key={txt} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />{txt}
                  </li>
                ))}
              </ul>
              <Button asChild variant="outline" className="w-full"><Link to="/training/courses">{t("training.startLearning")}</Link></Button>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-2">
                <School className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">{t("training.forSchools")}</h3>
              </div>
              <ul className="space-y-1.5">
                {[t("training.school1"), t("training.school2"), t("training.school3")].map((txt) => (
                  <li key={txt} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />{txt}
                  </li>
                ))}
              </ul>
              <Button asChild variant="outline" className="w-full"><Link to="/training/for-schools">{t("training.exploreSchoolPlans")}</Link></Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="bg-muted/40 border-y border-border">
        <div className="max-w-5xl mx-auto px-6 py-10 space-y-5 text-center">
          <h2 className="text-2xl font-bold text-foreground">{t("training.whatMakesDifferent")}</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {PILLARS.map((p) => (
              <div key={p.text} className="flex flex-col items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <p.icon className="h-5 w-5 text-primary" />
                </div>
                <p className="text-sm font-medium text-foreground">{p.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default TrainingHub;
