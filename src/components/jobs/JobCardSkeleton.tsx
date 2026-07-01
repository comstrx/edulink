import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const JobCardSkeleton = () => (
  <Card className="overflow-hidden">
    <CardContent className="p-4 space-y-2.5">
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-3.5 w-2/5" />
      <div className="flex gap-1.5">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-14 rounded-full" />
        <Skeleton className="h-5 w-18 rounded-full" />
        <Skeleton className="h-5 w-12 rounded-full" />
      </div>
      <div className="flex gap-4">
        <Skeleton className="h-3.5 w-20" />
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-3.5 w-28" />
      </div>
      <div className="flex gap-2 pt-1">
        <Skeleton className="h-9 w-24 rounded-md" />
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>
    </CardContent>
  </Card>
);

export const JobCardSkeletonList = ({ count = 6 }: { count?: number }) => (
  <div className="space-y-4">
    {Array.from({ length: count }).map((_, i) => (
      <JobCardSkeleton key={i} />
    ))}
  </div>
);

export default JobCardSkeleton;
