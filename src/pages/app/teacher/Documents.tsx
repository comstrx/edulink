import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTeacherEarnedCredentials } from "@/hooks/useEarnedCredentials";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Award, ShieldCheck, GraduationCap, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Documents = () => {
  const { user } = useAuth();

  // Fetch teacher profile for CV
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["teacher-profile-docs", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("teacher_profiles")
        .select("id, cv_url, full_name")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // Canonical credential read — no inline query
  const { data: credentials, isLoading: credsLoading } = useTeacherEarnedCredentials();

  const isLoading = profileLoading || credsLoading;

  const docs: { label: string; type: string; icon: React.ReactNode; url?: string | null; meta?: string }[] = [];

  if (profile?.cv_url) {
    docs.push({ label: "CV / Resume", type: "CV", icon: <FileText className="h-4 w-4" />, url: profile.cv_url });
  }

  for (const cred of credentials ?? []) {
    docs.push({
      label: cred.title,
      type: cred.credential_kind === "badge" ? "Badge" : "Certificate",
      icon: cred.credential_kind === "badge" ? <Award className="h-4 w-4" /> : <GraduationCap className="h-4 w-4" />,
      meta: `Issued ${new Date(cred.issued_at).toLocaleDateString()} · ${cred.verification_code}`,
    });
  }

  return (
    <div className="container max-w-3xl py-8 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground">Documents</h1>
        <p className="text-sm text-muted-foreground">Your professional documents, certificates, and badges</p>
      </div>

      {!isLoading && docs.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center space-y-3">
            <Upload className="h-10 w-10 text-muted-foreground/40 mx-auto" />
            <p className="font-medium text-foreground">No documents yet</p>
            <p className="text-sm text-muted-foreground">Upload your CV and complete training to see documents here.</p>
            <Button asChild variant="outline" size="sm">
              <Link to="/app/teacher/profile">Upload CV</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {docs.length > 0 && (
        <div className="space-y-3">
          {docs.map((doc, i) => (
            <Card key={i}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    {doc.icon}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{doc.label}</p>
                    {doc.meta && <p className="text-xs text-muted-foreground">{doc.meta}</p>}
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs">{doc.type}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Documents;
