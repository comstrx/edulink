interface TrainingEmptyStateProps {
  icon: React.ElementType;
  message: string;
  hint: string;
}

const TrainingEmptyState = ({ icon: Icon, message, hint }: TrainingEmptyStateProps) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <div className="rounded-full bg-muted p-4 mb-4">
      <Icon className="h-6 w-6 text-muted-foreground" />
    </div>
    <p className="font-medium text-foreground">{message}</p>
    <p className="text-sm text-muted-foreground mt-1">{hint}</p>
  </div>
);

export default TrainingEmptyState;
