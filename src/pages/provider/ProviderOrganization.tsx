import { useState } from "react";
import { useProviderMembership } from "@/hooks/useProviderProfile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateProvider } from "@/lib/supabase-typed-queries";
import { toast } from "sonner";
import { Pencil, Save, X } from "lucide-react";
import ProviderStatusBanner from "@/components/provider/ProviderStatusBanner";
import { providerOrgSchema, firstZodError } from "@/lib/validation-schemas";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending_review: "bg-yellow-100 text-yellow-800",
  active: "bg-green-100 text-green-800",
  rejected: "bg-destructive/10 text-destructive",
  suspended: "bg-orange-100 text-orange-800",
  inactive: "bg-muted text-muted-foreground",
};

const ProviderOrganization = () => {
  const { data: membership, isLoading } = useProviderMembership();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    display_name: "",
    bio: "",
    website_url: "",
    contact_email: "",
    logo_url: "",
    cover_url: "",
  });

  const provider = membership?.provider;
  const isSuspended = provider?.status === "suspended";
  const canEdit = membership && ["owner", "admin"].includes(membership.role) && !isSuspended;

  const startEditing = () => {
    if (!provider) return;
    setForm({
      display_name: provider.display_name || "",
      bio: provider.bio || "",
      website_url: provider.website_url || "",
      contact_email: provider.contact_email || "",
      logo_url: provider.logo_url || "",
      cover_url: (provider as Record<string, any>).cover_url || "",
    });
    setEditing(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const parsed = providerOrgSchema.safeParse(form);
      if (!parsed.success) throw new Error(firstZodError(parsed.error));

      await updateProvider(provider!.id, {
        display_name: parsed.data.display_name,
        bio: parsed.data.bio || null,
        website_url: parsed.data.website_url || null,
        contact_email: parsed.data.contact_email || null,
        logo_url: parsed.data.logo_url || null,
        cover_url: parsed.data.cover_url || null,
      });
    },
    onSuccess: () => {
      toast.success("Organization updated");
      setEditing(false);
      qc.invalidateQueries({ queryKey: ["provider_membership"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Update failed");
    },
  });

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[50vh]"><p className="text-muted-foreground">Loading…</p></div>;
  }
  if (!membership || !provider) {
    return <div className="p-8"><p className="text-muted-foreground">No provider found.</p></div>;
  }

  const governedFields = [
    { label: "Status", value: <Badge className={statusColors[provider.status] ?? ""}>{provider.status.replace(/_/g, " ")}</Badge> },
    { label: "Verification", value: <Badge variant="outline" className="capitalize">{provider.verification_status}</Badge> },
    { label: "Provider Type", value: <span className="capitalize">{provider.type.replace(/_/g, " ")}</span> },
    { label: "Slug", value: provider.slug },
    { label: "Legal Name", value: provider.legal_name },
    { label: "Created", value: new Date(provider.created_at).toLocaleDateString() },
  ];

  if (provider.rejection_reason) {
    governedFields.push({ label: "Rejection Reason", value: <span className="text-destructive">{provider.rejection_reason}</span> });
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Organization</h1>
          <p className="text-muted-foreground mt-1">Provider identity and profile.</p>
        </div>
        {canEdit && !editing && (
          <Button variant="outline" size="sm" onClick={startEditing}>
            <Pencil className="h-4 w-4 mr-1" /> Edit
          </Button>
        )}
      </div>

      <ProviderStatusBanner status={provider.status} rejectionReason={provider.rejection_reason} />

      {/* Governed fields (read-only) */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Governance (Read-only)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {governedFields.map(({ label, value }) => (
            <div key={label} className="flex justify-between items-center border-b border-border pb-2 last:border-0">
              <span className="text-sm text-muted-foreground">{label}</span>
              <span className="text-sm font-medium">{value}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Editable fields */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Profile {editing ? "(Editing)" : ""}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {editing ? (
            <>
              <div className="space-y-2">
                <Label>Display Name</Label>
                <Input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Bio</Label>
                <Textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={3} />
              </div>
              <div className="space-y-2">
                <Label>Contact Email</Label>
                <Input value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Website URL</Label>
                <Input value={form.website_url} onChange={(e) => setForm({ ...form, website_url: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Logo URL</Label>
                <Input value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Cover Image URL</Label>
                <Input value={form.cover_url} onChange={(e) => setForm({ ...form, cover_url: e.target.value })} />
              </div>
              <div className="flex gap-2">
                <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.display_name.trim()}>
                  <Save className="h-4 w-4 mr-1" /> Save
                </Button>
                <Button variant="ghost" onClick={() => setEditing(false)}>
                  <X className="h-4 w-4 mr-1" /> Cancel
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              {[
                { label: "Display Name", value: provider.display_name },
                { label: "Bio", value: provider.bio || "—" },
                { label: "Contact Email", value: provider.contact_email || "—" },
                { label: "Website", value: provider.website_url || "—" },
                { label: "Logo URL", value: provider.logo_url || "—" },
                { label: "Cover URL", value: (provider as Record<string, any>).cover_url || "—" },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center border-b border-border pb-2 last:border-0">
                  <span className="text-sm text-muted-foreground">{label}</span>
                  <span className="text-sm font-medium truncate max-w-[60%] text-right">{value}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProviderOrganization;
