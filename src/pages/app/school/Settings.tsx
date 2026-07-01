import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrentSchoolWorkspace } from "@/hooks/useCurrentSchoolWorkspace";
import { safeMutation } from "@/lib/safe-mutation";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Building, Save, Settings } from "lucide-react";

const SchoolSettings = () => {
  const { user, roles } = useAuth();
  const { workspace } = useCurrentSchoolWorkspace();
  const isAdmin = roles.includes("school_admin");

  // Org-level state
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [orgLoading, setOrgLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // User-level preference
  const [preferredStart, setPreferredStart] = useState<string>("");
  const [prefLoading, setPrefLoading] = useState(true);

  // Load org-level data from school_organizations
  useEffect(() => {
    if (!workspace?.schoolId) { setOrgLoading(false); return; }
    supabase
      .from("school_organizations")
      .select("name, slug, logo_url")
      .eq("id", workspace.schoolId)
      .maybeSingle()
      .then(({ data }) => {
        setOrgName(data?.name ?? "");
        setOrgSlug(data?.slug ?? "");
        setOrgLoading(false);
      });
  }, [workspace?.schoolId]);

  // Load user-level preferred_start from school_profiles (user-scoped, correct)
  useEffect(() => {
    if (!user) { setPrefLoading(false); return; }
    supabase
      .from("school_profiles")
      .select("preferred_start")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setPreferredStart(data?.preferred_start ?? "");
        setPrefLoading(false);
      });
  }, [user]);

  const handleSaveOrg = async () => {
    if (!workspace?.schoolId || !isAdmin) return;
    setSaving(true);
    const { success } = await safeMutation(
      () =>
        supabase
          .from("school_organizations")
          .update({ name: orgName, slug: orgSlug || null })
          .eq("id", workspace.schoolId),
      {
        successMessage: "Organization settings saved",
        errorMessage: "Failed to save settings",
      }
    );
    setSaving(false);
  };

  const handlePreferredStartChange = async (value: string) => {
    if (!user) return;
    const previous = preferredStart;
    setPreferredStart(value);
    const { success } = await safeMutation(
      () =>
        supabase
          .from("school_profiles")
          .upsert(
            { user_id: user.id, preferred_start: value },
            { onConflict: "user_id" }
          ),
      {
        successMessage: "Default start page updated",
        errorMessage: "Failed to update start page",
      }
    );
    if (!success) setPreferredStart(previous);
  };

  const loading = orgLoading || prefLoading;

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" />
          Settings
        </h1>
        <p className="text-muted-foreground">
          {workspace ? `${workspace.schoolName} — School settings` : "School settings"}
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="h-40 bg-muted/50 rounded-lg animate-pulse" />
          <div className="h-24 bg-muted/50 rounded-lg animate-pulse" />
        </div>
      ) : (
        <>
          {/* Organization Settings — org-scoped */}
          {isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Building className="h-4 w-4 text-primary" />
                  Organization
                </CardTitle>
                <CardDescription>
                  Manage your school's organization details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="orgName">School Name</Label>
                  <Input
                    id="orgName"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="Enter school name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="orgSlug">URL Slug</Label>
                  <Input
                    id="orgSlug"
                    value={orgSlug}
                    onChange={(e) => setOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                    placeholder="school-url-slug"
                  />
                  <p className="text-xs text-muted-foreground">
                    Used in public-facing URLs for your school
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Plan</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground capitalize">
                      {workspace?.plan ?? "free"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      (Manage plan in Billing)
                    </span>
                  </div>
                </div>

                <Button onClick={handleSaveOrg} disabled={saving} size="sm">
                  <Save className="h-4 w-4 mr-1.5" />
                  {saving ? "Saving…" : "Save Changes"}
                </Button>
              </CardContent>
            </Card>
          )}

          <Separator />

          {/* User Preferences — user-scoped */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Your Preferences</CardTitle>
              <CardDescription>
                Personal settings for your school workspace
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Default start page</Label>
                <Select value={preferredStart} onValueChange={handlePreferredStartChange}>
                  <SelectTrigger className="w-60">
                    <SelectValue placeholder="Choose default..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hiring">Hiring</SelectItem>
                    <SelectItem value="training">Training</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Where you land after login
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default SchoolSettings;
