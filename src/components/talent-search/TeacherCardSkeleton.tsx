const TeacherCardSkeleton = () => (
  <div className="rounded-lg border border-border/60 bg-card p-4 animate-pulse">
    <div className="flex gap-4">
      <div className="h-14 w-14 rounded-full bg-muted shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-32 rounded bg-muted" />
        <div className="h-3 w-24 rounded bg-muted" />
        <div className="h-3 w-48 rounded bg-muted" />
        <div className="flex gap-1.5 pt-1">
          <div className="h-5 w-20 rounded bg-muted" />
          <div className="h-5 w-16 rounded bg-muted" />
        </div>
      </div>
      <div className="shrink-0 space-y-1.5">
        <div className="h-8 w-24 rounded bg-muted" />
        <div className="h-8 w-24 rounded bg-muted" />
      </div>
    </div>
  </div>
);

export const TeacherCardSkeletonList = ({ count = 5 }: { count?: number }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <TeacherCardSkeleton key={i} />
    ))}
  </div>
);

export default TeacherCardSkeleton;
