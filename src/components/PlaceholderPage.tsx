interface PlaceholderPageProps {
  title: string;
  subtitle: string;
}

const PlaceholderPage = ({ title, subtitle }: PlaceholderPageProps) => {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-bold text-foreground">{title}</h1>
      <p className="mt-2 text-muted-foreground">{subtitle}</p>
    </div>
  );
};

export default PlaceholderPage;
