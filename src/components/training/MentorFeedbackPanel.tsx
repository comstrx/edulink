import { CheckCircle2, XCircle, AlertTriangle, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTeacherMentorReviews } from "@/hooks/useMentorReviews";
import type { MentorReviewDecision } from "@/contracts/training/mentor.contracts";

const DECISION_CONFIG: Record<MentorReviewDecision, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof CheckCircle2 }> = {
  approved: { label: "Approved", variant: "secondary", icon: CheckCircle2 },
  rejected: { label: "Rejected", variant: "destructive", icon: XCircle },
  needs_revision: { label: "Needs Revision", variant: "outline", icon: AlertTriangle },
};

interface MentorFeedbackPanelProps {
  executionId: string;
}

export default function MentorFeedbackPanel({ executionId }: MentorFeedbackPanelProps) {
  const { data: reviews = [], isLoading } = useTeacherMentorReviews();

  const executionReviews = reviews.filter((r) => r.execution_id === executionId);

  if (isLoading || executionReviews.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
        <MessageSquare className="h-3 w-3" />
        Mentor Feedback
      </p>
      {executionReviews.map((review) => {
        const cfg = DECISION_CONFIG[review.review_decision];
        const Icon = cfg.icon;
        return (
          <div key={review.id} className="p-2 rounded-md bg-muted/40 space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant={cfg.variant} className="text-[10px] gap-0.5">
                <Icon className="h-2.5 w-2.5" />
                {cfg.label}
              </Badge>
              <span className="text-[10px] text-muted-foreground">
                {new Date(review.reviewed_at).toLocaleDateString()}
              </span>
            </div>
            {review.review_notes && (
              <p className="text-xs text-muted-foreground italic">"{review.review_notes}"</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
