import { useTeacherEarnedCredentials } from "@/hooks/useEarnedCredentials";
import { useTeacherProfileId } from "@/hooks/useTeacherProfileId";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Award, AlertTriangle, ShieldCheck } from "lucide-react";
import { format } from "date-fns";

const TeacherCertificates = () => {
  const { data: credentials, isLoading, error } = useTeacherEarnedCredentials();

  const statusVariant = (s: string) => {
    if (s === "active") return "default" as const;
    if (s === "expired") return "destructive" as const;
    return "secondary" as const;
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto px-4 sm:px-6 py-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Certificates & Badges</h1>
        <p className="text-sm text-muted-foreground">Your earned credentials from completed training</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : error ? (
        <Card>
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Failed to load credentials. Please try again.</p>
          </CardContent>
        </Card>
      ) : !credentials || credentials.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Award className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="font-medium text-foreground">No credentials earned yet</p>
            <p className="text-sm text-muted-foreground mt-1">Complete training courses and pathways to earn certificates and badges.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {credentials.map((cred) => (
            <Card key={cred.id}>
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    {cred.credential_kind === "certificate" ? (
                      <Award className="h-5 w-5 text-primary" />
                    ) : (
                      <ShieldCheck className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{cred.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {cred.issuer_name} · Issued {format(new Date(cred.issued_at), "MMM d, yyyy")}
                      {cred.expiry_date && ` · Expires ${format(new Date(cred.expiry_date), "MMM d, yyyy")}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className="text-xs capitalize">{cred.credential_kind}</Badge>
                  <Badge variant={statusVariant(cred.status)} className="text-xs capitalize">{cred.status}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeacherCertificates;
