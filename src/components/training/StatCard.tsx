import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ElementType;
  /** Override value colour, e.g. "text-primary" or "text-destructive" */
  valueClassName?: string;
  /** Show icon in a rounded bg circle (school-style) */
  iconCircle?: boolean;
}

const StatCard = ({
  label,
  value,
  icon: Icon,
  valueClassName = "text-foreground",
  iconCircle = false,
}: StatCardProps) => (
  <Card className="border-border/50 shadow-none">
    <CardContent className="pt-3 pb-3 flex items-center gap-3">
      {Icon && iconCircle && (
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      )}
      <div>
        {Icon && !iconCircle && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Icon className="h-4 w-4" /> {label}
          </div>
        )}
        {(!Icon || iconCircle) && (
          <p className="text-sm text-muted-foreground">{label}</p>
        )}
        <p className={`text-lg font-bold ${valueClassName}`}>{value}</p>
      </div>
    </CardContent>
  </Card>
);

export default StatCard;
