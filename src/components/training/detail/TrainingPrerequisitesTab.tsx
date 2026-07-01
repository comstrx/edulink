import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, BookOpen, ArrowRight, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { type TrainingDetailItem, isPathwayItem } from "./training-detail-data";

interface TrainingPrerequisitesTabProps {
  item: TrainingDetailItem;
}

const TrainingPrerequisitesTab = ({ item }: TrainingPrerequisitesTabProps) => {
  const courseIds = isPathwayItem(item) ? item.required_course_ids : [];

  const { data: courses, isLoading } = useQuery({
    queryKey: ["prerequisite_courses", courseIds],
    queryFn: async () => {
      if (courseIds.length === 0) return [];
      const { data, error } = await supabase
        .from("training_items")
        .select("id, title, slug, type, duration, short_description")
        .in("id", courseIds)
        .eq("type", "course");
      if (error) throw error;
      return data ?? [];
    },
    enabled: courseIds.length > 0,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasCourses = courses && courses.length > 0;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-foreground">
        {isPathwayItem(item) ? "Required Courses" : "Prerequisites"}
      </h2>

      {!hasCourses ? (
        <Card>
          <CardContent className="pt-6 text-center space-y-2">
            <CheckCircle className="h-8 w-8 text-primary mx-auto" />
            <p className="text-sm font-medium text-foreground">No prerequisites</p>
            <p className="text-xs text-muted-foreground">
              This {item.type} is open to all learners — no prior training is required.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {courses.map((course) => (
            <Link
              key={course.id}
              to={`/training/${course.slug}`}
              className="flex items-center justify-between rounded-lg border border-border bg-card p-4 hover:bg-muted/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <BookOpen className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{course.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Course{course.duration ? ` · ${course.duration}` : ""}
                  </p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default TrainingPrerequisitesTab;
