import { Link } from "react-router-dom";
import { Star, Copy, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export interface CredentialBadgeItem {
  title: string;
  category: string;
  earned: string;
  verificationCode?: string;
  status?: string;
}

interface CredentialBadgeCardProps {
  item: CredentialBadgeItem;
}

const CredentialBadgeCard = ({ item }: CredentialBadgeCardProps) => {
  const handleCopyCode = () => {
    if (item.verificationCode) {
      navigator.clipboard.writeText(item.verificationCode);
      toast.success("Verification code copied");
    }
  };

  return (
    <Card className="border border-border text-center">
      <CardContent className="p-4 space-y-2">
        <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Star className="h-5 w-5 text-primary" />
        </div>
        <p className="text-sm font-medium text-foreground">{item.title}</p>
        <Badge variant="outline" className="text-xs">{item.category}</Badge>
        <p className="text-xs text-muted-foreground">Earned {item.earned}</p>
        {item.verificationCode && (
          <div className="flex items-center justify-center gap-1 pt-1">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopyCode} title="Copy code">
              <Copy className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" asChild title="Verify">
              <Link to={`/credentials/verify/${item.verificationCode}`} target="_blank">
                <ExternalLink className="h-3 w-3" />
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CredentialBadgeCard;
