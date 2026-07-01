import { useLanguage } from "@/contexts/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { applyTeacherPublicFilters } from "@/lib/visibility-rules";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sparkles, Target, TrendingUp, MapPin, Calendar,
  CheckCircle2, Clock, XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

/* ---- shared types ---- */
interface Teacher {
  id: string;
  full_name: string;
  city: string | null;
  country: string | null;
  years_of_experience: number | null;
  availability_status: string;
  subject_ids: string[] | null;
  curriculum_ids: string[] | null;
  certification_ids: string[] | null;
}

interface Props {
  onPreview?: (teacher: Teacher) => void;
}

/* ---- helpers ---- */
/** Derive a discovery relevance score from profile signals (experience, certs, availability). */
function deriveDiscoveryScore(teacher: Teacher): number {
  let score = 60;
  score += Math.min((teacher.years_of_experience ?? 0) * 2, 15);
  score += Math.min((teacher.certification_ids ?? []).length * 3, 12);
  score += Math.min((teacher.subject_ids ?? []).length * 2, 8);
  score += teacher.availability_status === "open" ? 5 : 0;
  return Math.min(score, 99);
}

const getMatchColor = (score: number) => {
  if (score >= 85) return "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/50 border-green-200 dark:border-green-800";
  if (score >= 65) return "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/50 border-yellow-200 dark:border-yellow-800";
  return "text-muted-foreground bg-muted border-border";
};

const AVAIL: Record<string, { icon: typeof CheckCircle2; key: string; variant: "default" | "secondary" | "outline" }> = {
  open: { icon: CheckCircle2, key: "tsearch.avail.open", variant: "default" },
  limited: { icon: Clock, key: "tsearch.avail.limited", variant: "secondary" },
  not_available: { icon: XCircle, key: "tsearch.avail.notAvailable", variant: "outline" },
};

/* ---- mini card used only inside discovery rows ---- */
const MiniCard = ({ teacher, onPreview }: { teacher: Teacher; onPreview?: (t: Teacher) => void }) => {
  const { t } = useLanguage();
  const score = useMemo(() => deriveDiscoveryScore(teacher), [teacher]);
  const initials = teacher.full_name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() ?? "??";
  const location = [teacher.city, teacher.country].filter(Boolean).join(", "); // TODO: resolve from city_id/country_id when available
  const avail = AVAIL[teacher.availability_status] ?? AVAIL.open;
  const AvailIcon = avail.icon;
  const primarySubject = (teacher.subject_ids ?? [])[0];
  const primaryCurriculum = (teacher.curriculum_ids ?? [])[0];

  return (
    <Card
      className="min-w-[220px] max-w-[240px] shrink-0 cursor-pointer hover:shadow-md transition-shadow border rounded-xl"
      onClick={() => onPreview?.(teacher)}
    >
      <CardContent className="p-4 space-y-2.5">
        <div className="flex items-center gap-2.5">
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground text-sm truncate">{teacher.full_name}</p>
            {location && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                <MapPin className="h-3 w-3 shrink-0" />{location}
              </p>
            )}
          </div>
        </div>

        {/* Match score */}
        <div className={cn("flex items-center gap-1 rounded-md border px-2 py-1 w-fit text-xs font-semibold", getMatchColor(score))}>
          <Sparkles className="h-3 w-3" />
          {score}% {t("tsearch.match")}
        </div>

        {/* Tags row */}
        <div className="flex gap-1 flex-wrap">
          {primarySubject && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{primarySubject}</Badge>}
          {primaryCurriculum && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{primaryCurriculum}</Badge>}
          {teacher.years_of_experience != null && teacher.years_of_experience > 0 && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5">
              <Calendar className="h-2.5 w-2.5" />
              {teacher.years_of_experience} {t("tp.yearsExp")}
            </Badge>
          )}
        </div>

        {/* Availability */}
        <Badge variant={avail.variant} className="text-[10px] gap-0.5">
          <AvailIcon className="h-2.5 w-2.5" />
          {t(avail.key)}
        </Badge>
      </CardContent>
    </Card>
  );
};

/* ---- Section wrapper ---- */
const DiscoveryRow = ({
  icon: Icon,
  title,
  description,
  teachers,
  onPreview,
  accentClass,
}: {
  icon: typeof Sparkles;
  title: string;
  description: string;
  teachers: Teacher[];
  onPreview?: (t: Teacher) => void;
  accentClass?: string;
}) => {
  if (teachers.length === 0) return null;

  return (
    <section className="space-y-3">
      <div>
        <h2 className={cn("text-sm font-semibold flex items-center gap-2", accentClass ?? "text-foreground")}>
          <Icon className="h-4 w-4" />
          {title}
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <ScrollArea className="w-full">
        <div className="flex gap-3 pb-3">
          {teachers.map((t) => (
            <MiniCard key={t.id} teacher={t} onPreview={onPreview} />
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </section>
  );
};

/* ---- Main component ---- */
const HiringIntelligenceSections = ({ onPreview }: Props) => {
  const { t } = useLanguage();

  const { data: allTeachers } = useQuery({
    queryKey: ["discovery_teachers"],
    queryFn: async () => {
      const { data, error } = await applyTeacherPublicFilters(
        supabase
          .from("teacher_profiles")
          .select("id, full_name, city, country, years_of_experience, availability_status, subject_ids, curriculum_ids, certification_ids")
      )
        .order("years_of_experience", { ascending: false, nullsFirst: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as Teacher[];
    },
  });

  const teachers = allTeachers ?? [];
  if (teachers.length === 0) return null;

  // Split into discovery buckets using real profile signals
  const scored = teachers.map((t) => ({ ...t, _score: deriveDiscoveryScore(t) }));
  const bestMatches = [...scored].sort((a, b) => b._score - a._score).slice(0, 8);
  const recommended = scored.filter((t) => t.availability_status === "open").slice(0, 8);
  const trending = [...scored].sort((a, b) => (b.years_of_experience ?? 0) - (a.years_of_experience ?? 0)).slice(0, 8);

  return (
    <div className="space-y-6 mb-8">
      <DiscoveryRow
        icon={Target}
        title={t("discovery.bestMatches")}
        description={t("discovery.bestMatchesDesc")}
        teachers={bestMatches}
        onPreview={onPreview}
        accentClass="text-green-600 dark:text-green-400"
      />
      <DiscoveryRow
        icon={Sparkles}
        title={t("discovery.recommended")}
        description={t("discovery.recommendedDesc")}
        teachers={recommended}
        onPreview={onPreview}
        accentClass="text-primary"
      />
      <DiscoveryRow
        icon={TrendingUp}
        title={t("discovery.trending")}
        description={t("discovery.trendingDesc")}
        teachers={trending}
        onPreview={onPreview}
        accentClass="text-yellow-600 dark:text-yellow-400"
      />
    </div>
  );
};

export default HiringIntelligenceSections;
