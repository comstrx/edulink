import { Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface EnrolledItemData {
  title: string;
  type: string;
  progress: number;
  duration: string;
}

interface EnrolledItemCardProps {
  item: EnrolledItemData;
}

const EnrolledItemCard = ({ item }: EnrolledItemCardProps) => (
  <Card className="border border-border">
    <CardContent className="p-4 space-y-2">
      <div className="flex items-start justify-between">
        <p className="font-medium text-foreground">{item.title}</p>
        <Badge variant="secondary" className="text-xs">{item.type}</Badge>
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{item.duration}</span>
        <span>{item.progress}% complete</span>
      </div>
    </CardContent>
  </Card>
);

export default EnrolledItemCard;
