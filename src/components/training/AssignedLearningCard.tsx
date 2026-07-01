import { Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface AssignedLearningItem {
  title: string;
  type: string;
  assignedBy: string;
  deadline: string;
}

interface AssignedLearningCardProps {
  item: AssignedLearningItem;
}

const AssignedLearningCard = ({ item }: AssignedLearningCardProps) => (
  <Card className="border border-border">
    <CardContent className="p-4 space-y-2">
      <div className="flex items-start justify-between">
        <p className="font-medium text-foreground">{item.title}</p>
        <Badge variant="outline" className="text-xs shrink-0">{item.type}</Badge>
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span>Assigned by {item.assignedBy}</span>
        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Due {item.deadline}</span>
      </div>
      <Button variant="link" size="sm" className="h-auto p-0 text-xs font-medium">Start Learning →</Button>
    </CardContent>
  </Card>
);

export default AssignedLearningCard;
