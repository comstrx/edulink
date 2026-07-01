import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import type { TrainingContext } from "@/hooks/useTrainingContext";

interface TrainingModeStripProps {
  context: TrainingContext;
  activePage: "courses" | "packages" | "pathways";
}

const TrainingModeStrip = ({ context, activePage }: TrainingModeStripProps) => {
  const { user, roles } = useAuth();
  const { t } = useLanguage();

  const isTeacher = roles.includes("teacher");
  const isSchoolOrAdmin =
    roles.includes("school_admin") ||
    roles.includes("school_recruiter") ||
    roles.includes("school_academic_lead") ||
    roles.includes("admin");

  const libraryLink = !user
    ? "/login"
    : context === "school" && isSchoolOrAdmin
      ? "/app/school/training/catalog"
      : context === "teacher" && isTeacher
        ? "/app/teacher/training"
        : "/login";

  const chips: { label: string; to: string; active: boolean }[] = [
    {
      label: t("modeStrip.courses"),
      to: `/training/courses?context=${context}`,
      active: activePage === "courses",
    },
    {
      label: t("modeStrip.bundles"),
      to: `/training/packages?context=${context}`,
      active: activePage === "packages",
    },
    {
      label: t("modeStrip.library"),
      to: libraryLink,
      active: false,
    },
  ];

  return (
    <div className="space-y-1">
      <p className="text-sm text-muted-foreground">
        {t("modeStrip.text")}
      </p>
      <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <Link
          key={chip.label}
          to={chip.to}
          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
            chip.active
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          {chip.label}
        </Link>
      ))}
      </div>
    </div>
  );
};

export default TrainingModeStrip;
