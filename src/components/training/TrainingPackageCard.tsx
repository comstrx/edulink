import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface TrainingPackageItem {
  id: string;
  title: string;
  coursesCount: number;
  price: string;
  segment: string;
  bestFor: string;
}

interface TrainingPackageCardProps {
  item: TrainingPackageItem;
  /** Context-specific pricing/plan info */
  meta?: React.ReactNode;
  /** Context-specific CTAs */
  actions?: React.ReactNode;
  /** Translated labels */
  labels: {
    includes: string;
    courses: string;
    bestFor: string;
  };
}

const TrainingPackageCard = ({ item, meta, actions, labels }: TrainingPackageCardProps) => (
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-base">{item.title}</CardTitle>
    </CardHeader>
    <CardContent className="space-y-3">
      <p className="text-sm text-muted-foreground">{labels.includes} {item.coursesCount} {labels.courses}</p>
      {meta}
      <Badge variant="secondary" className="text-xs">{item.segment}</Badge>
      <p className="text-xs text-muted-foreground">{labels.bestFor} {item.bestFor}</p>
      {actions && <div>{actions}</div>}
    </CardContent>
  </Card>
);

export default TrainingPackageCard;
