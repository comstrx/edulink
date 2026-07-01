import { useState } from "react";
import { Link } from "react-router-dom";
import { useProviderMembership } from "@/hooks/useProviderProfile";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BookOpen, Loader2, Send, Plus, Pencil, Eye, AlertTriangle, MessageSquare } from "lucide-react";
import ProviderStatusBanner from "@/components/provider/ProviderStatusBanner";
import {
  fetchProviderCatalogItems,
  submitProviderItemForReview,
  type ProviderCatalogItemRow,
} from "@/lib/supabase-typed-queries";

const reviewColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending_review: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-destructive/10 text-destructive",
  changes_requested: "bg-orange-100 text-orange-800",
};

const EDITABLE_STATES = ["draft", "changes_requested"];

const ProviderCatalog = () => {
  const { data: membership, isLoading: membershipLoading } = useProviderMembership();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [typeFilter, setTypeFilter] = useState("all");
  const [reviewFilter, setReviewFilter] = useState("all");
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const providerId = membership?.provider?.id;
  const providerStatus = membership?.provider?.status;
  const isSuspended = providerStatus === "suspended";
  const canOperate = !isSuspended && providerStatus !== "inactive";

  const { data: items, isLoading } = useQuery({
    queryKey: ["provider_catalog", providerId, typeFilter, reviewFilter],
    enabled: !!providerId,
    queryFn: () => fetchProviderCatalogItems({
      providerId: providerId!,
      typeFilter,
      reviewFilter,
    }),
  });

  const submitForReviewMutation = useMutation({
    mutationFn: async (itemId: string) => {
      await submitProviderItemForReview(itemId, providerId!);
    },
    onSuccess: () => {
      toast({ title: "Item submitted for review" });
      qc.invalidateQueries({ queryKey: ["provider_catalog"] });
      qc.invalidateQueries({ queryKey: ["provider_catalog_counts"] });
    },
    onError: (err: Error) => {
      toast({ title: "Submission failed", description: err.message, variant: "destructive" });
    },
  });

  if (membershipLoading) {
    return <div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  if (!membership) {
    return <div className="p-8"><p className="text-muted-foreground">No provider found.</p></div>;
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Catalog</h1>
          <p className="text-muted-foreground mt-1">Training items owned by your provider.</p>
        </div>
        {canOperate && (
          <div className="flex gap-2">
            <Button asChild>
              <Link to="/app/provider/catalog/new/course"><Plus className="h-4 w-4 mr-1" /> New Course</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/app/provider/catalog/new/package"><Plus className="h-4 w-4 mr-1" /> New Package</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/app/provider/catalog/new/pathway"><Plus className="h-4 w-4 mr-1" /> New Pathway</Link>
            </Button>
          </div>
        )}
      </div>

      <ProviderStatusBanner status={membership.provider.status} rejectionReason={membership.provider.rejection_reason} />

      <div className="flex gap-3">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="course">Course</SelectItem>
            <SelectItem value="package">Package</SelectItem>
            <SelectItem value="pathway">Pathway</SelectItem>
          </SelectContent>
        </Select>
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
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : !items?.length ? (
        <div className="text-center py-12 text-muted-foreground">
          <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-40" />
          <p>No catalog items yet.</p>
          {canOperate && <p className="text-xs mt-1">Create your first training item to get started.</p>}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Review Status</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Approved</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item: ProviderCatalogItemRow) => {
              const isItemEditable = EDITABLE_STATES.includes(item.review_status);
              const hasReviewFeedback = item.review_notes && ["rejected", "changes_requested"].includes(item.review_status);
              return (
                <>
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {item.title}
                        {hasReviewFeedback && (
                          <button
                            onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
                            title="View review feedback"
                          >
                            <MessageSquare className="h-4 w-4 text-orange-500" />
                          </button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">{item.type}</TableCell>
                    <TableCell>
                      <Badge className={reviewColors[item.review_status] ?? ""}>{item.review_status?.replace(/_/g, " ")}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">{new Date(item.updated_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{item.published_by_provider_at ? new Date(item.published_by_provider_at).toLocaleDateString() : "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{item.approved_by_admin_at ? new Date(item.approved_by_admin_at).toLocaleDateString() : "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {isItemEditable && canOperate ? (
                          <Button variant="outline" size="sm" asChild>
                            <Link to={`/app/provider/catalog/${item.id}/edit`}><Pencil className="h-3 w-3 mr-1" /> Edit</Link>
                          </Button>
                        ) : (
                          <Button variant="ghost" size="sm" asChild>
                            <Link to={`/app/provider/catalog/${item.id}/edit`}><Eye className="h-3 w-3 mr-1" /> View</Link>
                          </Button>
                        )}
                        {(item.review_status === "draft" || item.review_status === "changes_requested") && canOperate && (
                          <Button variant="default" size="sm" disabled={submitForReviewMutation.isPending}
                            onClick={() => submitForReviewMutation.mutate(item.id)}>
                            <Send className="h-3 w-3 mr-1" /> {item.review_status === "changes_requested" ? "Resubmit" : "Submit"}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  {expandedItem === item.id && item.review_notes && (
                    <TableRow key={`${item.id}-feedback`}>
                      <TableCell colSpan={7}>
                        <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-md p-4 flex gap-3">
                          <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
                          <div className="text-sm">
                            <p className="font-medium text-foreground mb-1">
                              {item.review_status === "rejected" ? "Rejection Feedback" : "Changes Requested"}
                            </p>
                            <p className="text-muted-foreground whitespace-pre-wrap">{item.review_notes}</p>
                            {item.reviewed_at && (
                              <p className="text-xs text-muted-foreground mt-2">
                                Reviewed on {new Date(item.reviewed_at).toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

export default ProviderCatalog;
