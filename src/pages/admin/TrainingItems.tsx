import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, BookOpen, Loader2 } from "lucide-react";

const TrainingItems = () => {
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const { data: items, isLoading } = useQuery({
    queryKey: ["admin_training_items", typeFilter],
    queryFn: async () => {
      let query = supabase
        .from("training_items")
        .select("id, title, slug, type, status, is_active, duration, duration_hours, credential_eligible, micro_assessment, cri_boost_value, created_at")
        .order("created_at", { ascending: false })
        .limit(100);

      if (typeFilter !== "all") {
        query = query.eq("type", typeFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Training Items</h1>
          <p className="text-sm text-muted-foreground">Manage courses, packages, and pathways</p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link to="/admin/training/new/course">
              <Plus className="h-4 w-4 mr-2" />
              New Course
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/admin/training/new/package">
              <Plus className="h-4 w-4 mr-2" />
              New Package
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/admin/training/new/pathway">
              <Plus className="h-4 w-4 mr-2" />
              New Pathway
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        {["all", "course", "package", "pathway"].map((t) => (
          <Badge
            key={t}
            variant={typeFilter === t ? "default" : "outline"}
            className="cursor-pointer capitalize"
            onClick={() => setTypeFilter(t)}
          >
            {t === "all" ? "All Types" : t}
          </Badge>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !items?.length ? (
        <Card>
          <CardContent className="py-16 text-center space-y-3">
            <BookOpen className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">No training items found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <Card key={item.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-foreground">{item.title}</span>
                    <Badge variant="secondary" className="text-[10px] capitalize">{item.type}</Badge>
                    <Badge variant={item.status === "published" ? "default" : "outline"} className="text-[10px] capitalize">
                      {item.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {item.duration && <span>{item.duration}</span>}
                    {item.duration_hours && <span>{item.duration_hours}h</span>}
                    {item.credential_eligible && <Badge variant="secondary" className="text-[10px]">Credential</Badge>}
                    {item.micro_assessment && <Badge variant="secondary" className="text-[10px]">Assessment</Badge>}
                    {item.cri_boost_value != null && <span>CRI: {item.cri_boost_value}</span>}
                  </div>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link to={`/admin/training/${item.id}/edit`}>Edit</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default TrainingItems;
