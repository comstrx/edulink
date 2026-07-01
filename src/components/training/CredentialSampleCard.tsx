import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface CredentialSampleItem {
  title: string;
  type: string;
  color: string;
  icon: React.ElementType;
  description: string;
}

interface CredentialSampleCardProps {
  item: CredentialSampleItem;
}

const CredentialSampleCard = ({ item }: CredentialSampleCardProps) => {
  const Icon = item.icon;
  return (
    <Card>
      <CardContent className="pt-6 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground text-sm">{item.title}</h3>
          </div>
          <Badge variant="secondary" className={item.color}>
            {item.type}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{item.description}</p>
      </CardContent>
    </Card>
  );
};

export default CredentialSampleCard;
