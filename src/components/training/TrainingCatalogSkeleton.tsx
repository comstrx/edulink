import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface TrainingCatalogSkeletonProps {
  /** Number of skeleton cards to render */
  count?: number;
  /** Card variant — affects internal skeleton layout */
  variant?: "course" | "package" | "pathway";
}

const CourseCardSkeleton = () => (
  <Card>
    <CardHeader className="pb-2">
      <Skeleton className="h-5 w-3/4" />
    </CardHeader>
    <CardContent className="space-y-3">
      <Skeleton className="h-4 w-1/3" />
      <div className="flex gap-1.5">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <Skeleton className="h-4 w-2/5" />
      <Skeleton className="h-8 w-24 rounded-md" />
    </CardContent>
  </Card>
);

const PackageCardSkeleton = () => (
  <Card>
    <CardHeader className="pb-2">
      <Skeleton className="h-5 w-2/3" />
    </CardHeader>
    <CardContent className="space-y-3">
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-6 w-20" />
      <Skeleton className="h-5 w-24 rounded-full" />
      <Skeleton className="h-3 w-4/5" />
      <Skeleton className="h-8 w-28 rounded-md" />
    </CardContent>
  </Card>
);

const PathwayCardSkeleton = () => (
  <Card>
    <CardHeader className="pb-2">
      <Skeleton className="h-5 w-3/5" />
    </CardHeader>
    <CardContent className="space-y-3">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
      <div className="flex gap-1.5">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-20" />
      </div>
      <Skeleton className="h-8 w-28 rounded-md" />
    </CardContent>
  </Card>
);

const VARIANT_MAP = {
  course: CourseCardSkeleton,
  package: PackageCardSkeleton,
  pathway: PathwayCardSkeleton,
};

/**
 * Skeleton grid for training catalog pages.
 * Matches the card layout of Courses, Packages, and Pathways.
 */
const TrainingCatalogSkeleton = ({
  count = 4,
  variant = "course",
}: TrainingCatalogSkeletonProps) => {
  const CardSkeleton = VARIANT_MAP[variant];

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
};

export default TrainingCatalogSkeleton;
