import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface RecommendedMaterialItem {
  title: string;
  type: string;
  reason: string;
}

interface RecommendedMaterialCardProps {
  item: RecommendedMaterialItem;
}

const RecommendedMaterialCard = ({ item }: RecommendedMaterialCardProps) => (
  <Card className="border border-border hover:shadow-sm transition-shadow">
    <CardContent className="p-4 space-y-2">
      <Badge variant="outline" className="text-xs">{item.reason}</Badge>
      <p className="font-medium text-foreground">{item.title}</p>
      <Badge variant="secondary" className="text-xs">{item.type}</Badge>
    </CardContent>
  </Card>
);

export default RecommendedMaterialCard;
