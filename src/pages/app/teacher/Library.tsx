import {
  Library as LibraryIcon, Bookmark, BookOpen, Building2, Loader2, Trash2,
} from "lucide-react";
import TrainingSubNav from "@/components/training/TrainingSubNav";
import TrainingHeader from "@/components/training/TrainingHeader";
import TrainingEmptyState from "@/components/training/TrainingEmptyState";
import EnrolledItemCard from "@/components/training/EnrolledItemCard";
import RecommendedMaterialCard from "@/components/training/RecommendedMaterialCard";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import type { RecommendedMaterialItem } from "@/components/training/RecommendedMaterialCard";

import { useSavedTrainingItems, useUnsaveTrainingItem } from "@/hooks/useSavedTrainingItems";
import { useTeacherEnrollments } from "@/hooks/useTrainingEnrollments";
import { useTeacherAssignments } from "@/hooks/useTrainingAssignments";
import { toast } from "sonner";

const Library = () => {
  const { data: savedItems, isLoading: savedLoading } = useSavedTrainingItems();
  const { data: enrollments, isLoading: enrollLoading } = useTeacherEnrollments();
  const { data: assignments, isLoading: assignLoading } = useTeacherAssignments();
  const unsaveMutation = useUnsaveTrainingItem();

  const isLoading = savedLoading || enrollLoading || assignLoading;

  const activeEnrollments = (enrollments ?? []).filter((e) => e.status !== "cancelled" && e.status !== "dropped" && e.status !== "completed");
  const activeAssignments = (assignments ?? []).filter((a) => a.status !== "cancelled");

  const handleUnsave = async (itemId: string) => {
    try {
      await unsaveMutation.mutateAsync(itemId);
      toast.success("Item removed from saved");
    } catch {
      toast.error("Failed to remove item");
    }
  };

  if (isLoading) {
    return (
      <div>
        <TrainingSubNav />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <TrainingSubNav />
      <div className="px-4 sm:px-6 py-6 space-y-6 max-w-5xl mx-auto">
        <TrainingHeader
          title="Library"
          icon={LibraryIcon}
          description="Your personal collection of learning resources, enrolled content, and assignments."
          rootTo="/app/teacher/training"
        />

        <Tabs defaultValue="saved" className="w-full">
          <TabsList className="w-full max-w-xl flex overflow-x-auto scrollbar-hide">
            <TabsTrigger value="saved">Saved ({(savedItems ?? []).length})</TabsTrigger>
            <TabsTrigger value="enrolled">Enrolled ({activeEnrollments.length})</TabsTrigger>
            <TabsTrigger value="assigned">School Assigned ({activeAssignments.length})</TabsTrigger>
          </TabsList>

          {/* Saved */}
          <TabsContent value="saved" className="mt-6">
            {(savedItems ?? []).length > 0 ? (
              <div className="space-y-3">
                {savedItems!.map((item) => (
                  <Card key={item.id} className="border border-border">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">{item.item_title}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-xs capitalize">{item.item_type}</Badge>
                          <span>Saved {new Date(item.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleUnsave(item.training_item_id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <TrainingEmptyState icon={Bookmark} message="No saved resources" hint="Bookmark courses and pathways to find them here." />
            )}
          </TabsContent>

          {/* Enrolled */}
          <TabsContent value="enrolled" className="mt-6">
            {activeEnrollments.length > 0 ? (
              <div className="space-y-3">
                {activeEnrollments.map((e) => (
                  <Card key={e.id} className="border border-border">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">{e.item_title ?? "Training Item"}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-xs capitalize">{e.item_type}</Badge>
                          <Badge variant="secondary" className="text-xs capitalize">{e.status}</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <TrainingEmptyState icon={BookOpen} message="Not enrolled in any content" hint="Browse the training catalog to get started." />
            )}
          </TabsContent>

          {/* School Assigned */}
          <TabsContent value="assigned" className="mt-6">
            {activeAssignments.length > 0 ? (
              <div className="space-y-3">
                {activeAssignments.map((a) => (
                  <Card key={a.id} className="border border-border">
                    <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">{a.item_title}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-xs capitalize">{a.assigned_item_type}</Badge>
                          <Badge variant="secondary" className="text-xs capitalize">{a.status}</Badge>
                        </div>
                      </div>
                      <div className="sm:text-right">
                        <p className="text-xs text-muted-foreground">
                          {a.due_date ? `Due ${new Date(a.due_date).toLocaleDateString()}` : "No deadline"}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <TrainingEmptyState icon={Building2} message="No school assignments" hint="Your school hasn't assigned any training yet." />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Library;
