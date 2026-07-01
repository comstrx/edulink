/**
 * Admin Mentor Reviews — Moderation page for session reviews.
 * Sprint B2-C
 */
import { useAdminMentorReviews, useModerateSessionReview } from "@/hooks/useMentorReputation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, Star } from "lucide-react";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  pending: "outline",
  approved: "default",
  rejected: "destructive",
};

const AdminMentorReviews = () => {
  const { data: reviews, isLoading } = useAdminMentorReviews();
  const moderateMutation = useModerateSessionReview();

  const handleModerate = async (reviewId: string, status: "approved" | "rejected") => {
    try {
      await moderateMutation.mutateAsync({ reviewId, status });
      toast.success(`Review ${status}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to moderate review");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const pendingReviews = (reviews ?? []).filter((r) => r.status === "pending");
  const otherReviews = (reviews ?? []).filter((r) => r.status !== "pending");

  return (
    <div className="px-4 sm:px-6 py-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Mentor Review Moderation</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review and moderate session reviews submitted by teachers.
        </p>
      </div>

      {/* Pending */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">
          Pending Reviews {pendingReviews.length > 0 && `(${pendingReviews.length})`}
        </h2>
        {pendingReviews.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No pending reviews.</p>
        ) : (
          pendingReviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              onApprove={() => handleModerate(review.id, "approved")}
              onReject={() => handleModerate(review.id, "rejected")}
              isPending={moderateMutation.isPending}
            />
          ))
        )}
      </section>

      {/* History */}
      {otherReviews.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Review History</h2>
          {otherReviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </section>
      )}
    </div>
  );
};

function ReviewCard({
  review,
  onApprove,
  onReject,
  isPending,
}: {
  review: any;
  onApprove?: () => void;
  onReject?: () => void;
  isPending?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`h-3.5 w-3.5 ${
                      s <= review.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/20"
                    }`}
                  />
                ))}
              </div>
              <Badge variant={STATUS_COLORS[review.status]} className="text-[10px] capitalize">
                {review.status}
              </Badge>
            </div>
            {review.comment && (
              <p className="text-sm text-muted-foreground">{review.comment}</p>
            )}
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <span>Mentor: {review.mentor_id.slice(0, 8)}…</span>
              <span>Session: {review.session_id.slice(0, 8)}…</span>
              <span>{new Date(review.created_at).toLocaleDateString()}</span>
            </div>
          </div>
          {review.status === "pending" && onApprove && onReject && (
            <div className="flex gap-2 shrink-0">
              <Button size="sm" onClick={onApprove} disabled={isPending}>
                <CheckCircle className="h-3.5 w-3.5 mr-1" /> Approve
              </Button>
              <Button size="sm" variant="outline" onClick={onReject} disabled={isPending}>
                <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default AdminMentorReviews;
