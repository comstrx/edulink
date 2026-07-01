import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import SchoolTrainingSubNav from "@/components/training/SchoolTrainingSubNav";
import SchoolBreadcrumb from "@/components/school/SchoolBreadcrumb";
import TrainingHeader from "@/components/training/TrainingHeader";
import TrainingCatalogSkeleton from "@/components/training/TrainingCatalogSkeleton";
import TrainingResultsHeader from "@/components/training/TrainingResultsHeader";
import SearchPagination from "@/components/discovery/SearchPagination";
import FilterChipBar from "@/components/filters/FilterChipBar";
import TaxonomySingleSelect from "@/components/taxonomy/TaxonomySingleSelect";
import TaxonomyMultiSelect from "@/components/taxonomy/TaxonomyMultiSelect";
import { BookOpen, Target, Award, Clock, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useTrainingSearch, TRAINING_SORT_OPTIONS, type TrainingSearchItem } from "@/hooks/useTrainingSearch";
import { useFilterChipBuilder } from "@/hooks/useFilterChipBuilder";
import { useAssignableTeachers, useCreateAssignment } from "@/hooks/useTrainingAssignments";
import { useTaxonomyNames } from "@/hooks/useTaxonomyNames";
import { toast } from "sonner";

const TrainingCatalog = () => {
  const [activeTab, setActiveTab] = useState<string>("all");
  const [assignItem, setAssignItem] = useState<TrainingSearchItem | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");

  // Exclude packages: only course/pathway tabs
  const typeFilter = activeTab === "all" ? undefined : (activeTab as "course" | "pathway");

  const engine = useTrainingSearch({ type: typeFilter, pageSize: 6 });
  const { data: teachers, isLoading: teachersLoading } = useAssignableTeachers();
  const createMutation = useCreateAssignment();

  // Filter out packages from results
  const filteredResults = useMemo(
    () => engine.results.filter((item) => item.type !== "package"),
    [engine.results]
  );

  // Collect all competency/skill term IDs for batch resolution
  const taxonomyIds = useMemo(() => {
    const ids = new Set<string>();
    filteredResults.forEach((item) => {
      item.competency_domain_term_ids?.forEach((id) => ids.add(id));
      item.skill_term_ids?.forEach((id) => ids.add(id));
    });
    return Array.from(ids);
  }, [filteredResults]);

  const { data: taxonomyMap } = useTaxonomyNames(taxonomyIds);

  // Filter chips
  const allFilterIds = [
    engine.filters.competencyDomainId,
    engine.filters.gradeBandId,
    engine.filters.curriculumId,
    engine.filters.subjectId,
    engine.filters.learningFormatId,
    engine.filters.trainingLevelId,
    ...engine.filters.skills,
  ].filter(Boolean);

  const { singleChip, arrayChips } = useFilterChipBuilder(allFilterIds);

  const chips = [
    singleChip(engine.filters.competencyDomainId, { competencyDomainId: "" }, engine.filters, engine.updateFilters),
    singleChip(engine.filters.curriculumId, { curriculumId: "" }, engine.filters, engine.updateFilters),
    singleChip(engine.filters.subjectId, { subjectId: "" }, engine.filters, engine.updateFilters),
    singleChip(engine.filters.gradeBandId, { gradeBandId: "" }, engine.filters, engine.updateFilters),
    ...arrayChips(engine.filters.skills, "skills", engine.filters, engine.updateFilters),
    singleChip(engine.filters.learningFormatId, { learningFormatId: "" }, engine.filters, engine.updateFilters),
    singleChip(engine.filters.trainingLevelId, { trainingLevelId: "" }, engine.filters, engine.updateFilters),
  ].filter(Boolean) as { label: string; onRemove: () => void }[];

  // Assignment dialog handlers
  const handleAssign = (item: TrainingSearchItem) => {
    setAssignItem(item);
    setSelectedTeacherId("");
    setDueDate("");
    setNotes("");
  };

  const handleSubmitAssignment = async () => {
    if (!assignItem || !selectedTeacherId) return;
    try {
      await createMutation.mutateAsync({
        assigned_item_id: assignItem.id,
        assigned_item_type: assignItem.type as "course" | "pathway",
        assigned_to_teacher_id: selectedTeacherId,
        due_date: dueDate || null,
        notes: notes || null,
      });
      toast.success("Training assigned successfully");
      setAssignItem(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create assignment";
      toast.error(message);
    }
  };

  return (
    <>
      <SchoolTrainingSubNav />
      <div className="space-y-6 px-4 sm:px-6 py-6 max-w-6xl mx-auto">
        <SchoolBreadcrumb items={[{ label: "Training", to: "/app/school/training/overview" }, { label: "Catalog" }]} />
        <TrainingHeader
          title="Training Catalog"
          icon={BookOpen}
          description="Browse and assign courses and pathways to your team"
          rootTo="/app/school/training/overview"
        />

        <div className="grid lg:grid-cols-[260px_1fr] gap-8">
          {/* Sidebar filters */}
          <aside className="space-y-4">
            <TaxonomySingleSelect domainKey="competency_domains" value={engine.filters.competencyDomainId} onChange={(v) => engine.updateFilters({ competencyDomainId: v })} label="Competency Domain" />
            <TaxonomyMultiSelect domainKey="skills" values={engine.filters.skills} onChange={(v) => engine.updateFilters({ skills: v })} label="Skills" />
            <TaxonomySingleSelect domainKey="curriculums" value={engine.filters.curriculumId} onChange={(v) => engine.updateFilters({ curriculumId: v })} label="Curriculum" />
            <TaxonomySingleSelect domainKey="subjects" value={engine.filters.subjectId} onChange={(v) => engine.updateFilters({ subjectId: v })} label="Subject" />
            <TaxonomySingleSelect domainKey="grade_bands" value={engine.filters.gradeBandId} onChange={(v) => engine.updateFilters({ gradeBandId: v })} label="Grade Band" />
            <TaxonomySingleSelect domainKey="learning_formats" value={engine.filters.learningFormatId} onChange={(v) => engine.updateFilters({ learningFormatId: v })} label="Learning Format" />
            <TaxonomySingleSelect domainKey="training_levels" value={engine.filters.trainingLevelId} onChange={(v) => engine.updateFilters({ trainingLevelId: v })} label="Training Level" />
            <Button variant="outline" size="sm" className="w-full" onClick={engine.resetFilters}>Reset Filters</Button>
          </aside>

          {/* Results */}
          <section className="space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="course">Courses</TabsTrigger>
                <TabsTrigger value="pathway">Pathways</TabsTrigger>
              </TabsList>
            </Tabs>

            <TrainingResultsHeader
              totalCount={engine.totalCount}
              currentPage={engine.currentPage}
              pageSize={engine.pageSize}
              searchQuery={engine.searchQuery}
              sortBy={engine.sortBy}
              sortOptions={TRAINING_SORT_OPTIONS}
              onSearchChange={engine.setSearchQuery}
              onSortChange={engine.setSortBy}
              itemLabel="items"
            />

            <FilterChipBar chips={chips} onClearAll={engine.resetFilters} clearLabel="Clear all" />

            {engine.isLoading ? (
              <TrainingCatalogSkeleton count={6} variant="course" />
            ) : filteredResults.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center space-y-3">
                  <BookOpen className="h-10 w-10 mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground">No training items found</p>
                  <Button variant="outline" size="sm" onClick={engine.resetFilters}>Reset Filters</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredResults.map((item) => {
                  const competencyNames = (item.competency_domain_term_ids ?? [])
                    .map((id) => taxonomyMap?.[id])
                    .filter(Boolean);
                  const skillNames = (item.skill_term_ids ?? [])
                    .map((id) => taxonomyMap?.[id])
                    .filter(Boolean);

                  return (
                    <Card key={item.id} className="hover:shadow-md transition-shadow flex flex-col">
                      <CardContent className="p-5 space-y-3 flex-1 flex flex-col">
                        {/* Header badges */}
                        <div className="flex items-start justify-between gap-2">
                          <Badge variant="secondary" className="text-xs capitalize">{item.type}</Badge>
                          <div className="flex gap-1">
                            {item.credential_eligible && (
                              <Badge variant="outline" className="text-[10px] gap-0.5">
                                <Award className="h-2.5 w-2.5" /> Credential
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Title + description */}
                        <Link to={`/training/${item.slug}`} className="hover:underline">
                          <p className="font-semibold text-foreground text-sm">{item.title}</p>
                        </Link>
                        <p className="text-xs text-muted-foreground line-clamp-2 flex-1">{item.short_description}</p>

                        {/* Metadata row */}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                          {item.duration && (
                            <span className="flex items-center gap-0.5">
                              <Clock className="h-3 w-3" /> {item.duration}
                            </span>
                          )}
                          {item.training_level_name && (
                            <Badge variant="outline" className="text-[10px]">{item.training_level_name}</Badge>
                          )}
                          {item.type === "pathway" && item.cri_target != null && (
                            <span className="flex items-center gap-0.5 text-primary font-medium">
                              <Target className="h-3 w-3" /> CRI {item.cri_target}
                            </span>
                          )}
                        </div>

                        {/* Competency & skill tags */}
                        {(competencyNames.length > 0 || skillNames.length > 0) && (
                          <div className="flex flex-wrap gap-1">
                            {competencyNames.slice(0, 2).map((name) => (
                              <Badge key={name} variant="secondary" className="text-[10px]">{name}</Badge>
                            ))}
                            {skillNames.slice(0, 2).map((name) => (
                              <Badge key={name} variant="outline" className="text-[10px]">{name}</Badge>
                            ))}
                            {competencyNames.length + skillNames.length > 4 && (
                              <Badge variant="outline" className="text-[10px]">+{competencyNames.length + skillNames.length - 4}</Badge>
                            )}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 pt-1">
                          <Button size="sm" className="flex-1" onClick={() => handleAssign(item)}>
                            Assign
                          </Button>
                          <Button size="sm" variant="outline" asChild>
                            <Link to={`/training/${item.slug}`}>
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            <SearchPagination
              currentPage={engine.currentPage}
              totalPages={engine.totalPages}
              isLoading={engine.isLoading}
              onPageChange={engine.setPage}
            />
          </section>
        </div>
      </div>

      {/* Assign Dialog */}
      <Dialog open={!!assignItem} onOpenChange={(open) => !open && setAssignItem(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Assign Training</DialogTitle>
          </DialogHeader>

          {assignItem && (
            <div className="space-y-4 py-2">
              {/* Selected item preview */}
              <div className="rounded-md border p-3 space-y-1 bg-muted/30">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs capitalize">{assignItem.type}</Badge>
                  {assignItem.credential_eligible && <Badge variant="outline" className="text-[10px]">Credential</Badge>}
                </div>
                <p className="font-medium text-sm">{assignItem.title}</p>
                {assignItem.duration && <p className="text-xs text-muted-foreground">{assignItem.duration}</p>}
              </div>

              {/* Teacher selector */}
              <div className="space-y-2">
                <Label>Assign To</Label>
                <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
                  <SelectTrigger>
                    <SelectValue placeholder={teachersLoading ? "Loading..." : "Select a teacher"} />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers?.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {teachers?.length === 0 && !teachersLoading && (
                  <p className="text-xs text-destructive">No team members found. Add teachers to your team first.</p>
                )}
              </div>

              {/* Due date */}
              <div className="space-y-2">
                <Label>Due Date (optional)</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add context for the teacher..."
                  rows={2}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignItem(null)}>Cancel</Button>
            <Button
              onClick={handleSubmitAssignment}
              disabled={!selectedTeacherId || createMutation.isPending}
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TrainingCatalog;
