import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, CheckCircle, XCircle, Ban, RefreshCw } from "lucide-react";
import { useState } from "react";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending_review: "bg-yellow-100 text-yellow-800",
  active: "bg-green-100 text-green-800",
  rejected: "bg-destructive/10 text-destructive",
  suspended: "bg-orange-100 text-orange-800",
  inactive: "bg-muted text-muted-foreground",
};

const ALLOWED_TRANSITIONS: Record<string, { label: string; target: string; icon: any; variant: any; needsReason?: boolean }[]> = {
  pending_review: [
    { label: "Approve", target: "active", icon: CheckCircle, variant: "default" },
    { label: "Reject", target: "rejected", icon: XCircle, variant: "destructive", needsReason: true },
  ],
  active: [
    { label: "Suspend", target: "suspended", icon: Ban, variant: "destructive" },
    { label: "Deactivate", target: "inactive", icon: XCircle, variant: "outline" },
  ],
  suspended: [
    { label: "Reactivate", target: "active", icon: RefreshCw, variant: "default" },
  ],
  inactive: [
    { label: "Reactivate", target: "active", icon: RefreshCw, variant: "default" },
  ],
  rejected: [
    { label: "Allow Resubmission", target: "draft", icon: RefreshCw, variant: "outline" },
  ],
};

const ProviderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [rejectionReason, setRejectionReason] = useState("");

  const { data: provider, isLoading } = useQuery({
    queryKey: ["admin_provider_detail", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("providers")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: members } = useQuery({
    queryKey: ["admin_provider_members", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("provider_members")
        .select("id, user_id, role, status, joined_at")
        .eq("provider_id", id!)
        .order("joined_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const transitionMutation = useMutation({
    mutationFn: async ({ target, reason }: { target: string; reason?: string }) => {
      const updates: any = { status: target };
      if (target === "active") updates.approved_by = user?.id;
      if (target === "rejected") updates.rejection_reason = reason;
      const { error } = await (supabase as any)
        .from("providers")
        .update(updates)
        .eq("id", id!);
      if (error) throw error;
    },
    onSuccess: (_, { target }) => {
      toast({ title: `Provider ${target === "active" ? "approved" : target}` });
      qc.invalidateQueries({ queryKey: ["admin_provider_detail", id] });
      qc.invalidateQueries({ queryKey: ["admin_providers"] });
      setRejectionReason("");
    },
    onError: (err: any) => {
      toast({ title: "Action failed", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  if (!provider) {
    return <div className="p-6 text-muted-foreground">Provider not found.</div>;
  }

  const actions = ALLOWED_TRANSITIONS[provider.status] ?? [];

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <Button variant="ghost" size="sm" onClick={() => navigate("/admin/providers")}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Providers
      </Button>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{provider.display_name}</h1>
          <p className="text-muted-foreground text-sm mt-1">Legal: {provider.legal_name}</p>
        </div>
        <Badge className={statusColors[provider.status] ?? ""}>
          {provider.status?.replace(/_/g, " ")}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm">Identity</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div><span className="text-muted-foreground">Type:</span> <span className="capitalize">{provider.type?.replace(/_/g, " ")}</span></div>
            <div><span className="text-muted-foreground">Slug:</span> {provider.slug}</div>
            <div><span className="text-muted-foreground">Contact:</span> {provider.contact_email || "—"}</div>
            <div><span className="text-muted-foreground">Website:</span> {provider.website_url ? <a href={provider.website_url} target="_blank" rel="noreferrer" className="text-primary underline">{provider.website_url}</a> : "—"}</div>
            <div><span className="text-muted-foreground">Bio:</span> {provider.bio || "—"}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Governance</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div><span className="text-muted-foreground">Verification:</span> <span className="capitalize">{provider.verification_status}</span></div>
            <div><span className="text-muted-foreground">Created by:</span> <span className="font-mono text-xs">{provider.created_by || "—"}</span></div>
            <div><span className="text-muted-foreground">Approved by:</span> <span className="font-mono text-xs">{provider.approved_by || "—"}</span></div>
            <div><span className="text-muted-foreground">Approved at:</span> {provider.approved_at ? new Date(provider.approved_at).toLocaleString() : "—"}</div>
            {provider.rejection_reason && (
              <div><span className="text-muted-foreground">Rejection reason:</span> <span className="text-destructive">{provider.rejection_reason}</span></div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Members */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Members ({members?.length ?? 0})</CardTitle></CardHeader>
        <CardContent>
          {members?.length ? (
            <div className="space-y-1 text-sm">
              {members.map((m: any) => (
                <div key={m.id} className="flex gap-4 items-center">
                  <span className="font-mono text-xs text-muted-foreground w-60 truncate">{m.user_id}</span>
                  <Badge variant="outline" className="capitalize">{m.role}</Badge>
                  <Badge variant="secondary" className="capitalize">{m.status}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No members.</p>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      {actions.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Actions</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {actions.some(a => a.needsReason) && (
              <div className="space-y-2">
                <Label>Rejection reason</Label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Provide a reason for rejection…"
                />
              </div>
            )}
            <div className="flex gap-2">
              {actions.map((action) => (
                <Button
                  key={action.target}
                  variant={action.variant}
                  size="sm"
                  disabled={transitionMutation.isPending || (action.needsReason && !rejectionReason.trim())}
                  onClick={() => transitionMutation.mutate({
                    target: action.target,
                    reason: action.needsReason ? rejectionReason : undefined,
                  })}
                >
                  <action.icon className="h-4 w-4 mr-1" />
                  {action.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProviderDetail;
