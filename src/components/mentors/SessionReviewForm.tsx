/**
 * SessionReviewForm — Review form for completed mentor sessions.
 * Sprint B2-C
 */
import { useState } from "react";
import { useSubmitSessionReview } from "@/hooks/useMentorReputation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

interface SessionReviewFormProps {
  mentorId: string;
  sessionId: string;
  mentorName?: string;
  onReviewSubmitted?: () => void;
}

const SessionReviewForm = ({ mentorId, sessionId, mentorName, onReviewSubmitted }: SessionReviewFormProps) => {
  const submitMutation = useSubmitSessionReview();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }
    try {
      await submitMutation.mutateAsync({
        mentor_id: mentorId,
        session_id: sessionId,
        rating,
        comment: comment.trim() || undefined,
      });
      setSubmitted(true);
      toast.success("Review submitted! It will be visible after moderation.");
      onReviewSubmitted?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit review");
    }
  };

  if (submitted) {
    return (
      <Card>
        <CardContent className="p-4 text-center space-y-2">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Check className="h-5 w-5 text-primary" />
          </div>
          <p className="text-sm font-medium text-foreground">Review Submitted</p>
          <p className="text-xs text-muted-foreground">Your review is pending moderation.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <p className="text-sm font-medium text-foreground">
          Rate your session{mentorName ? ` with ${mentorName}` : ""}
        </p>

        {/* Star rating */}
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              onClick={() => setRating(star)}
              className="p-0.5 transition-colors"
            >
              <Star
                className={`h-6 w-6 ${
                  star <= (hoveredRating || rating)
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-muted-foreground/30"
                }`}
              />
            </button>
          ))}
          {rating > 0 && (
            <span className="text-sm text-muted-foreground ml-2 self-center">{rating}/5</span>
          )}
        </div>

        {/* Comment */}
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share your experience (optional)"
          rows={3}
        />

        <Button
          onClick={handleSubmit}
          disabled={rating === 0 || submitMutation.isPending}
          size="sm"
          className="w-full"
        >
          {submitMutation.isPending ? (
            <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Submitting…</>
          ) : (
            "Submit Review"
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default SessionReviewForm;
