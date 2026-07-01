import { Link } from "react-router-dom";
import { ExternalLink, Copy, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { VerificationStatus } from "@/lib/training/credential-verification-service";

export interface CredentialCertificateItem {
  title: string;
  issuer: string;
  date: string;
  id: string; // verification code
  status?: VerificationStatus;
}

interface CredentialCertificateRowProps {
  item: CredentialCertificateItem;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive"; icon: typeof CheckCircle2 }> = {
  valid: { label: "Active", variant: "default", icon: CheckCircle2 },
  active: { label: "Active", variant: "default", icon: CheckCircle2 },
  expired: { label: "Expired", variant: "secondary", icon: AlertTriangle },
  revoked: { label: "Revoked", variant: "destructive", icon: XCircle },
};

const CredentialCertificateRow = ({ item }: CredentialCertificateRowProps) => {
  const st = statusConfig[item.status ?? "active"] ?? statusConfig.active;
  const StatusIcon = st.icon;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(item.id);
    toast.success("Verification code copied");
  };

  return (
    <Card className="border border-border">
      <CardContent className="p-4 flex items-center justify-between gap-3">
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium text-foreground truncate">{item.title}</p>
            <Badge variant={st.variant} className="gap-1 shrink-0 text-xs">
              <StatusIcon className="h-3 w-3" /> {st.label}
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{item.issuer}</span>
            <span>Earned {item.date}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground font-mono hidden sm:inline">{item.id}</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopyCode} title="Copy verification code">
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" asChild title="Verify credential">
            <Link to={`/credentials/verify/${item.id}`} target="_blank">
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CredentialCertificateRow;
