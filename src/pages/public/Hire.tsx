import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Briefcase,
  GraduationCap,
  ArrowRight,
  ClipboardList,
  Users,
  CalendarCheck,
  BookOpen,
  Globe,
  School,
  Layers,
  TrendingUp,
} from "lucide-react";

const trustItems = [
  { icon: Users, key: "hire.trust.teachers" },
  { icon: School, key: "hire.trust.schools" },
  { icon: Layers, key: "hire.trust.curriculum" },
  { icon: TrendingUp, key: "hire.trust.training" },
];

const features = [
  {
    icon: Search,
    titleKey: "hire.feat.search.title",
    descKey: "hire.feat.search.desc",
    cta: "hire.feat.search.cta",
    to: "/talent-search",
  },
  {
    icon: Briefcase,
    titleKey: "hire.feat.manage.title",
    descKey: "hire.feat.manage.desc",
    cta: "hire.feat.manage.cta",
    to: "/hire/post-a-job",
  },
  {
    icon: GraduationCap,
    titleKey: "hire.feat.train.title",
    descKey: "hire.feat.train.desc",
    cta: "hire.feat.train.cta",
    to: "/training/for-schools",
  },
];

const steps = [
  { icon: ClipboardList, key: "hire.step.post", descKey: "hire.step.post.desc" },
  { icon: Users, key: "hire.step.review", descKey: "hire.step.review.desc" },
  { icon: CalendarCheck, key: "hire.step.interview", descKey: "hire.step.interview.desc" },
  { icon: BookOpen, key: "hire.step.train", descKey: "hire.step.train.desc" },
];

const curriculumTags = [
  "American Curriculum",
  "British Curriculum",
  "IB",
  "International Schools",
  "ESL",
];

const Hire = () => {
  const { t } = useLanguage();

  return (
    <div className="w-full">
      {/* Hero */}
      <section className="py-24 md:py-32 px-6 text-center bg-muted/40">
        <div className="max-w-3xl mx-auto space-y-6">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground leading-tight">
            {t("hire.hero.title")}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {t("hire.hero.subtitle")}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link to="/signup?role=school">{t("hire.hero.primaryCta")}</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
              <Link to="/login">{t("hire.hero.secondaryCta")}</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Trust Strip */}
      <section className="py-8 px-6 border-b border-border">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {trustItems.map((item) => (
            <div key={item.key} className="flex items-center gap-3 justify-center text-center md:text-left md:justify-start">
              <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                <item.icon className="h-4.5 w-4.5 text-primary" />
              </div>
              <span className="text-sm text-muted-foreground">{t(item.key)}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Feature Blocks */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((f) => (
              <Link key={f.titleKey} to={f.to} className="group">
                <Card className="flex flex-col h-full border transition-all duration-200 group-hover:border-primary/40 group-hover:shadow-md">
                  <CardContent className="p-8 md:p-10 flex flex-col flex-1 gap-5">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center transition-colors group-hover:bg-primary/15">
                      <f.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h2 className="text-xl font-semibold text-foreground">{t(f.titleKey)}</h2>
                    <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                      {t(f.descKey)}
                    </p>
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                      {t(f.cta)}
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section className="py-24 px-6 bg-muted/40">
        <div className="max-w-4xl mx-auto text-center space-y-14">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">{t("hire.workflow.title")}</h2>
            <p className="text-muted-foreground mt-3">{t("hire.workflow.subtitle")}</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-6">
            {steps.map((step, i) => (
              <div key={step.key} className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <step.icon className="h-7 w-7 text-primary" />
                  </div>
                  <span className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-sm font-semibold text-foreground block">{t(step.key)}</span>
                  <span className="text-xs text-muted-foreground leading-relaxed block">{t(step.descKey)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Curriculum Intelligence */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <div className="inline-flex h-12 w-12 rounded-lg bg-primary/10 items-center justify-center mx-auto">
            <Globe className="h-6 w-6 text-primary" />
          </div>
          <div className="space-y-3">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">{t("hire.curriculum.title")}</h2>
            <p className="text-muted-foreground max-w-xl mx-auto leading-relaxed">
              {t("hire.curriculum.desc")}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {curriculumTags.map((tag) => (
              <Badge key={tag} variant="secondary" className="px-4 py-1.5 text-sm font-medium">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-24 px-6 bg-muted/40">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">{t("hire.cta.title")}</h2>
          <p className="text-muted-foreground">{t("hire.cta.desc")}</p>
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link to="/signup?role=school">{t("hire.cta.btn")}</Link>
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Hire;
