import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface TrainingCourseItem {
  id: string;
  title: string;
  duration: string;
  competencyTags: string[];
  certification: string | null;
  slug?: string;
  providerName?: string | null;
  providerSlug?: string | null;
  providerLogoUrl?: string | null;
}

interface TrainingCourseCardProps {
  item: TrainingCourseItem;
  /** Context-specific metadata (e.g. CRI boost, team impact) */
  meta?: React.ReactNode;
  /** Context-specific actions (e.g. login CTA, enroll button) */
  actions?: React.ReactNode;
}

/**
 * Shared course card for public training surfaces.
 * Context-aware CTAs and metadata are passed via slots.
 */
const TrainingCourseCard = ({ item, meta, actions }: TrainingCourseCardProps) => (
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-base">
        {item.slug ? (
          <Link to={`/training/${item.slug}`} className="hover:underline">{item.title}</Link>
        ) : (
          item.title
        )}
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-3">
      <p className="text-sm text-muted-foreground">Duration: {item.duration}</p>
      {item.providerName && (
        <div className="flex items-center gap-2">
          {item.providerLogoUrl ? (
            <img src={item.providerLogoUrl} alt="" className="h-4 w-4 rounded object-cover" />
          ) : null}
          <span className="text-xs text-muted-foreground">
            by{" "}
            {item.providerSlug ? (
              <Link to={`/providers/${item.providerSlug}`} className="text-primary hover:underline">
                {item.providerName}
              </Link>
            ) : (
              item.providerName
            )}
          </span>
        </div>
      )}
      <div className="flex flex-wrap gap-1">
        {item.competencyTags.map((tag) => (
          <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
        ))}
        {item.certification && (
          <Badge className="text-xs">{item.certification}</Badge>
        )}
      </div>
      {meta}
      {actions && <div>{actions}</div>}
    </CardContent>
  </Card>
);

export default TrainingCourseCard;
