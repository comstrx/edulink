import { Clock, Bookmark } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface SavedLearningItem {
  title: string;
  type: string;
  duration: string;
}

interface SavedLearningCardProps {
  item: SavedLearningItem;
}

const SavedLearningCard = ({ item }: SavedLearningCardProps) => (
  <Card className="border border-border">
    <CardContent className="p-4 flex items-center justify-between">
      <div className="space-y-1">
        <p className="font-medium text-foreground">{item.title}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className="text-xs">{item.type}</Badge>
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{item.duration}</span>
        </div>
      </div>
      <Bookmark className="h-4 w-4 text-primary" />
    </CardContent>
  </Card>
);

export default SavedLearningCard;
