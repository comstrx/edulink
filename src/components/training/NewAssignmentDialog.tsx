import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Clock, Award, Target } from "lucide-react";
import { useAssignableItems, useAssignableTeachers, useCreateAssignment } from "@/hooks/useTrainingAssignments";
import { toast } from "sonner";

interface NewAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NewAssignmentDialog = ({ open, onOpenChange }: NewAssignmentDialogProps) => {
  const { data: items, isLoading: itemsLoading } = useAssignableItems();
  const { data: teachers, isLoading: teachersLoading } = useAssignableTeachers();
  const createMutation = useCreateAssignment();

  const [selectedItemId, setSelectedItemId] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");

  const selectedItem = items?.find((i) => i.id === selectedItemId);

  const handleSubmit = async () => {
    if (!selectedItemId || !selectedTeacherId || !selectedItem) return;

    try {
      await createMutation.mutateAsync({
        assigned_item_id: selectedItemId,
        assigned_item_type: selectedItem.type as "course" | "pathway",
        assigned_to_teacher_id: selectedTeacherId,
        due_date: dueDate || null,
        notes: notes || null,
      });
      toast.success("Training assigned successfully");
      onOpenChange(false);
      setSelectedItemId("");
      setSelectedTeacherId("");
      setDueDate("");
      setNotes("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create assignment";
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Training Assignment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Training item selector */}
          <div className="space-y-2">
            <Label>Training Item</Label>
            <Select value={selectedItemId} onValueChange={setSelectedItemId}>
              <SelectTrigger>
                <SelectValue placeholder={itemsLoading ? "Loading..." : "Select a course or pathway"} />
              </SelectTrigger>
              <SelectContent>
                {items?.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    <div className="flex items-center gap-2">
                      <span>{item.title}</span>
                      <Badge variant="outline" className="text-[10px] capitalize">{item.type}</Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Selected item detail panel */}
            {selectedItem && (
              <div className="rounded-md border border-border bg-muted/50 p-3 space-y-2 text-sm">
                <div className="flex items-center gap-4 text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Badge variant="outline" className="text-[10px] capitalize">{selectedItem.type}</Badge>
                  </span>
                  {selectedItem.duration && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {selectedItem.duration}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Award className="h-3 w-3" />
                    {selectedItem.credential_eligible ? "Certificate eligible" : "No certificate"}
                  </span>
                  {selectedItem.type === "pathway" && selectedItem.cri_target != null && (
                    <span className="flex items-center gap-1">
                      <Target className="h-3 w-3" />
                      CRI Target: {selectedItem.cri_target}
                    </span>
                  )}
                </div>
                {"_competencyNames" in selectedItem && Array.isArray((selectedItem as Record<string, unknown>)._competencyNames) && ((selectedItem as Record<string, unknown>)._competencyNames as string[]).length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {((selectedItem as Record<string, unknown>)._competencyNames as string[]).map((name: string) => (
                      <Badge key={name} variant="secondary" className="text-[10px]">{name}</Badge>
                    ))}
                  </div>
                )}
              </div>
            )}
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

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedItemId || !selectedTeacherId || createMutation.isPending}
          >
            {createMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NewAssignmentDialog;
