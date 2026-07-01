import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Milestone, BookOpen, MessageSquare } from "lucide-react";
import type { TrainingPathwayItem, PathwayMilestone, PathwayReflectionPrompt } from "@/lib/training/training-item-types";

interface PathwayMilestonesTabProps {
  item: TrainingPathwayItem;
  courseMap: Record<string, { title: string; slug: string }>;
}

const PathwayMilestonesTab = ({ item, courseMap }: PathwayMilestonesTabProps) => {
  const sorted = [...item.milestones].sort((a, b) => a.order - b.order);

  // Group reflection prompts by stage_id
  const promptsByStage = item.reflection_prompts.reduce<Record<string, PathwayReflectionPrompt[]>>(
    (acc, p) => {
      const key = p.stage_id ?? "__unlinked";
      if (!acc[key]) acc[key] = [];
      acc[key].push(p);
      return acc;
    },
    {}
  );

  if (sorted.length === 0) {
    return (
      <div className="text-center py-12">
        <Milestone className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No milestones defined for this pathway yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-foreground">Journey Milestones</h2>

      <div className="relative space-y-0">
        {sorted.map((ms, idx) => {
          const stagePrompts = promptsByStage[ms.id] ?? [];
          const linkedCourses = (ms.linked_course_ids ?? [])
            .map((id) => courseMap[id])
            .filter(Boolean);

          return (
            <div key={ms.id} className="relative pl-8 pb-8 last:pb-0">
              {/* Timeline line */}
              {idx < sorted.length - 1 && (
                <div className="absolute left-[13px] top-8 bottom-0 w-px bg-border" />
              )}
              {/* Timeline dot */}
              <div className="absolute left-0 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                {ms.order}
              </div>

              <Card>
                <CardContent className="pt-5 space-y-3">
                  <h3 className="font-semibold text-foreground">{ms.title}</h3>
                  {ms.description && (
                    <p className="text-sm text-muted-foreground">{ms.description}</p>
                  )}

                  {/* Linked courses */}
                  {linkedCourses.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Linked Courses</p>
                      <div className="flex flex-wrap gap-2">
                        {linkedCourses.map((c) => (
                          <Badge key={c.slug} variant="secondary" className="gap-1 text-xs">
                            <BookOpen className="h-3 w-3" /> {c.title}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Reflection prompts for this milestone */}
                  {stagePrompts.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" /> Reflection Prompts
                      </p>
                      <ul className="space-y-1.5">
                        {stagePrompts
                          .sort((a, b) => a.order - b.order)
                          .map((p) => (
                            <li
                              key={p.id}
                              className="text-sm text-muted-foreground bg-muted/50 rounded-md px-3 py-2 italic"
                            >
                              "{p.prompt}"
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>

      {/* Unlinked reflection prompts */}
      {promptsByStage["__unlinked"]?.length > 0 && (
        <div className="space-y-3 pt-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" /> General Reflection Prompts
          </h3>
          <ul className="space-y-2">
            {promptsByStage["__unlinked"]
              .sort((a, b) => a.order - b.order)
              .map((p) => (
                <li
                  key={p.id}
                  className="text-sm text-muted-foreground bg-muted/50 rounded-lg px-4 py-3 italic"
                >
                  "{p.prompt}"
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default PathwayMilestonesTab;
