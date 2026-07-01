import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, ArrowRight, Users, Globe, ShieldCheck, BookOpen } from "lucide-react";

const SEO_PAGES = {
  overview: {
    titleKey: "seo.teachers.title",
    descKey: "seo.teachers.desc",
    cta: "/talent-search",
    highlights: ["seo.teachers.h1", "seo.teachers.h2", "seo.teachers.h3"],
    seoTitle: "Hire Teachers for International Schools | EduLink",
    seoDesc: "Find and hire qualified teachers for international, British, IB, and ESL programs. Browse certified educators ready to join your school.",
    canonical: "/hire/teachers",
  },
  esl: {
    titleKey: "seo.esl.title",
    descKey: "seo.esl.desc",
    cta: "/talent-search?curriculum=esl",
    highlights: ["seo.esl.h1", "seo.esl.h2", "seo.esl.h3"],
    seoTitle: "Hire ESL Teachers — CELTA & TESOL Certified | EduLink",
    seoDesc: "Recruit ESL, EFL, and ELT teachers with CELTA, DELTA, and TESOL certifications for language schools and international programs.",
    canonical: "/hire/teachers/esl",
  },
  british: {
    titleKey: "seo.british.title",
    descKey: "seo.british.desc",
    cta: "/talent-search?curriculum=british",
    highlights: ["seo.british.h1", "seo.british.h2", "seo.british.h3"],
    seoTitle: "Hire British Curriculum Teachers — IGCSE & A-Level | EduLink",
    seoDesc: "Find QTS-qualified teachers experienced in British curriculum, IGCSE, and A-Level programs for your international school.",
    canonical: "/hire/teachers/british-curriculum",
  },
  ib: {
    titleKey: "seo.ib.title",
    descKey: "seo.ib.desc",
    cta: "/talent-search?curriculum=ib",
    highlights: ["seo.ib.h1", "seo.ib.h2", "seo.ib.h3"],
    seoTitle: "Hire IB Teachers — PYP, MYP & DP Certified | EduLink",
    seoDesc: "Recruit IB-certified teachers experienced in PYP, MYP, and Diploma Programme for your International Baccalaureate school.",
    canonical: "/hire/teachers/ib",
  },
};

interface Props {
  variant: keyof typeof SEO_PAGES;
}

const HireTeachersLanding = ({ variant }: Props) => {
  const { t } = useLanguage();
  const page = SEO_PAGES[variant];

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="bg-background">
      <title>{page.seoTitle}</title>
      <meta name="description" content={page.seoDesc} />
      <link rel="canonical" href={`${origin}${page.canonical}`} />

      {/* Hero */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            {t(page.titleKey)}
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            {t(page.descKey)}
          </p>
          <Button asChild size="lg">
            <Link to={page.cta}>
              <Search className="h-4 w-4 me-2" />
              {t("seo.searchCta")}
            </Link>
          </Button>
        </div>
      </section>

      {/* Highlights */}
      <section className="py-16 px-6 border-t border-border">
        <div className="max-w-4xl mx-auto grid sm:grid-cols-3 gap-6">
          {page.highlights.map((key, i) => {
            const icons = [Users, Globe, ShieldCheck];
            const Icon = icons[i] ?? BookOpen;
            return (
              <Card key={key}>
                <CardContent className="p-6 flex flex-col items-start gap-3">
                  <Icon className="h-6 w-6 text-primary" />
                  <p className="text-sm text-foreground font-medium">{t(key)}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 px-6 bg-muted/30 border-t border-border">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">{t("seo.whyTitle")}</h2>
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {["seo.why1", "seo.why2", "seo.why3", "seo.why4"].map((k) => (
              <Badge key={k} variant="secondary" className="text-sm px-4 py-2">{t(k)}</Badge>
            ))}
          </div>
          <Button asChild size="lg">
            <Link to="/signup?role=school">
              {t("seo.signupCta")}
              <ArrowRight className="h-4 w-4 ms-2" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
};

export default HireTeachersLanding;
