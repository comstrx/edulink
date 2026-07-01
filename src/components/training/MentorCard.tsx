import { UserCircle, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface MentorCardProps {
  name: string;
  title?: string;
  /** Array of specialization / expertise labels */
  specializations?: string[];
  /** Mentoring model label, e.g. "Guided Learning" */
  model?: string;
  /** "initials" shows first-letter avatar, "icon" shows UserCircle icon */
  avatarType?: "initials" | "icon";
  /** Optional availability status shown as top-right badge */
  availability?: string;
  /** Optional numeric rating (renders star icon) */
  rating?: number;
  /** Optional sessions count */
  sessionsCompleted?: number;
  /** Optional action button label */
  actionLabel?: string;
  /** Callback for action button */
  onAction?: () => void;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const MentorCard = ({
  name,
  title,
  specializations = [],
  model,
  avatarType = "initials",
  availability,
  rating,
  sessionsCompleted,
  actionLabel,
  onAction,
}: MentorCardProps) => (
  <Card className="hover:shadow-md transition-shadow">
    <CardContent className="pt-6 space-y-3">
      {/* Avatar + identity + optional availability */}
      <div className="flex items-start gap-3">
        {avatarType === "initials" ? (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
            {getInitials(name)}
          </div>
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <UserCircle className="h-5 w-5 text-primary" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground text-sm truncate">{name}</p>
          {title && (
            <p className="text-xs text-muted-foreground truncate">{title}</p>
          )}
        </div>
        {availability && (
          <Badge
            variant={availability === "Available" ? "default" : "secondary"}
            className="shrink-0 text-xs"
          >
            {availability}
          </Badge>
        )}
      </div>

      {/* Specialization badges */}
      {specializations.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {specializations.map((s) => (
            <Badge key={s} variant="outline" className="text-xs">
              {s}
            </Badge>
          ))}
        </div>
      )}

      {/* Model badge */}
      {model && (
        <Badge variant="secondary" className="text-xs">
          {model}
        </Badge>
      )}

      {/* Meta row: rating + sessions */}
      {(rating !== undefined || sessionsCompleted !== undefined) && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          {rating !== undefined && (
            <span className="flex items-center gap-1">
              <Star className="h-3 w-3 fill-primary text-primary" />
              {rating}
            </span>
          )}
          {sessionsCompleted !== undefined && (
            <span>{sessionsCompleted} sessions</span>
          )}
        </div>
      )}

      {/* Action button */}
      {actionLabel && (
        <Button
          size="sm"
          variant="outline"
          className="w-full"
          onClick={onAction}
        >
          {actionLabel}
        </Button>
      )}
    </CardContent>
  </Card>
);

export default MentorCard;
