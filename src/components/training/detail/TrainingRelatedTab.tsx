import { Link } from "react-router-dom";
import { BookOpen, ArrowRight } from "lucide-react";

export interface TrainingRelatedItem {
  title: string;
  slug: string;
  type: string;
}

interface TrainingRelatedTabProps {
  items: TrainingRelatedItem[];
}

const TrainingRelatedTab = ({ items }: TrainingRelatedTabProps) => (
  <div className="space-y-6">
    <h2 className="text-xl font-bold text-foreground">Related Learning</h2>
    <div className="grid sm:grid-cols-2 gap-4">
      {items.map((r) => (
        <Link key={r.slug} to={`/training/${r.slug}`} className="rounded-lg border border-border bg-card p-4 flex items-center justify-between hover:bg-muted/40 transition-colors">
          <div className="flex items-center gap-3">
            <BookOpen className="h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">{r.title}</p>
              <p className="text-xs text-muted-foreground">{r.type}</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </Link>
      ))}
    </div>
    <p className="text-xs text-muted-foreground italic">Related items are currently static — dynamic recommendations will be added with backend integration.</p>
  </div>
);

export default TrainingRelatedTab;
