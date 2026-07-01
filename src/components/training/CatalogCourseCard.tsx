import { Star, Clock, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface CatalogCourseItem {
  id: string;
  title: string;
  provider: string;
  duration: string;
  category: string;
  enrolled: number;
  rating: number;
}

interface CatalogCourseCardProps {
  item: CatalogCourseItem;
}

/**
 * Course card for school training catalog.
 * Includes rating, enrolled count, and assign CTA.
 */
const CatalogCourseCard = ({ item }: CatalogCourseCardProps) => (
  <Card className="hover:shadow-md transition-shadow">
    <CardHeader className="pb-3">
      <div className="flex items-start justify-between">
        <Badge variant="secondary" className="text-xs">{item.category}</Badge>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Star className="h-3 w-3 fill-primary text-primary" /> {item.rating}
        </span>
      </div>
      <CardTitle className="text-base mt-2">{item.title}</CardTitle>
      <CardDescription>{item.provider}</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {item.duration}</span>
        <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {item.enrolled} enrolled</span>
      </div>
      <Button size="sm" className="w-full mt-3">Assign to Team</Button>
    </CardContent>
  </Card>
);

export default CatalogCourseCard;
