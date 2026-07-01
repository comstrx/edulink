import { Clock, Briefcase } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrainingPathwayCard,
  PathwayBadgeRow,
  PathwayTitle,
  PathwayDescription,
} from "./TrainingPathwayCard";

export interface CareerPathwayItem {
  title: string;
  description: string;
  duration: string;
  steps: number;
  credential: string;
  role: string;
}

interface CareerPathwayCardProps {
  item: CareerPathwayItem;
}

const CareerPathwayCard = ({ item }: CareerPathwayCardProps) => (
  <TrainingPathwayCard className="border border-border hover:shadow-sm transition-shadow">
    <PathwayBadgeRow>
      <Badge variant="outline" className="text-xs flex items-center gap-1">
        <Briefcase className="h-3 w-3" />
        {item.role}
      </Badge>
      <Badge variant="secondary" className="text-xs">{item.credential}</Badge>
    </PathwayBadgeRow>
    <PathwayTitle>{item.title}</PathwayTitle>
    <PathwayDescription>{item.description}</PathwayDescription>
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      <span className="flex items-center gap-1">
        <Clock className="h-3 w-3" />
        {item.duration}
      </span>
      <span>{item.steps} steps</span>
    </div>
    <Button variant="link" size="sm" className="h-auto p-0 text-xs font-medium">
      Explore Pathway →
    </Button>
  </TrainingPathwayCard>
);

export default CareerPathwayCard;
