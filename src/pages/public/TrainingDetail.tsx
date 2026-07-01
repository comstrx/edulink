import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { useTrainingItemDetail } from "@/hooks/useTrainingItemDetail";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import TrainingDetailHero from "@/components/training/detail/TrainingDetailHero";
import TrainingDetailMeta from "@/components/training/detail/TrainingDetailMeta";
import TrainingOverviewTab from "@/components/training/detail/TrainingOverviewTab";
import TrainingPrerequisitesTab from "@/components/training/detail/TrainingPrerequisitesTab";
import PathwayMilestonesTab from "@/components/training/detail/PathwayMilestonesTab";
import { isPathwayItem } from "@/components/training/detail/training-detail-data";
import type { TrainingPathwayItem } from "@/lib/training/training-item-types";

const TrainingDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: item, isLoading, error } = useTrainingItemDetail(slug);

  // Fetch course titles for pathway milestone rendering
  const courseIds = item && isPathwayItem(item) ? item.required_course_ids : [];
  const { data: courses } = useQuery({
    queryKey: ["pathway_courses_map", courseIds],
    queryFn: async () => {
      if (courseIds.length === 0) return [];
      const { data, error } = await supabase
        .from("training_items")
        .select("id, title, slug")
        .in("id", courseIds);
      if (error) throw error;
      return data ?? [];
    },
    enabled: courseIds.length > 0,
  });

  const courseMap = (courses ?? []).reduce<Record<string, { title: string; slug: string }>>(
    (acc, c) => {
      acc[c.id] = { title: c.title, slug: c.slug };
      return acc;
    },
    {}
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-16 text-center space-y-4">
        <h1 className="text-3xl font-bold text-foreground">Training Not Found</h1>
        <p className="text-muted-foreground">
          The training item you're looking for doesn't exist yet or the URL may be incorrect.
        </p>
        <Button asChild>
          <Link to="/training/courses">Browse Catalog</Link>
        </Button>
      </div>
    );
  }

  const isPathway = isPathwayItem(item);

  return (
    <div className="space-y-12 pb-16">
      <TrainingDetailHero item={item} />

      <div className="max-w-5xl mx-auto px-6 space-y-10">
        <TrainingDetailMeta item={item} />

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="w-full justify-start bg-muted/50">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            {isPathway && <TabsTrigger value="milestones">Milestones</TabsTrigger>}
            <TabsTrigger value="prerequisites">
              {isPathway ? "Required Courses" : "Prerequisites"}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <TrainingOverviewTab item={item} />
          </TabsContent>
          {isPathway && (
            <TabsContent value="milestones">
              <PathwayMilestonesTab
                item={item as TrainingPathwayItem}
                courseMap={courseMap}
              />
            </TabsContent>
          )}
          <TabsContent value="prerequisites">
            <TrainingPrerequisitesTab item={item} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default TrainingDetail;
