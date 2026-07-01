import { type TrainingDetailItem, META_ITEMS } from "./training-detail-data";

interface TrainingDetailMetaProps {
  item: TrainingDetailItem;
}

const TrainingDetailMeta = ({ item }: TrainingDetailMetaProps) => {
  const meta = META_ITEMS(item);

  return (
    <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {meta.map((m) => (
        <div key={m.label} className="rounded-lg border border-border bg-card p-4 space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <m.icon className="h-4 w-4" />
            <span className="text-xs font-medium">{m.label}</span>
          </div>
          <p className="text-sm font-semibold text-foreground">{m.value}</p>
        </div>
      ))}
    </section>
  );
};

export default TrainingDetailMeta;
