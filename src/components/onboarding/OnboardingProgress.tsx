import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface OnboardingStep {
  label: string;
  completed: boolean;
  active: boolean;
}

interface OnboardingProgressProps {
  steps: OnboardingStep[];
  className?: string;
}

const OnboardingProgress = ({ steps, className }: OnboardingProgressProps) => {
  return (
    <div className={cn("flex items-center justify-center gap-2", className)}>
      {steps.map((step, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium transition-colors",
                step.completed
                  ? "bg-primary text-primary-foreground"
                  : step.active
                    ? "border-2 border-primary text-primary"
                    : "border border-muted-foreground/30 text-muted-foreground/50"
              )}
            >
              {step.completed ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </div>
            <span
              className={cn(
                "text-xs font-medium hidden sm:inline",
                step.completed
                  ? "text-primary"
                  : step.active
                    ? "text-foreground"
                    : "text-muted-foreground/50"
              )}
            >
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={cn(
                "h-px w-8",
                step.completed ? "bg-primary" : "bg-muted-foreground/20"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
};

export default OnboardingProgress;
