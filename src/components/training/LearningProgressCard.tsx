import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

export interface LearningProgressItem {
  title: string;
  type: string;
  progress: number;
  module: string;
  updated: string;
  executionId?: string;
}

interface LearningProgressCardProps {
  item: LearningProgressItem;
  onContinue?: (executionId: string) => void;
  isBusy?: boolean;
}

const LearningProgressCard = ({ item, onContinue, isBusy }: LearningProgressCardProps) => (
  <Card className="border border-border">
    <CardContent className="p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="font-medium text-foreground">{item.title}</p>
          <p className="text-xs text-muted-foreground">{item.module} · Updated {item.updated}</p>
        </div>
        <Badge variant="secondary" className="text-xs shrink-0">{item.type}</Badge>
      </div>
      <Progress value={item.progress} className="h-2" />
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {item.progress > 0 ? `${item.progress}% complete` : "Started"}
        </p>
        {item.executionId && onContinue && (
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-xs font-medium"
            disabled={isBusy}
            onClick={() => onContinue(item.executionId!)}
          >
            {isBusy ? "Continuing…" : "Continue →"}
          </Button>
        )}
      </div>
    </CardContent>
  </Card>
);

export default LearningProgressCard;
