import { Link } from "react-router-dom";
import SchoolTrainingSubNav from "@/components/training/SchoolTrainingSubNav";
import SchoolBreadcrumb from "@/components/school/SchoolBreadcrumb";
import TrainingHeader from "@/components/training/TrainingHeader";
import StatCard from "@/components/training/StatCard";
import { Award, Search, Download, Shield, AlertTriangle, CheckCircle2, XCircle, Loader2, ExternalLink, Copy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSchoolTeamEarnedCredentials, type EarnedCredentialWithTeacher } from "@/hooks/useEarnedCredentials";
import { computeVerificationStatus } from "@/lib/training/credential-verification-service";
import { format } from "date-fns";
import { useState, useMemo } from "react";
import { toast } from "sonner";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive"; icon: typeof CheckCircle2 }> = {
  valid: { label: "Active", variant: "default", icon: CheckCircle2 },
  active: { label: "Active", variant: "default", icon: CheckCircle2 },
  expired: { label: "Expired", variant: "secondary", icon: AlertTriangle },
  revoked: { label: "Revoked", variant: "destructive", icon: XCircle },
};

const SchoolCredentials = () => {
  const { data: credentials, isLoading } = useSchoolTeamEarnedCredentials();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!credentials) return [];
    if (!search.trim()) return credentials;
    const q = search.toLowerCase();
    return credentials.filter(c =>
      c.title.toLowerCase().includes(q) ||
      c.teacher_name.toLowerCase().includes(q) ||
      c.credential_kind.toLowerCase().includes(q) ||
      c.verification_code.toLowerCase().includes(q)
    );
  }, [credentials, search]);

  const activeCreds = (credentials ?? []).filter(c => computeVerificationStatus(c) === "valid");
  const expiredCreds = (credentials ?? []).filter(c => computeVerificationStatus(c) === "expired");
  const certificates = filtered.filter(c => c.credential_kind === "certificate");
  const badges = filtered.filter(c => c.credential_kind === "badge");
  const needsAttention = filtered.filter(c => computeVerificationStatus(c) !== "valid");

  const renderTable = (rows: EarnedCredentialWithTeacher[]) => (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Teacher</TableHead>
            <TableHead>Credential</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Issued</TableHead>
            <TableHead>Expires</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Verify</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                No credentials found.
              </TableCell>
            </TableRow>
          ) : (
            rows.map(cred => {
              const verStatus = computeVerificationStatus(cred);
              const st = statusConfig[verStatus] ?? statusConfig.active;
              const Icon = st.icon;
              return (
                <TableRow key={cred.id}>
                  <TableCell className="font-medium text-sm">{cred.teacher_name}</TableCell>
                  <TableCell>
                    <p className="font-medium text-sm">{cred.title}</p>
                    <p className="text-xs text-muted-foreground font-mono">{cred.verification_code}</p>
                  </TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{cred.credential_kind}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{format(new Date(cred.issued_at), "yyyy-MM-dd")}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{cred.expiry_date ? format(new Date(cred.expiry_date), "yyyy-MM-dd") : "—"}</TableCell>
                  <TableCell>
                    <Badge variant={st.variant} className="gap-1">
                      <Icon className="h-3 w-3" /> {st.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => {
                          navigator.clipboard.writeText(cred.verification_code);
                          toast.success("Verification code copied");
                        }}
                        title="Copy code"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => {
                          // Download certificate as text receipt (placeholder for PDF generation)
                          const content = `Certificate: ${cred.title}\nTeacher: ${cred.teacher_name}\nIssued: ${format(new Date(cred.issued_at), "yyyy-MM-dd")}\nVerification: ${cred.verification_code}\nIssuer: ${cred.issuer_name}\nStatus: ${verStatus}`;
                          const blob = new Blob([content], { type: "text/plain" });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `certificate-${cred.verification_code}.txt`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        title="Download certificate"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" asChild title="Verify">
                        <Link to={`/credentials/verify/${cred.verification_code}`} target="_blank">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </Card>
  );

  if (isLoading) {
    return (
      <>
        <SchoolTrainingSubNav />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  return (
    <>
      <SchoolTrainingSubNav />
      <div className="space-y-6 px-4 sm:px-6 py-6 max-w-6xl mx-auto">
        <SchoolBreadcrumb items={[{ label: "Training", to: "/app/school/training/overview" }, { label: "Credentials" }]} />
        <TrainingHeader
          title="Team Credentials"
          icon={Award}
          description="View certificates and badges earned by your team members"
          rootTo="/app/school/training/overview"
          action={<Button variant="outline"><Download className="h-4 w-4 mr-1" /> Export Report</Button>}
        />

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="Active Credentials" value={activeCreds.length} icon={Shield} iconCircle />
          <StatCard label="Certificates" value={(credentials ?? []).filter(c => c.credential_kind === "certificate").length} icon={Award} iconCircle />
          <StatCard label="Expired" value={expiredCreds.length} icon={AlertTriangle} iconCircle valueClassName="text-destructive" />
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by teacher, credential title, or verification code…"
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All ({filtered.length})</TabsTrigger>
            <TabsTrigger value="certificates">Certificates ({certificates.length})</TabsTrigger>
            <TabsTrigger value="badges">Badges ({badges.length})</TabsTrigger>
            <TabsTrigger value="attention">Needs Attention ({needsAttention.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all">{renderTable(filtered)}</TabsContent>
          <TabsContent value="certificates">{renderTable(certificates)}</TabsContent>
          <TabsContent value="badges">{renderTable(badges)}</TabsContent>
          <TabsContent value="attention">{renderTable(needsAttention)}</TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default SchoolCredentials;
