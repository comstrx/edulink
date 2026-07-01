import { Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  TrainingPathwayCard,
  PathwayBadgeRow,
  PathwayDescription,
} from "./TrainingPathwayCard";

export interface ActivePathwayItem {
  title: string;
  description: string;
  progress: number;
  stepsComplete: number;
  stepsTotal: number;
  duration: string;
  credential: string;
  slug?: string;
}

interface ActivePathwayCardProps {
  item: ActivePathwayItem;
}

const ActivePathwayCard = ({ item }: ActivePathwayCardProps) => (
  <TrainingPathwayCard className="border border-border">
    <PathwayBadgeRow>
      <div className="space-y-1">
        <p className="font-semibold text-foreground">{item.title}</p>
        <PathwayDescription>{item.description}</PathwayDescription>
      </div>
      <Badge variant="secondary" className="text-xs shrink-0">
        {item.credential}
      </Badge>
    </PathwayBadgeRow>
    <Progress value={item.progress} className="h-2" />
    <div className="flex items-center justify-between text-xs text-muted-foreground">
      <span>
        {item.stepsComplete} of {item.stepsTotal} steps · {item.progress}%
      </span>
      <span className="flex items-center gap-1">
        <Clock className="h-3 w-3" />
        {item.duration}
      </span>
    </div>
    <Button variant="link" size="sm" className="h-auto p-0 text-xs font-medium" asChild>
      <Link to={item.slug ? `/training/${item.slug}` : "/app/teacher/training"}>Continue Pathway →</Link>
    </Button>
  </TrainingPathwayCard>
);

export default ActivePathwayCard;
