import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle } from "lucide-react";
import { useRejectionReasons } from "@/hooks/useRejectionReasons";

interface RejectApplicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicantName: string;
  onConfirm: (rejectionReasonTermId: string) => void;
  isPending: boolean;
}

export function RejectApplicationDialog({
  open,
  onOpenChange,
  applicantName,
  onConfirm,
  isPending,
}: RejectApplicationDialogProps) {
  const [selectedReasonId, setSelectedReasonId] = useState<string>("");
  const { data: reasons, isLoading: reasonsLoading } = useRejectionReasons();

  const handleConfirm = () => {
    if (!selectedReasonId) return;
    onConfirm(selectedReasonId);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) setSelectedReasonId("");
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4.5 w-4.5 text-destructive" />
            Reject Application
          </DialogTitle>
          <DialogDescription>
            Reject <span className="font-medium text-foreground">{applicantName}</span>'s application. A reason is required.
          </DialogDescription>
        </DialogHeader>

        <div className="py-3 space-y-2">
          <label className="text-sm font-medium text-foreground">
            Rejection Reason <span className="text-destructive">*</span>
          </label>
          {reasonsLoading ? (
            <Skeleton className="h-9 w-full" />
          ) : (
            <Select value={selectedReasonId} onValueChange={setSelectedReasonId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a reason…" />
              </SelectTrigger>
              <SelectContent>
                {(reasons ?? []).map((reason) => (
                  <SelectItem key={reason.id} value={reason.id}>
                    {reason.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!selectedReasonId || isPending}
          >
            {isPending ? "Rejecting…" : "Reject Application"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
