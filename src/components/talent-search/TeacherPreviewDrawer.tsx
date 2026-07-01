import { useTaxonomyNames } from "@/hooks/useTaxonomyNames";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MapPin, Calendar, CheckCircle2, Clock, XCircle,
  Eye, Bookmark, Send, GraduationCap, Award, BookOpen, Lock,
  Globe, Briefcase, Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSchoolHiringGuard } from "@/hooks/useSchoolHiringGuard";
import { cn } from "@/lib/utils";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
  language_ids: string[] | null;
  work_arrangement_term_ids: string[] | null;
  grade_band_ids: string[] | null;
  nationality_id: string | null;
}

interface TeacherPreviewDrawerProps {
  teacher: Teacher | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AVAILABILITY_CONFIG: Record<string, { variant: "default" | "secondary" | "outline"; icon: typeof CheckCircle2; key: string }> = {
  open: { variant: "default", icon: CheckCircle2, key: "tsearch.avail.open" },
  limited: { variant: "secondary", icon: Clock, key: "tsearch.avail.limited" },
  not_available: { variant: "outline", icon: XCircle, key: "tsearch.avail.notAvailable" },
};

// useTaxonomyNames imported from shared hook

const TeacherPreviewDrawer = ({ teacher, open, onOpenChange }: TeacherPreviewDrawerProps) => {
  const { t } = useLanguage();
  const { guardHiringAction, isCompleted } = useSchoolHiringGuard();
  const [saved, setSaved] = useState(false);

  // Collect all taxonomy IDs for resolution
  const allIds = useMemo(() => {
    if (!teacher) return [];
    const ids: string[] = [];
    if (teacher.subject_ids) ids.push(...teacher.subject_ids);
    if (teacher.curriculum_ids) ids.push(...teacher.curriculum_ids);
    if (teacher.certification_ids) ids.push(...teacher.certification_ids);
    if (teacher.language_ids) ids.push(...teacher.language_ids);
    if (teacher.work_arrangement_term_ids) ids.push(...teacher.work_arrangement_term_ids);
    if (teacher.grade_band_ids) ids.push(...teacher.grade_band_ids);
    if (teacher.nationality_id) ids.push(teacher.nationality_id);
    return [...new Set(ids)];
  }, [teacher?.id, teacher?.subject_ids, teacher?.curriculum_ids, teacher?.certification_ids, teacher?.language_ids, teacher?.work_arrangement_term_ids, teacher?.grade_band_ids, teacher?.nationality_id]);

  const { data: nameMap } = useTaxonomyNames(allIds);
  const resolve = (id: string) => nameMap?.[id] ?? "";

  if (!teacher) return null;

  const initials = teacher.full_name
    ? teacher.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "??";

  const location = [teacher.city, teacher.country].filter(Boolean).join(", ");
  const availConfig = AVAILABILITY_CONFIG[teacher.availability_status] ?? AVAILABILITY_CONFIG.open;
  const AvailIcon = availConfig.icon;

  const subjects = (teacher.subject_ids ?? []).map(resolve).filter(Boolean);
  const curriculums = (teacher.curriculum_ids ?? []).map(resolve).filter(Boolean);
  const certifications = (teacher.certification_ids ?? []).map(resolve).filter(Boolean);
  const languages = (teacher.language_ids ?? []).map(resolve).filter(Boolean);
  const workArrangements = (teacher.work_arrangement_term_ids ?? []).map(resolve).filter(Boolean);
  const gradeBands = (teacher.grade_band_ids ?? []).map(resolve).filter(Boolean);
  const nationality = teacher.nationality_id ? resolve(teacher.nationality_id) : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[420px] md:w-[480px] lg:w-[520px] p-0 flex flex-col">
        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            {/* Header */}
            <SheetHeader className="space-y-4 text-left">
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16 shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <SheetTitle className="text-xl truncate">{teacher.full_name}</SheetTitle>
                  {location && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      {location}
                    </p>
                  )}
                  {nationality && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5 shrink-0" />
                      {nationality}
                    </p>
                  )}
                  <Badge variant={availConfig.variant} className="text-xs gap-1">
                    <AvailIcon className="h-3 w-3" />
                    {t(availConfig.key)}
                  </Badge>
                </div>
              </div>
            </SheetHeader>

            <Separator />

            {/* Experience */}
            {teacher.years_of_experience != null && teacher.years_of_experience > 0 && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {teacher.years_of_experience} {t("tp.yearsExp")}
                </span>
              </div>
            )}

            {/* Subjects */}
            {subjects.length > 0 && (
              <Section icon={BookOpen} title={t("drawer.subjects")}>
                <div className="flex flex-wrap gap-1.5">
                  {subjects.map((s) => (
                    <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                  ))}
                </div>
              </Section>
            )}

            {/* Curriculum */}
            {curriculums.length > 0 && (
              <Section icon={GraduationCap} title={t("drawer.curriculum")}>
                <div className="flex flex-wrap gap-1.5">
                  {curriculums.map((c) => (
                    <Badge key={c} variant="outline" className="text-xs">{c}</Badge>
                  ))}
                </div>
              </Section>
            )}

            {/* Certifications */}
            {certifications.length > 0 && (
              <Section icon={Award} title={t("drawer.certifications")}>
                <div className="flex flex-wrap gap-1.5">
                  {certifications.map((c) => (
                    <Badge key={c} variant="outline" className="text-xs border-primary/20 text-primary">{c}</Badge>
                  ))}
                </div>
              </Section>
            )}

            {/* Languages */}
            {languages.length > 0 && (
              <Section icon={Globe} title="Languages">
                <div className="flex flex-wrap gap-1.5">
                  {languages.map((l) => (
                    <Badge key={l} variant="secondary" className="text-xs">{l}</Badge>
                  ))}
                </div>
              </Section>
            )}

            {/* Grade Bands */}
            {gradeBands.length > 0 && (
              <Section icon={Users} title="Grade Bands">
                <div className="flex flex-wrap gap-1.5">
                  {gradeBands.map((g) => (
                    <Badge key={g} variant="outline" className="text-xs">{g}</Badge>
                  ))}
                </div>
              </Section>
            )}

            {/* Work Arrangements */}
            {workArrangements.length > 0 && (
              <Section icon={Briefcase} title="Work Arrangement">
                <div className="flex flex-wrap gap-1.5">
                  {workArrangements.map((w) => (
                    <Badge key={w} variant="outline" className="text-xs">{w}</Badge>
                  ))}
                </div>
              </Section>
            )}

            {/* About placeholder */}
            <Section icon={BookOpen} title={t("drawer.about")}>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("drawer.aboutPlaceholder")}
              </p>
            </Section>
          </div>
        </ScrollArea>

        {/* Sticky action buttons */}
        <div className="border-t bg-background p-4 space-y-2">
          <div className="flex gap-2">
            <Button asChild className="flex-1 gap-1.5">
              <Link to={`/teachers/${teacher.id}`}>
                <Eye className="h-4 w-4" />
                {t("drawer.viewFull")}
              </Link>
            </Button>
            <Button
              variant={saved ? "secondary" : "outline"}
              className="gap-1.5"
              onClick={() => { if (guardHiringAction()) setSaved(!saved); }}
            >
              <Bookmark className={cn("h-4 w-4", saved && "fill-primary text-primary")} />
            </Button>
          </div>
          <Button variant="outline" className="w-full gap-1.5" onClick={() => guardHiringAction()} disabled={!isCompleted}>
            {!isCompleted ? <Lock className="h-4 w-4" /> : <Send className="h-4 w-4" />}
            {t("drawer.inviteToApply")}
          </Button>
          {!isCompleted && (
            <p className="text-[10px] text-muted-foreground text-center">Complete your school profile to activate hiring.</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

/** Reusable section block */
const Section = ({ icon: Icon, title, children }: { icon: typeof BookOpen; title: string; children: React.ReactNode }) => (
  <div className="space-y-2">
    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
      <Icon className="h-4 w-4 text-muted-foreground" />
      {title}
    </h3>
    {children}
  </div>
);

export default TeacherPreviewDrawer;
