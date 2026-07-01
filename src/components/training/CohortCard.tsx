import { UsersRound, CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export interface CohortItem {
  id: string;
  name: string;
  members: number;
  course: string;
  startDate: string;
  endDate: string;
  progress: number;
  status: string;
}

interface CohortCardProps {
  item: CohortItem;
}

const CohortCard = ({ item }: CohortCardProps) => (
  <Card className="hover:shadow-md transition-shadow">
    <CardHeader className="pb-2">
      <div className="flex items-start justify-between">
        <CardTitle className="text-base">{item.name}</CardTitle>
        <Badge variant={item.status === "active" ? "default" : "secondary"}>
          {item.status === "active" ? "Active" : "Completed"}
        </Badge>
      </div>
      <CardDescription>{item.course}</CardDescription>
    </CardHeader>
    <CardContent className="space-y-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><UsersRound className="h-3 w-3" /> {item.members} members</span>
        <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" /> {item.startDate} — {item.endDate}</span>
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">Progress</span>
          <span className="text-xs font-medium">{item.progress}%</span>
        </div>
        <Progress value={item.progress} className="h-2" />
      </div>
      <Button size="sm" variant="outline" className="w-full">View Cohort</Button>
    </CardContent>
  </Card>
);

export default CohortCard;
