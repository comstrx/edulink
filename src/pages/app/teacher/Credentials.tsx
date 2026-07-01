import {
  Award, ShieldCheck, Wallet, AlertCircle, Clock, Star, Loader2,
} from "lucide-react";
import TrainingSubNav from "@/components/training/TrainingSubNav";
import TrainingHeader from "@/components/training/TrainingHeader";
import TrainingSection from "@/components/training/TrainingSection";
import StatCard from "@/components/training/StatCard";
import CredentialCertificateRow from "@/components/training/CredentialCertificateRow";
import CredentialBadgeCard from "@/components/training/CredentialBadgeCard";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTeacherEarnedCredentials, useTeacherWalletSummary } from "@/hooks/useEarnedCredentials";
import { computeVerificationStatus } from "@/lib/training/credential-verification-service";
import { format, differenceInDays } from "date-fns";

const Credentials = () => {
  const { data: credentials, isLoading } = useTeacherEarnedCredentials();
  const wallet = useTeacherWalletSummary(credentials);

  const certificates = (credentials ?? [])
    .filter(c => c.credential_kind === "certificate")
    .map(c => ({
      title: c.title,
      issuer: c.issuer_name,
      date: format(new Date(c.issued_at), "MMM d, yyyy"),
      id: c.verification_code,
      status: computeVerificationStatus(c),
    }));

  const badges = (credentials ?? [])
    .filter(c => c.credential_kind === "badge")
    .map(c => ({
      title: c.title,
      category: (c.metadata as any)?.category ?? c.source_type.replace("training_", ""),
      earned: format(new Date(c.issued_at), "MMM d, yyyy"),
      verificationCode: c.verification_code,
      status: c.status,
    }));

  const expiring = (credentials ?? [])
    .filter(c => c.expiry_date && c.status === "active")
    .map(c => {
      const daysLeft = differenceInDays(new Date(c.expiry_date!), new Date());
      return { title: c.title, expires: format(new Date(c.expiry_date!), "MMM d, yyyy"), daysLeft };
    })
    .filter(e => e.daysLeft > 0 && e.daysLeft <= 365)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  if (isLoading) {
    return (
      <div>
        <TrainingSubNav />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <TrainingSubNav />
      <div className="px-4 sm:px-6 py-6 space-y-8 max-w-5xl mx-auto">
        <TrainingHeader
          title="Credentials"
          icon={Award}
          description="Your earned certificates, badges, and professional credentials in one place."
          rootTo="/app/teacher/training"
        />

        {/* Credential Wallet */}
        <TrainingSection title="Credential Wallet" icon={Wallet}>
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
            <StatCard label="Certificates" value={wallet.certificates} icon={ShieldCheck} iconCircle />
            <StatCard label="Badges" value={wallet.badges} icon={Star} iconCircle />
            <StatCard label="Total Credentials" value={wallet.totalCredentials} icon={Award} iconCircle />
            <StatCard label="Expiring Soon" value={expiring.length} icon={Clock} iconCircle />
          </div>
        </TrainingSection>

        {/* Certificates */}
        <TrainingSection title="Certificates" icon={ShieldCheck}>
          {certificates.length > 0 ? (
            <div className="space-y-3">
              {certificates.map(c => (
                <CredentialCertificateRow key={c.id} item={c} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No certificates earned yet. Complete a training pathway to earn your first certificate.</p>
          )}
        </TrainingSection>

        {/* Badges */}
        <TrainingSection title="Badges" icon={Star}>
          {badges.length > 0 ? (
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
              {badges.map(b => (
                <CredentialBadgeCard key={b.title + b.earned} item={b} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No badges earned yet. Complete a course or practice cycle to earn your first badge.</p>
          )}
        </TrainingSection>

        {/* Expiring */}
        <TrainingSection title="Expiring Credentials" icon={AlertCircle}>
          {expiring.length > 0 ? (
            <div className="space-y-3">
              {expiring.map(e => (
                <Card key={e.title} className="border border-border bg-muted/30">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">{e.title}</p>
                      <p className="text-xs text-muted-foreground">Expires {e.expires}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">{e.daysLeft} days left</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No credentials expiring soon.</p>
          )}
        </TrainingSection>
      </div>
    </div>
  );
};

export default Credentials;
