import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { dispatchDomainEvent } from "@/smart-glue/bridge";
import { EVENT_NAMES } from "@/contracts/core/event-names";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Loader2, BookOpen, CheckCircle, XCircle, MessageSquare, Eye } from "lucide-react";

const reviewColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending_review: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-destructive/10 text-destructive",
  changes_requested: "bg-orange-100 text-orange-800",
};

type ReviewAction = "approved" | "rejected" | "changes_requested";

const ProviderContent = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [reviewFilter, setReviewFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  // Dialog state for review actions requiring notes
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogAction, setDialogAction] = useState<ReviewAction>("rejected");
  const [dialogItemId, setDialogItemId] = useState<string>("");
  const [dialogNotes, setDialogNotes] = useState("");
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const { data: items, isLoading } = useQuery({
    queryKey: ["admin_provider_content", reviewFilter, typeFilter],
    queryFn: async () => {
      let query = (supabase as any)
        .from("training_items")
        .select(`
          id, title, type, review_status, updated_at, ownership_type,
          provider_id, review_notes, reviewed_by, reviewed_at,
          published_by_provider_at, approved_by_admin_at
        `)
        .eq("ownership_type", "provider")
        .order("updated_at", { ascending: false })
        .limit(100);

      if (reviewFilter !== "all") query = query.eq("review_status", reviewFilter);
      if (typeFilter !== "all") query = query.eq("type", typeFilter);

      const { data, error } = await query;
      if (error) throw error;

      const providerIds = [...new Set((data ?? []).map((i: any) => i.provider_id).filter(Boolean))];
      let providerMap: Record<string, string> = {};
      if (providerIds.length) {
        const { data: provs } = await (supabase as any)
          .from("providers")
          .select("id, display_name")
          .in("id", providerIds);
        providerMap = Object.fromEntries((provs ?? []).map((p: any) => [p.id, p.display_name]));
      }

      return (data ?? []).map((i: any) => ({
        ...i,
        provider_name: providerMap[i.provider_id] ?? "Unknown",
      }));
    },
  });

  const reviewAction = useMutation({
    mutationFn: async ({ itemId, newStatus, notes }: { itemId: string; newStatus: string; notes?: string }) => {
      const updates: any = {
        review_status: newStatus,
        reviewed_by: user?.id,
      };
      if (newStatus === "approved") updates.approved_by_admin_at = new Date().toISOString();
      if (notes !== undefined) updates.review_notes = notes;
      const { error } = await (supabase as any)
        .from("training_items")
        .update(updates)
        .eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: (_, { itemId, newStatus, notes }) => {
      toast({ title: `Item ${newStatus.replace(/_/g, " ")}` });
      qc.invalidateQueries({ queryKey: ["admin_provider_content"] });
      setDialogOpen(false);
      setDialogNotes("");

      // Sprint 13: Dispatch admin content signal through Smart Glue
      const item = (items ?? []).find((i: any) => i.id === itemId);
      const providerId = item?.provider_id ?? "unknown";

      if (newStatus === "approved") {
        dispatchDomainEvent("admin", EVENT_NAMES.admin.contentApproved, {
          itemId,
          providerId,
          approvedBy: user?.id ?? "unknown",
          approvedAt: new Date().toISOString(),
        }).catch(() => {});
      } else if (newStatus === "rejected") {
        dispatchDomainEvent("admin", EVENT_NAMES.admin.contentRejected, {
          itemId,
          providerId,
          rejectedBy: user?.id ?? "unknown",
          rejectedAt: new Date().toISOString(),
          reviewNotes: notes,
        }).catch(() => {});
      }
    },
    onError: (err: any) => {
      toast({ title: "Action failed", description: err.message, variant: "destructive" });
    },
  });

  const openReviewDialog = (itemId: string, action: ReviewAction) => {
    setDialogItemId(itemId);
    setDialogAction(action);
    setDialogNotes("");
    setDialogOpen(true);
  };

  const confirmReviewAction = () => {
    if (dialogAction !== "approved" && !dialogNotes.trim()) {
      toast({ title: "Review notes required", description: "Please provide feedback for the provider.", variant: "destructive" });
      return;
    }
    reviewAction.mutate({
      itemId: dialogItemId,
      newStatus: dialogAction,
      notes: dialogAction === "approved" ? (dialogNotes.trim() || null) : dialogNotes.trim(),
    });
  };

  const actionLabels: Record<ReviewAction, string> = {
    approved: "Approve Item",
    rejected: "Reject Item",
    changes_requested: "Request Changes",
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Provider Content Review</h1>
        <p className="text-muted-foreground mt-1">Review and approve provider-owned training items.</p>
      </div>

      <div className="flex gap-3">
        <Select value={reviewFilter} onValueChange={setReviewFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Review status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="pending_review">Pending Review</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="changes_requested">Changes Requested</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Item type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="course">Course</SelectItem>
            <SelectItem value="package">Package</SelectItem>
            <SelectItem value="pathway">Pathway</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !items?.length ? (
        <div className="text-center py-12 text-muted-foreground">
          <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-40" />
          <p>No provider-owned content found.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Review Status</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item: any) => (
              <>
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    <button
                      className="text-left hover:underline"
                      onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
                    >
                      {item.title}
                    </button>
                  </TableCell>
                  <TableCell>{item.provider_name}</TableCell>
                  <TableCell className="capitalize">{item.type}</TableCell>
                  <TableCell>
                    <Badge className={reviewColors[item.review_status] ?? ""}>
                      {item.review_status?.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {item.published_by_provider_at ? new Date(item.published_by_provider_at).toLocaleDateString() : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {new Date(item.updated_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost" size="sm"
                        onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
                      >
                        <Eye className="h-3 w-3 mr-1" /> Details
                      </Button>
                      {item.review_status === "pending_review" && (
                        <>
                          <Button
                            variant="default" size="sm"
                            disabled={reviewAction.isPending}
                            onClick={() => openReviewDialog(item.id, "approved")}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" /> Approve
                          </Button>
                          <Button
                            variant="destructive" size="sm"
                            disabled={reviewAction.isPending}
                            onClick={() => openReviewDialog(item.id, "rejected")}
                          >
                            <XCircle className="h-3 w-3 mr-1" /> Reject
                          </Button>
                          <Button
                            variant="outline" size="sm"
                            disabled={reviewAction.isPending}
                            onClick={() => openReviewDialog(item.id, "changes_requested")}
                          >
                            <MessageSquare className="h-3 w-3 mr-1" /> Changes
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
                {expandedItem === item.id && (
                  <TableRow key={`${item.id}-details`}>
                    <TableCell colSpan={7}>
                      <div className="bg-muted/30 rounded-md p-4 space-y-2 text-sm">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-muted-foreground">Reviewed at:</span>{" "}
                            {item.reviewed_at ? new Date(item.reviewed_at).toLocaleString() : "—"}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Approved at:</span>{" "}
                            {item.approved_by_admin_at ? new Date(item.approved_by_admin_at).toLocaleString() : "—"}
                          </div>
                        </div>
                        {item.review_notes && (
                          <div className="border-t border-border pt-2 mt-2">
                            <span className="text-muted-foreground font-medium">Review Notes:</span>
                            <p className="mt-1 whitespace-pre-wrap">{item.review_notes}</p>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Review Action Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{actionLabels[dialogAction]}</DialogTitle>
            <DialogDescription>
              {dialogAction === "approved"
                ? "Optionally add review notes for the provider."
                : "Provide feedback so the provider can understand what needs to change."}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder={dialogAction === "approved" ? "Optional notes..." : "Review notes (required)..."}
            value={dialogNotes}
            onChange={(e) => setDialogNotes(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              variant={dialogAction === "rejected" ? "destructive" : "default"}
              disabled={reviewAction.isPending}
              onClick={confirmReviewAction}
            >
              {reviewAction.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {actionLabels[dialogAction]}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProviderContent;
