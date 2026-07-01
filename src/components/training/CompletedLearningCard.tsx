import { CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface CompletedLearningItem {
  title: string;
  type: string;
  completedDate: string;
  credential: string | null;
}

interface CompletedLearningCardProps {
  item: CompletedLearningItem;
}

const CompletedLearningCard = ({ item }: CompletedLearningCardProps) => (
  <Card className="border border-border bg-muted/20">
    <CardContent className="p-4 flex items-center justify-between">
      <div className="space-y-1">
        <p className="font-medium text-foreground">{item.title}</p>
        <p className="text-xs text-muted-foreground">Completed {item.completedDate}</p>
      </div>
      <div className="flex items-center gap-2">
        {item.credential && <Badge variant="secondary" className="text-xs">{item.credential}</Badge>}
        <CheckCircle2 className="h-4 w-4 text-primary" />
      </div>
    </CardContent>
  </Card>
);

export default CompletedLearningCard;
