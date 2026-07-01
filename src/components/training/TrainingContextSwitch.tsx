import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { User, Building2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { TrainingContext } from "@/hooks/useTrainingContext";

interface TrainingContextSwitchProps {
  value: TrainingContext;
  onChange: (value: TrainingContext) => void;
}

const TrainingContextSwitch = ({ value, onChange }: TrainingContextSwitchProps) => {
  const { t } = useLanguage();

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-muted-foreground">{t("contextSwitch.viewAs")}</span>
      <ToggleGroup
        type="single"
        value={value}
        onValueChange={(v) => {
          if (v === "teacher" || v === "school") onChange(v);
        }}
        variant="outline"
        size="sm"
      >
        <ToggleGroupItem value="teacher" aria-label={t("contextSwitch.teacher")}>
          <User className="h-4 w-4 mr-1.5" />
          {t("contextSwitch.teacher")}
        </ToggleGroupItem>
        <ToggleGroupItem value="school" aria-label={t("contextSwitch.school")}>
          <Building2 className="h-4 w-4 mr-1.5" />
          {t("contextSwitch.school")}
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
};

export default TrainingContextSwitch;
