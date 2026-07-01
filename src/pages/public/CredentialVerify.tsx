import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getPublicCredentialVerification, type VerificationResult } from "@/lib/training/credential-verification-service";
import { Award, BadgeCheck, GraduationCap, ShieldCheck, AlertTriangle, XCircle, Loader2, ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

const statusDisplay: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof ShieldCheck; color: string }> = {
  valid: { label: "Verified", variant: "default", icon: ShieldCheck, color: "text-primary" },
  expired: { label: "Expired", variant: "secondary", icon: AlertTriangle, color: "text-muted-foreground" },
  revoked: { label: "Revoked", variant: "destructive", icon: XCircle, color: "text-destructive" },
  not_found: { label: "Not Found", variant: "outline", icon: XCircle, color: "text-muted-foreground" },
  invalid_code: { label: "Invalid Code", variant: "outline", icon: XCircle, color: "text-muted-foreground" },
  error: { label: "Error", variant: "destructive", icon: AlertTriangle, color: "text-destructive" },
};

const CredentialVerify = () => {
  const { verificationCode } = useParams<{ verificationCode: string }>();

  const { data: result, isLoading } = useQuery<VerificationResult>({
    queryKey: ["credential-verify", verificationCode],
    queryFn: () => getPublicCredentialVerification(verificationCode ?? ""),
    enabled: !!verificationCode,
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Verifying credential…</p>
        </div>
      </div>
    );
  }

  const status = result?.status ?? "error";
  const display = statusDisplay[status] ?? statusDisplay.error;
  const StatusIcon = display.icon;
  const cred = result?.credential;

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-2xl mx-auto px-6 py-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Award className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-foreground">EduLink Credential Verification</p>
            <p className="text-xs text-muted-foreground">Independent verification of professional credentials</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10 space-y-6">
        {/* Status Banner */}
        <Card className={`border-2 ${status === "valid" ? "border-primary/30" : status === "revoked" ? "border-destructive/30" : "border-border"}`}>
          <CardContent className="p-6 text-center space-y-3">
            <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center ${status === "valid" ? "bg-primary/10" : status === "revoked" ? "bg-destructive/10" : "bg-muted"}`}>
              <StatusIcon className={`h-8 w-8 ${display.color}`} />
            </div>
            <Badge variant={display.variant} className="text-sm px-3 py-1">
              {display.label}
            </Badge>
            {status === "valid" && (
              <p className="text-sm text-muted-foreground">This credential has been verified as authentic and currently active.</p>
            )}
            {status === "expired" && (
              <p className="text-sm text-muted-foreground">This credential was issued by EduLink but has expired.</p>
            )}
            {status === "revoked" && (
              <p className="text-sm text-muted-foreground">This credential has been revoked and is no longer valid.</p>
            )}
            {status === "not_found" && (
              <p className="text-sm text-muted-foreground">No credential was found matching this verification code. Please check the code and try again.</p>
            )}
            {status === "invalid_code" && (
              <p className="text-sm text-muted-foreground">{result?.message ?? "The verification code format is invalid."}</p>
            )}
            {status === "error" && (
              <p className="text-sm text-muted-foreground">An error occurred during verification. Please try again later.</p>
            )}
          </CardContent>
        </Card>

        {/* Credential Details */}
        {cred && (
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 shrink-0">
                  {cred.credentialKind === "certificate" ? (
                    <GraduationCap className="h-5 w-5 text-primary" />
                  ) : (
                    <BadgeCheck className="h-5 w-5 text-primary" />
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{cred.title}</h2>
                  <Badge variant="outline" className="text-xs capitalize mt-1">{cred.credentialKind}</Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Holder</p>
                  <p className="text-sm text-foreground">{cred.holderName}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Issuer</p>
                  <p className="text-sm text-foreground">{cred.issuerName}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Issued</p>
                  <p className="text-sm text-foreground">{format(new Date(cred.issuedAt), "MMMM d, yyyy")}</p>
                </div>
                {cred.expiryDate && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Expires</p>
                    <p className="text-sm text-foreground">{format(new Date(cred.expiryDate), "MMMM d, yyyy")}</p>
                  </div>
                )}
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Source</p>
                  <p className="text-sm text-foreground">{cred.sourceLabel}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Verification Code</p>
                  <p className="text-sm text-foreground font-mono">{cred.verificationCode}</p>
                </div>
              </div>

              {/* Trust indicator */}
              <div className="border-t border-border pt-4 flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span>Issued and verified by EduLink Training Platform</span>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="text-center">
          <Button asChild variant="outline" size="sm">
            <Link to="/training/credentials">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to Credentials
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CredentialVerify;
