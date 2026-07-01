import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import JobsSubnav from "@/components/JobsSubnav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Globe, BookOpen, Monitor, Award, ChevronRight } from "lucide-react";

const usePresetTerms = (domainKey: string) =>
  useQuery({
    queryKey: ["esl_preset_terms", domainKey],
    queryFn: async () => {
      const { data: tt, error: ttErr } = await supabase.from("taxonomy_term_types").select("id").eq("key", domainKey).eq("is_active", true).single();
      if (ttErr) throw ttErr;
      const { data, error } = await supabase.from("taxonomy_terms").select("id, name").eq("term_type_id", tt.id).eq("is_active", true).order("sort_order").order("name").limit(20);
      if (error) throw error;
      return data;
    },
  });

const ESL_KEYWORDS = ["english", "esl", "tefl", "tesol", "celta", "ielts", "international", "ib", "british", "american", "online"];

const ESLJobs = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const { data: subjects } = usePresetTerms("subjects");
  const { data: curriculums } = usePresetTerms("curriculums");
  const { data: deliveryModes } = usePresetTerms("work_arrangements");
  const { data: certifications } = usePresetTerms("certifications");

  const matchesESL = (name: string) => ESL_KEYWORDS.some((kw) => name.toLowerCase().includes(kw));

  const eslSubjects = subjects?.filter((t) => matchesESL(t.name)) ?? [];
  const eslCurriculums = curriculums?.filter((t) => matchesESL(t.name)) ?? [];
  const eslDelivery = deliveryModes?.filter((t) => matchesESL(t.name)) ?? [];
  const eslCerts = certifications?.filter((t) => matchesESL(t.name)) ?? [];

  type Chip = { label: string; icon: React.ReactNode; param: string; value: string };
  const chips: Chip[] = [
    ...eslSubjects.map((t) => ({ label: t.name, icon: <BookOpen className="h-3 w-3" />, param: "subject", value: t.id })),
    ...eslCurriculums.map((t) => ({ label: t.name, icon: <Globe className="h-3 w-3" />, param: "curriculum", value: t.id })),
    ...eslDelivery.map((t) => ({ label: t.name, icon: <Monitor className="h-3 w-3" />, param: "deliveryMode", value: t.id })),
    ...eslCerts.map((t) => ({ label: t.name, icon: <Award className="h-3 w-3" />, param: "certification", value: t.id })),
  ];

  const goToJobs = (param?: string, value?: string) => {
    const params = new URLSearchParams();
    if (param && value) params.set(param, value);
    navigate(`/jobs?${params.toString()}`);
  };

  return (
    <>
      <JobsSubnav />
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t("esl.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("esl.subtitle")}</p>
        </div>

        <Button onClick={() => goToJobs()} size="lg" className="gap-2">{t("esl.viewAll")} <ChevronRight className="h-4 w-4" /></Button>

        {chips.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">{t("esl.browseByCategory")}</h2>
            <div className="flex flex-wrap gap-2">
              {chips.map((chip) => (
                <Badge key={chip.value} variant="secondary" className="cursor-pointer gap-1 hover:bg-accent transition-colors" onClick={() => goToJobs(chip.param, chip.value)}>
                  {chip.icon} {chip.label}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <Card>
          <CardContent className="py-12 text-center">
            <Globe className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">{t("esl.noJobs")}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("esl.noJobsHint")}</p>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default ESLJobs;
