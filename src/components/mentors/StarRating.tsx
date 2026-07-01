/**
 * StarRating — Displays star rating with average and count.
 * Sprint B2-C
 */
import { Star } from "lucide-react";

interface StarRatingProps {
  rating: number;
  count?: number;
  size?: "sm" | "md";
  showCount?: boolean;
}

const StarRating = ({ rating, count, size = "sm", showCount = true }: StarRatingProps) => {
  const starSize = size === "sm" ? "h-3.5 w-3.5" : "h-4.5 w-4.5";
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  if (rating === 0 && (count === undefined || count === 0)) {
    return (
      <span className={`${textSize} text-muted-foreground`}>No reviews yet</span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= Math.round(rating);
        return (
          <Star
            key={star}
            className={`${starSize} ${
              filled ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/20"
            }`}
          />
        );
      })}
      <span className={`${textSize} text-muted-foreground ml-0.5`}>
        {rating.toFixed(1)}
      </span>
      {showCount && count !== undefined && count > 0 && (
        <span className={`${textSize} text-muted-foreground`}>
          ({count})
        </span>
      )}
    </span>
  );
};

export default StarRating;
