import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import SchoolTrainingSubNav from "@/components/training/SchoolTrainingSubNav";
import SchoolBreadcrumb from "@/components/school/SchoolBreadcrumb";
import TrainingHeader from "@/components/training/TrainingHeader";
import TrainingEmptyState from "@/components/training/TrainingEmptyState";
import TrainingSection from "@/components/training/TrainingSection";
import { Library as LibraryIcon, BookOpen, Search, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * School Library — Shows library/resource/guide/template/toolkit items
 * from the training catalog. No mock data.
 */
const SchoolLibrary = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState("");

  const { data: resources, isLoading } = useQuery({
    queryKey: ["school-library-resources"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_items")
        .select("id, title, type, status, created_at")
        .in("type", ["library", "resource", "guide", "template", "toolkit"])
        .eq("status", "published")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    if (!resources) return [];
    if (!search.trim()) return resources;
    const q = search.toLowerCase();
    return resources.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q)
    );
  }, [resources, search]);

  const typeLabel = (t: string) => {
    const map: Record<string, string> = {
      library: "Library",
      resource: "Resource",
      guide: "Guide",
      template: "Template",
      toolkit: "Toolkit",
    };
    return map[t] ?? t;
  };

  if (isLoading) {
    return (
      <>
        <SchoolTrainingSubNav />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  return (
    <>
      <SchoolTrainingSubNav />
      <div className="space-y-6 px-4 sm:px-6 py-6 max-w-6xl mx-auto">
        <SchoolBreadcrumb items={[{ label: "Training", to: "/app/school/training/overview" }, { label: "Library" }]} />
        <TrainingHeader
          title="School Library"
          icon={LibraryIcon}
          description="Curated resources and materials for your team"
          rootTo="/app/school/training/overview"
        />

        {/* Search */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search resources…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {filtered.length === 0 && !search ? (
          <TrainingEmptyState
            icon={LibraryIcon}
            message="No library resources yet"
            hint="Library items (resources, guides, templates, toolkits) will appear here once published in the training catalog."
          />
        ) : filtered.length === 0 ? (
          <TrainingEmptyState
            icon={Search}
            message="No results found"
            hint={`No resources matching "${search}". Try a different search term.`}
          />
        ) : (
          <TrainingSection title={`Resources (${filtered.length})`}>
            <div className="space-y-2">
              {filtered.map((r) => (
                <Card key={r.id}>
                  <CardContent className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{r.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {typeLabel(r.type)}
                          {" · Added "}
                          {new Date(r.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {typeLabel(r.type)}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TrainingSection>
        )}
      </div>
    </>
  );
};

export default SchoolLibrary;
