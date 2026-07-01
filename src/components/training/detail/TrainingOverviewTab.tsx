import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Users, ShieldCheck, Brain, Sparkles } from "lucide-react";
import { useTaxonomyNames } from "@/hooks/useTaxonomyNames";
import { type TrainingDetailItem } from "./training-detail-data";
import { useMemo } from "react";

interface TrainingOverviewTabProps {
  item: TrainingDetailItem;
}

const TrainingOverviewTab = ({ item }: TrainingOverviewTabProps) => {
  const competencyIds = item.competency_domain_term_ids ?? [];
  const skillIds = item.skill_term_ids ?? [];
  const allTaxIds = useMemo(() => [...competencyIds, ...skillIds], [competencyIds, skillIds]);
  const { data: nameMap } = useTaxonomyNames(allTaxIds);
  const resolve = (id: string) => nameMap?.[id] ?? id.slice(0, 8);

  const hasCompetencies = competencyIds.length > 0;
  const hasSkills = skillIds.length > 0;

  return (
    <div className="space-y-10">
      {/* Overview */}
      {item.overview && (
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">Overview</h2>
          <p className="text-muted-foreground leading-relaxed">{item.overview}</p>
        </section>
      )}

      {/* Competency Domains & Skills */}
      {(hasCompetencies || hasSkills) && (
        <section className="space-y-4">
          {hasCompetencies && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Brain className="h-4 w-4 text-primary" /> Target Competency Domains
              </h3>
              <div className="flex flex-wrap gap-2">
                {competencyIds.map((id) => (
                  <Badge key={id} variant="secondary" className="text-xs">
                    {resolve(id)}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {hasSkills && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-primary" /> Target Skills
              </h3>
              <div className="flex flex-wrap gap-2">
                {skillIds.map((id) => (
                  <Badge key={id} variant="outline" className="text-xs">
                    {resolve(id)}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Outcomes */}
      {item.outcomes && item.outcomes.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">What You'll Gain</h2>
          <ul className="grid sm:grid-cols-2 gap-2">
            {item.outcomes.map((o) => (
              <li key={o} className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />{o}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Syllabus */}
      {item.syllabus && item.syllabus.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">
            {item.type === "pathway" ? "Pathway Structure" : item.type === "package" ? "Included Courses" : "Syllabus"}
          </h2>
          <ol className="space-y-2">
            {item.syllabus.map((entry, i) => (
              <li key={i} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 text-sm">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{i + 1}</span>
                <span className="text-foreground">{entry}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Mentor / Credential strip */}
      {(item.mentor_supported || item.credential_eligible) && (
        <section className="grid sm:grid-cols-2 gap-4">
          {item.mentor_supported && (
            <Card>
              <CardContent className="pt-6 flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold text-foreground text-sm">Mentor Supported</h3>
                  <p className="text-xs text-muted-foreground">An expert mentor provides personalised feedback and coaching throughout this program.</p>
                </div>
              </CardContent>
            </Card>
          )}
          {item.credential_eligible && (
            <Card>
              <CardContent className="pt-6 flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold text-foreground text-sm">Credential Eligible</h3>
                  <p className="text-xs text-muted-foreground">Completing this program earns you a verifiable credential for your professional portfolio.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </section>
      )}
    </div>
  );
};

export default TrainingOverviewTab;
