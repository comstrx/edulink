import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { CheckCircle, BookOpen, PackageOpen, Library } from "lucide-react";

type Segment = "teachers" | "schools";

const Pricing = () => {
  const { user, roles } = useAuth();
  const { t } = useLanguage();

  const isSchool = roles.some((r) => r.startsWith("school_"));
  const isTeacher = roles.includes("teacher");

  const defaultSegment: Segment = isSchool ? "schools" : "teachers";
  const [segment, setSegment] = useState<Segment>(defaultSegment);

  const TEACHER_PLANS = [
    { name: t("plan.free"), features: [t("plan.teacher.f1"), t("plan.teacher.f2"), t("plan.teacher.f3"), t("plan.teacher.f4")], ctaLoggedIn: null as string | null, ctaLoggedOut: "/signup", highlight: false },
    { name: t("plan.proTeacher"), features: [t("plan.teacher.f5"), t("plan.teacher.f6"), t("plan.teacher.f7"), t("plan.teacher.f8")], ctaLoggedIn: "/app/teacher", ctaLoggedOut: "/signup", highlight: true },
  ];

  const SCHOOL_PLANS = [
    { name: t("plan.free"), features: [t("plan.school.f1"), t("plan.school.f2"), t("plan.school.f3")], ctaLoggedIn: null as string | null, ctaLoggedOut: "/signup", ctaType: "link" as const, highlight: false },
    { name: t("plan.proSchool"), features: [t("plan.school.f4"), t("plan.school.f5"), t("plan.school.f6"), t("plan.school.f7"), t("plan.school.f8")], ctaLoggedIn: "/app/school", ctaLoggedOut: "/signup", ctaType: "link" as const, highlight: true },
    { name: t("plan.enterprise"), features: [t("plan.school.f9"), t("plan.school.f10"), t("plan.school.f11"), t("plan.school.f12")], ctaLoggedIn: null as string | null, ctaLoggedOut: null as string | null, ctaType: "mailto" as const, highlight: false },
  ];

  const HOW_TRAINING = [
    { icon: BookOpen, title: t("pricing.pickCourses.title"), text: t("pricing.pickCourses.text") },
    { icon: PackageOpen, title: t("pricing.chooseBundles.title"), text: t("pricing.chooseBundles.text") },
    { icon: Library, title: t("pricing.buildLibrary.title"), text: t("pricing.buildLibrary.text") },
  ];

  const teacherCta = (plan: typeof TEACHER_PLANS[number]) => {
    const label = user && isTeacher && plan.ctaLoggedIn ? t("pricing.goToDashboard") : t("pricing.getStarted");
    const to = user && isTeacher && plan.ctaLoggedIn ? plan.ctaLoggedIn : plan.ctaLoggedOut ?? "/signup";
    return (
      <Button asChild size="sm" variant={plan.highlight ? "default" : "outline"} className="w-full">
        <Link to={to}>{label}</Link>
      </Button>
    );
  };

  const schoolCta = (plan: typeof SCHOOL_PLANS[number]) => {
    if (plan.ctaType === "mailto") {
      return (
        <Button asChild size="sm" variant="outline" className="w-full">
          <a href="mailto:sales@edulink.com">{t("pricing.contactSales")}</a>
        </Button>
      );
    }
    const label = user && isSchool && plan.ctaLoggedIn ? t("pricing.goToDashboard") : t("pricing.getStarted");
    const to = user && isSchool && plan.ctaLoggedIn ? plan.ctaLoggedIn : plan.ctaLoggedOut ?? "/signup";
    return (
      <Button asChild size="sm" variant={plan.highlight ? "default" : "outline"} className="w-full">
        <Link to={to}>{label}</Link>
      </Button>
    );
  };

  return (
    <div className="space-y-16 pb-16">
      <section className="bg-muted/40 border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-16 text-center space-y-4">
          <h1 className="text-4xl font-bold text-foreground">{t("pricing.hero.title")}</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">{t("pricing.hero.subtitle")}</p>
          <div className="inline-flex items-center rounded-lg border border-border bg-muted/50 p-1 mt-4">
            {(["teachers", "schools"] as Segment[]).map((s) => (
              <button
                key={s}
                onClick={() => setSegment(s)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  segment === s ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {s === "teachers" ? t("pricing.teachers") : t("pricing.schools")}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6">
        {segment === "teachers" ? (
          <>
            <h2 className="text-2xl font-bold text-foreground text-center mb-6">{t("pricing.forTeachers")}</h2>
            <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
              {TEACHER_PLANS.map((plan) => (
                <Card key={plan.name} className={plan.highlight ? "border-primary" : ""}>
                  <CardHeader className="pb-2"><CardTitle className="text-lg">{plan.name}</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-2">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-center gap-2 text-sm text-foreground">
                          <CheckCircle className="h-4 w-4 text-primary shrink-0" />{f}
                        </li>
                      ))}
                    </ul>
                    {teacherCta(plan)}
                  </CardContent>
                </Card>
              ))}
            </div>
            <p className="text-xs text-muted-foreground text-center mt-4">{t("pricing.coursesNote")}</p>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-foreground text-center mb-6">{t("pricing.forSchools")}</h2>
            <div className="grid sm:grid-cols-3 gap-6">
              {SCHOOL_PLANS.map((plan) => (
                <Card key={plan.name} className={plan.highlight ? "border-primary" : ""}>
                  <CardHeader className="pb-2"><CardTitle className="text-lg">{plan.name}</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-2">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-center gap-2 text-sm text-foreground">
                          <CheckCircle className="h-4 w-4 text-primary shrink-0" />{f}
                        </li>
                      ))}
                    </ul>
                    {schoolCta(plan)}
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="max-w-5xl mx-auto px-6 space-y-6">
        <h2 className="text-2xl font-bold text-foreground text-center">{t("pricing.howTrainingWorks")}</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {HOW_TRAINING.map((item) => (
            <Card key={item.title}>
              <CardContent className="pt-6 text-center space-y-3">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <item.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-base font-semibold text-foreground">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Pricing;
