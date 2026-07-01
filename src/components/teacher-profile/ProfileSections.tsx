import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { AVAILABILITY_CONFIG } from "@/components/teacher-profile/CandidatePanel";
import {
  BookOpen, Briefcase, Award, Languages, FileText,
  Calendar, GraduationCap, Download, MessageCircle,
  Monitor, Building2, ArrowRightLeft, Wifi, Clock,
  CheckCircle2, Lock, AlertTriangle, Sparkles,
  Play, ExternalLink, FileDown, Video, Plus, MapPin,
} from "lucide-react";

/* ── Compact Section ── */
const Section = ({ icon: Icon, title, children, accent, locked }: {
  icon: typeof BookOpen; title: string; children: React.ReactNode; accent?: boolean; locked?: boolean;
}) => (
  <Card className={cn(accent ? "border-primary/20" : "border-border/60", locked && "relative overflow-hidden")}>
    <CardHeader className="pb-2 pt-4 px-4">
      <CardTitle className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 text-muted-foreground">
        <Icon className={`h-3.5 w-3.5 ${accent ? "text-primary" : ""}`} />
        {title}
        {locked && <Lock className="h-3 w-3 text-muted-foreground ml-auto" />}
      </CardTitle>
    </CardHeader>
    <CardContent className={cn("px-4 pb-4", locked && "blur-sm select-none pointer-events-none")}>{children}</CardContent>
    {locked && (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 rounded-lg">
        <Lock className="h-5 w-5 text-muted-foreground mb-1.5" />
        <p className="text-xs font-medium text-foreground">Available with School Subscription</p>
      </div>
    )}
  </Card>
);

/* ── Types ── */
interface ExperienceEntry {
  school_name?: string;
  role?: string;
  years?: number;
  start_year?: number;
  end_year?: number | null;
  country?: string;
  curriculum?: string;
}

interface EducationEntry {
  degree_level?: string;
  major?: string;
  faculty?: string;
  university?: string;
  graduation_year?: number;
}

interface TrainingEntry {
  course_name: string;
  provider: string;
  completed_date: string;
}

interface TeachingDemoEntry {
  type: "video" | "lesson_pdf" | "portfolio";
  url: string;
  title?: string;
}

interface ProfileData {
  bio: string | null;
  years_of_experience: number | null;
  experience: unknown;
  education?: unknown;
  teaching_demo?: unknown;
  completed_training: unknown;
  availability_status: string;
  cv_url?: string | null;
  student_age_range?: string | null;
}

interface ResolvedTaxonomy {
  subjects: string[];
  curriculums: string[];
  certifications: string[];
  gradeBands: string[];
  languages: string[];
  licenses: string[];
  degrees: string[];
  curriculumExperiences: string[];
}

type ViewMode = "teacher" | "school" | "public";

interface ProfileSectionsProps {
  profile: ProfileData;
  taxonomy: ResolvedTaxonomy;
  workBadges: string[];
  hasEnglish: boolean;
  isEslSpecialist?: boolean;
  viewMode?: ViewMode;
  isPro?: boolean;
}

const WORK_ICON_MAP: Record<string, typeof Monitor> = {
  Online: Wifi,
  Onsite: Building2,
  Hybrid: ArrowRightLeft,
};

/* ── Auto-generate a recruiter-friendly professional summary (2–3 lines) ── */
function buildProfessionalSummary(
  profile: ProfileData,
  taxonomy: ResolvedTaxonomy,
  isEslSpecialist?: boolean,
): string | null {
  const { subjects, curriculums, gradeBands, certifications } = taxonomy;
  const parts: string[] = [];

  const subjectLabel = subjects.length > 0 ? subjects.slice(0, 2).join(" & ") : null;
  const currLabel = curriculums[0] ?? null;
  const yearsLabel = profile.years_of_experience && profile.years_of_experience > 0
    ? `${profile.years_of_experience} year${profile.years_of_experience > 1 ? "s" : ""} of experience`
    : null;

  if (subjectLabel || currLabel) {
    let line = currLabel ? `${currLabel} curriculum` : "";
    line = subjectLabel
      ? `${subjectLabel} teacher${line ? ` (${line})` : ""}${yearsLabel ? ` with ${yearsLabel} in international schools` : ""}.`
      : `${line} educator${yearsLabel ? ` with ${yearsLabel}` : ""}.`;
    parts.push(line.charAt(0).toUpperCase() + line.slice(1));
  } else if (yearsLabel) {
    parts.push(`Educator with ${yearsLabel} in international schools.`);
  }

  const specParts: string[] = [];
  if (gradeBands.length > 0) specParts.push(gradeBands.join(" & "));
  if (isEslSpecialist) specParts.push("ESL/ELT");
  if (certifications.length > 0) specParts.push(certifications.slice(0, 2).join(", ") + " certified");
  if (specParts.length > 0) {
    parts.push(`Specialized in ${specParts.join(". ")}.`);
  }

  return parts.length > 0 ? parts.join(" ") : null;
}

/* ── Teaching Demo Sub-section ── */
const DEMO_CONFIG: Record<string, { icon: typeof Play; label: string; action: string }> = {
  video: { icon: Play, label: "Demo Video", action: "Watch Demo" },
  lesson_pdf: { icon: FileDown, label: "Sample Lesson", action: "View Sample Lesson" },
  portfolio: { icon: ExternalLink, label: "Portfolio", action: "Open Portfolio" },
};

function getVideoThumbnail(url: string): string | null {
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
  if (ytMatch) return `https://img.youtube.com/vi/${ytMatch[1]}/mqdefault.jpg`;
  return null;
}

const TeachingDemoSection = ({ demos, viewMode, locked }: { demos: TeachingDemoEntry[]; viewMode: ViewMode; locked?: boolean }) => {
  if (demos.length === 0 && viewMode !== "teacher") {
    return null;
  }

  if (demos.length === 0 && viewMode === "teacher") {
    return (
      <Section icon={Video} title="Teaching Demo">
        <div className="text-center py-5 space-y-2">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Video className="h-5 w-5 text-primary" />
          </div>
          <p className="text-xs font-semibold text-foreground">Add Teaching Demo</p>
          <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
            International schools often require a short demo lesson. Add a video, sample lesson, or portfolio link.
          </p>
          <Button variant="outline" size="sm" className="gap-1.5 text-[11px] mt-1">
            <Plus className="h-3 w-3" /> Add Demo Material
          </Button>
        </div>
      </Section>
    );
  }

  const videoDemo = demos.find(d => d.type === "video");
  const thumbnail = videoDemo ? getVideoThumbnail(videoDemo.url) : null;

  return (
    <Section icon={Video} title="Teaching Demo" locked={locked}>
      <div className="space-y-3">
        {/* Primary video card with thumbnail */}
        {videoDemo && (
          <a
            href={videoDemo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block group rounded-lg border border-primary/15 bg-primary/[0.03] overflow-hidden hover:shadow-md transition-all"
          >
            {thumbnail && (
              <div className="relative aspect-video bg-muted">
                <img src={thumbnail} alt={videoDemo.title || "Demo video"} className="w-full h-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
                    <Play className="h-5 w-5 ml-0.5" />
                  </div>
                </div>
              </div>
            )}
            <div className="flex items-center justify-between px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">{videoDemo.title || "Demo Lesson Video"}</p>
                <p className="text-[10px] text-muted-foreground">YouTube</p>
              </div>
              <Badge variant="secondary" className="text-[10px] h-5 gap-0.5 shrink-0">
                <Play className="h-2.5 w-2.5" /> Watch Demo
              </Badge>
            </div>
          </a>
        )}

        {/* Other demo items */}
        {demos.filter(d => d.type !== "video").map((demo, i) => {
          const config = DEMO_CONFIG[demo.type] ?? DEMO_CONFIG.portfolio;
          const DIcon = config.icon;
          return (
            <a
              key={i}
              href={demo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border/60 bg-background hover:bg-accent/30 transition-colors group"
            >
              <div className="flex items-center justify-center h-8 w-8 rounded-md bg-primary/10 shrink-0">
                <DIcon className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">{demo.title || config.label}</p>
                <p className="text-[10px] text-muted-foreground">{config.label}</p>
              </div>
              <Badge variant="outline" className="text-[10px] h-5 gap-0.5 shrink-0 group-hover:border-primary/30">
                <DIcon className="h-2.5 w-2.5" /> {config.action}
              </Badge>
            </a>
          );
        })}
      </div>
    </Section>
  );
};

const ProfileSections = ({ profile, taxonomy, workBadges, hasEnglish, isEslSpecialist, viewMode = "public", isPro = false }: ProfileSectionsProps) => {
  const { subjects, curriculums, certifications, gradeBands, languages, licenses, degrees, curriculumExperiences } = taxonomy;
  const experience = (profile.experience as unknown as ExperienceEntry[] | null) ?? [];
  const education = (profile.education as unknown as EducationEntry[] | null) ?? [];
  const training = (profile.completed_training as unknown as TrainingEntry[] | null) ?? [];
  const professionalSummary = buildProfessionalSummary(profile, taxonomy, isEslSpecialist);

  // Determine if profile is incomplete (missing key docs/info)
  const isIncomplete = !profile.cv_url && certifications.length === 0 && licenses.length === 0 && degrees.length === 0;
  const canDownload = viewMode === "teacher" || (viewMode === "school" && isPro);
  const isLockedSchool = viewMode === "school" && !isPro;

  return (
    <div className="flex-1 min-w-0 space-y-3">

      {/* ═══ INCOMPLETE PROFILE BANNER ═══ */}
      {isIncomplete && viewMode === "school" && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">Profile Missing Documents</p>
            <p className="text-[11px] text-amber-600 dark:text-amber-400">This candidate hasn't uploaded a CV or credentials yet.</p>
          </div>
        </div>
      )}

      {/* ═══ FREE SCHOOL PREVIEW BANNER ═══ */}
      {viewMode === "school" && !isPro && (
        <div className="relative rounded-lg border border-primary/20 bg-primary/5 px-4 py-5 text-center space-y-3">
          <Lock className="h-6 w-6 text-primary mx-auto" />
          <p className="text-sm font-semibold text-foreground">Subscribe to unlock the full teacher profile and contact candidates.</p>
          <p className="text-xs text-muted-foreground">Experience, documents, teaching demos, and contact details require an active school subscription.</p>
          <div className="flex justify-center gap-2">
            <Button asChild size="sm" className="text-xs">
              <Link to="/pricing">View Pricing</Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="text-xs">
              <Link to="/pricing">Upgrade Plan</Link>
            </Button>
          </div>
        </div>
      )}

      {/* ═══ PROFESSIONAL SUMMARY ═══ */}
      {professionalSummary && (
        <div className="flex items-start gap-2.5 px-4 py-3 rounded-lg border border-primary/15 bg-primary/[0.03]">
          <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-foreground leading-relaxed line-clamp-3">{professionalSummary}</p>
        </div>
      )}

      <Section icon={BookOpen} title="Teaching Context" accent>
        {(subjects.length > 0 || curriculums.length > 0 || gradeBands.length > 0 || curriculumExperiences.length > 0) ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            {subjects.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Subjects</p>
                <div className="flex flex-wrap gap-1">
                  {subjects.map((s, i) => (
                    <Badge key={s} variant={i === 0 ? "default" : "secondary"} className="text-[11px] h-5">{s}</Badge>
                  ))}
                  {isEslSpecialist && (
                    <Badge className="text-[11px] h-5 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800">
                      ESL / ELT Specialist
                    </Badge>
                  )}
                </div>
              </div>
            )}
            {curriculums.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Curriculum</p>
                <div className="flex flex-wrap gap-1">
                  {curriculums.map((c) => (
                    <Badge key={c} variant="outline" className="text-[11px] h-5 font-medium">{c}</Badge>
                  ))}
                </div>
              </div>
            )}
            {gradeBands.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Grade Level</p>
                <div className="flex flex-wrap gap-1">
                  {gradeBands.map((g) => (
                    <Badge key={g} variant="outline" className="text-[11px] h-5">{g}</Badge>
                  ))}
                </div>
              </div>
            )}
            {curriculumExperiences.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Tracks</p>
                <div className="flex flex-wrap gap-1">
                  {curriculumExperiences.map((ce) => (
                    <Badge key={ce} variant="outline" className="text-[11px] h-5 border-primary/30 text-primary">{ce}</Badge>
                  ))}
                </div>
              </div>
            )}
            {profile.student_age_range && (
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Student Age Range</p>
                <Badge variant="outline" className="text-[11px] h-5 font-medium">Ages {profile.student_age_range}</Badge>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No teaching context specified</p>
        )}
      </Section>

      {/* ═══ 1b. EDUCATION ═══ */}
      <Section icon={GraduationCap} title="Education">
        {education.length > 0 ? (
          <div className="space-y-3">
            {education.map((edu, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border ${
                  i === 0 ? "border-primary/15 bg-primary/[0.03]" : "border-border/60 bg-background"
                }`}
              >
                <div className={`flex items-center justify-center h-8 w-8 rounded-md shrink-0 mt-0.5 ${
                  i === 0 ? "bg-primary/10" : "bg-muted"
                }`}>
                  <GraduationCap className={`h-4 w-4 ${i === 0 ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground leading-tight">
                    {edu.degree_level}{edu.major ? ` in ${edu.major}` : ""}
                  </p>
                  {edu.faculty && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">{edu.faculty}</p>
                  )}
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {edu.university && (
                      <span className="text-[11px] text-muted-foreground font-medium">{edu.university}</span>
                    )}
                    {edu.university && edu.graduation_year && (
                      <span className="text-[11px] text-muted-foreground">·</span>
                    )}
                    {edu.graduation_year && (
                      <span className="text-[11px] text-muted-foreground">{edu.graduation_year}</span>
                    )}
                  </div>
                  {!edu.degree_level && !edu.major && !edu.university && (
                    <p className="text-[11px] text-muted-foreground italic">Details not provided</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">No education details provided</p>
        )}
      </Section>

      {/* ═══ 2. EXPERIENCE ═══ */}
      <Section icon={Briefcase} title="Experience" locked={isLockedSchool}>
        {/* Current / Last School highlight */}
        {(() => {
          const currentOrLast = experience.find(e => e.school_name);
          if (!currentOrLast) return null;
          const isCurrent = !currentOrLast.end_year;
          return (
            <div className="flex items-center gap-3 px-3.5 py-3 rounded-lg border border-primary/20 bg-primary/[0.04] mb-3">
              <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary/10 shrink-0">
                <Building2 className="h-4.5 w-4.5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold text-primary uppercase tracking-wider">
                  {isCurrent ? "Current School" : "Last School"}
                </p>
                <p className="text-sm font-bold text-foreground leading-snug truncate">{currentOrLast.school_name}</p>
                {currentOrLast.country && (
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="h-2.5 w-2.5" />{currentOrLast.country}
                  </p>
                )}
              </div>
            </div>
          );
        })()}

        {profile.years_of_experience != null && profile.years_of_experience > 0 && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/5 border border-primary/10 mb-3">
            <Calendar className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-bold text-foreground">{profile.years_of_experience} Years Total Experience</span>
          </div>
        )}
        {experience.length > 0 && experience.some(exp => exp.role || exp.school_name) ? (
          <div className="relative ml-1">
            <div className="absolute left-[5px] top-1 bottom-1 w-px bg-border" />
            <div className="space-y-4">
              {experience.map((exp, i) => (
                <div key={i} className="relative pl-6">
                  <div className="absolute left-0 top-1.5 h-[11px] w-[11px] rounded-full border-2 border-primary bg-background" />
                  <div className="space-y-0.5">
                    {exp.role && (
                      <p className="text-xs font-semibold text-foreground leading-tight">{exp.role}</p>
                    )}
                    {exp.school_name && (
                      <p className="text-[11px] text-foreground/80 font-medium">{exp.school_name}</p>
                    )}
                    {exp.curriculum && (
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-medium mt-0.5">{exp.curriculum}</Badge>
                    )}
                    <div className="flex items-center gap-1.5 mt-1">
                      {exp.country && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <MapPin className="h-2.5 w-2.5" />{exp.country}
                        </span>
                      )}
                      {exp.country && exp.start_year && <span className="text-[10px] text-muted-foreground">·</span>}
                      {exp.start_year && (
                        <span className="text-[10px] text-muted-foreground">{exp.start_year} — {exp.end_year ?? "Present"}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No detailed teaching history added yet.</p>
        )}
      </Section>

      {/* ═══ 3. CERTIFICATIONS ═══ */}
      <Section icon={Award} title="Certifications & Qualifications" locked={isLockedSchool}>
        {certifications.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {certifications.map((c) => (
              <div key={c} className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-primary/15 bg-primary/[0.03] hover:bg-primary/[0.06] transition-colors">
                <div className="flex items-center justify-center h-7 w-7 rounded-md bg-primary/10 shrink-0">
                  <Award className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="text-xs font-semibold text-foreground leading-tight truncate">{c}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No certifications listed</p>
        )}
      </Section>

      {/* ═══ 4. LANGUAGES ═══ */}
      <Section icon={Languages} title="Languages">
        <div className="flex flex-wrap items-center gap-1.5">
          {hasEnglish && (
            <Badge className="text-[11px] h-5 gap-0.5 bg-primary/10 text-primary border-primary/20 hover:bg-primary/15">
              <CheckCircle2 className="h-3 w-3" /> Native English
            </Badge>
          )}
          {languages.map((l) => (
            <Badge
              key={l}
              variant={l.toLowerCase().includes("english") || l.toLowerCase().includes("french") ? "default" : "secondary"}
              className="text-[11px] h-5"
            >
              {l}
            </Badge>
          ))}
          {!hasEnglish && languages.length === 0 && (
            <p className="text-xs text-muted-foreground">No languages listed</p>
          )}
        </div>
      </Section>

      {/* ═══ 5. WORK PREFERENCES ═══ */}
      <Section icon={Monitor} title="Work Preferences">
        <div className="space-y-3">
          {/* Teaching Mode */}
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Teaching Mode</p>
            <div className="flex flex-wrap gap-1.5">
              {workBadges.length > 0 ? workBadges.map((wb) => {
                const WIcon = WORK_ICON_MAP[wb] ?? Briefcase;
                return (
                  <Badge key={wb} variant="outline" className="text-[11px] h-5 gap-0.5 font-medium">
                    <WIcon className="h-3 w-3" /> {wb}
                  </Badge>
                );
              }) : (
                <span className="text-xs text-muted-foreground">Not specified</span>
              )}
            </div>
          </div>

          <Separator />

          {/* Availability */}
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Availability</p>
            {(() => {
              const config = AVAILABILITY_CONFIG[profile.availability_status] ?? AVAILABILITY_CONFIG.open;
              const AvailIcon = config.icon;
              return (
                <Badge variant="outline" className={`text-[11px] h-5 gap-0.5 font-semibold ${config.className}`}>
                  <AvailIcon className="h-3 w-3" />
                  {config.label}
                </Badge>
              );
            })()}
          </div>
        </div>
      </Section>

      {/* ═══ 6. DOCUMENTS ═══ */}
      <Section icon={FileText} title="Documents & Credentials" locked={isLockedSchool}>
        <div className="space-y-4">
          {/* CV Download */}
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Curriculum Vitae</p>
            {profile.cv_url && canDownload ? (
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-primary/15 bg-primary/[0.03]">
                <div className="flex items-center justify-center h-8 w-8 rounded-md bg-primary/10 shrink-0">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground">Resume / CV</p>
                  <p className="text-[10px] text-muted-foreground">PDF document</p>
                </div>
                <Button asChild size="sm" variant="outline" className="gap-1 text-[11px] h-7 shrink-0">
                  <a href={profile.cv_url} target="_blank" rel="noopener noreferrer">
                    <Download className="h-3 w-3" /> Download
                  </a>
                </Button>
              </div>
            ) : profile.cv_url && !canDownload ? (
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border/60 bg-muted/30">
                <div className="flex items-center justify-center h-8 w-8 rounded-md bg-muted shrink-0">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground">Resume / CV</p>
                  <p className="text-[10px] text-muted-foreground">Upgrade to download</p>
                </div>
                <Button asChild size="sm" className="gap-1 text-[11px] h-7 shrink-0">
                  <Link to="/pricing">Unlock</Link>
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-dashed border-border/60">
                <div className="flex items-center justify-center h-8 w-8 rounded-md bg-muted/50 shrink-0">
                  <FileText className="h-4 w-4 text-muted-foreground/50" />
                </div>
                <p className="text-xs text-muted-foreground">No CV uploaded yet</p>
              </div>
            )}
          </div>

          {/* Teaching Licenses */}
          {licenses.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Teaching Licenses</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {licenses.map((l) => (
                  <div key={l} className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border/60 bg-background">
                    <div className="flex items-center justify-center h-7 w-7 rounded-md bg-muted shrink-0">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <span className="text-xs font-medium text-foreground truncate">{l}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Degrees */}
          {degrees.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Degrees</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {degrees.map((d) => (
                  <div key={d} className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border/60 bg-background">
                    <div className="flex items-center justify-center h-7 w-7 rounded-md bg-muted shrink-0">
                      <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <span className="text-xs font-medium text-foreground truncate">{d}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {licenses.length === 0 && degrees.length === 0 && !profile.cv_url && (
            <div className="text-center py-4">
              <FileText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">This teacher has not uploaded documents yet.</p>
            </div>
          )}
        </div>
      </Section>

      {/* ═══ 7. ABOUT ═══ */}
      {profile.bio && (
        <Section icon={MessageCircle} title="About">
          <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">{profile.bio}</p>
        </Section>
      )}

      {/* ═══ 8. TEACHING DEMO ═══ */}
      <TeachingDemoSection demos={(profile.teaching_demo as unknown as TeachingDemoEntry[] | null) ?? []} viewMode={viewMode} locked={isLockedSchool} />

      {/* Professional Development */}
      {training.length > 0 && (
        <Section icon={BookOpen} title="Professional Development">
          <div className="space-y-2">
            {training.map((tr, i) => (
              <div key={i} className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-medium text-foreground">{tr.course_name}</p>
                  <p className="text-[11px] text-muted-foreground">{tr.provider}</p>
                </div>
                <p className="text-[11px] text-muted-foreground shrink-0">{tr.completed_date}</p>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
};

export default ProfileSections;
