import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Plus, ShieldAlert, Lock, AlertTriangle, Info } from "lucide-react";
import TaxonomySingleSelect from "@/components/taxonomy/TaxonomySingleSelect";
import TaxonomyMultiSelect from "@/components/taxonomy/TaxonomyMultiSelect";
import CascadingLocationPicker from "@/components/taxonomy/CascadingLocationPicker";
import { isLocationDomain as checkIsLocation, LOCATION_TYPES } from "@/lib/taxonomy-api";
import { checkTermUsage, checkDomainUsage, type TermUsageResult } from "@/lib/taxonomy-governance";

interface TermForm {
  name: string;
  name_en: string;
  name_ar: string;
  slug: string;
  is_active: boolean;
  parent_id: string | null;
}

const emptyForm: TermForm = { name: "", name_en: "", name_ar: "", slug: "", is_active: true, parent_id: null };

const Taxonomy = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selectedDomain, setSelectedDomain] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TermForm>(emptyForm);

  // Deactivation confirm dialog
  const [deactivateConfirm, setDeactivateConfirm] = useState<{
    type: "term" | "domain";
    id: string;
    name: string;
    usage?: TermUsageResult;
    domainUsage?: { activeTermCount: number; hasTermsInUse: boolean };
    isSystem?: boolean;
  } | null>(null);

  // Slug lock state for editing
  const [slugLocked, setSlugLocked] = useState(false);

  // Demo state
  const [demoSingle, setDemoSingle] = useState("");
  const [demoMulti, setDemoMulti] = useState<string[]>([]);

  // Fetch term types (now includes is_system_domain)
  const { data: termTypes, isLoading: loadingTypes } = useQuery({
    queryKey: ["taxonomy_term_types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("taxonomy_term_types")
        .select("id, key, name, name_en, name_ar, is_active, is_system_domain")
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  // Strict location hierarchy
  const LOCATION_PARENT_MAP: Record<string, string> = {
    countries: "regions",
    cities: "countries",
    districts: "cities",
  };

  const selectedDomainKey = termTypes?.find((t) => t.id === selectedDomain)?.key;
  const selectedDomainObj = termTypes?.find((t) => t.id === selectedDomain);
  const isLocationType = selectedDomainKey ? checkIsLocation(selectedDomainKey) : false;
  const parentDomainKey = selectedDomainKey ? LOCATION_PARENT_MAP[selectedDomainKey] : undefined;
  const parentDomainType = parentDomainKey ? termTypes?.find((t) => t.key === parentDomainKey) : undefined;
  const showParentSelector = isLocationType && !!parentDomainKey;

  // Fetch terms for selected domain
  const { data: terms, isLoading: loadingTerms } = useQuery({
    queryKey: ["taxonomy_terms", selectedDomain],
    enabled: !!selectedDomain,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("taxonomy_terms")
        .select("id, name, name_en, name_ar, slug, code, is_active, parent_id, sort_order, meta")
        .eq("term_type_id", selectedDomain)
        .order("sort_order")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Cross-domain parent terms for location hierarchy
  const { data: crossDomainParents } = useQuery({
    queryKey: ["taxonomy_terms", parentDomainType?.id],
    enabled: !!parentDomainType,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("taxonomy_terms")
        .select("id, name")
        .eq("term_type_id", parentDomainType!.id)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["taxonomy_terms", selectedDomain] });
    // Also invalidate consumer-facing caches that use domain key
    qc.invalidateQueries({ queryKey: ["taxonomy_terms_by_key"] });
  };
  const invalidateTypes = () => {
    qc.invalidateQueries({ queryKey: ["taxonomy_term_types"] });
    // Domain changes may affect term fetching
    qc.invalidateQueries({ queryKey: ["taxonomy_terms_by_key"] });
  };

  const generateSlug = (text: string) =>
    text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const saveMutation = useMutation({
    mutationFn: async () => {
      const slug = form.slug.trim() || generateSlug(form.name_en || form.name);

      // Hierarchy validation for location types
      if (isLocationType && showParentSelector && form.parent_id) {
        // Verify parent belongs to correct domain
        if (parentDomainType) {
          const { data: parentTerm } = await supabase
            .from("taxonomy_terms")
            .select("term_type_id")
            .eq("id", form.parent_id)
            .single();
          if (parentTerm && parentTerm.term_type_id !== parentDomainType.id) {
            throw new Error(
              `Invalid parent: ${selectedDomainKey} terms can only have parents from ${parentDomainKey}.`
            );
          }
        }
      }

      // Non-location terms must NOT have a parent
      if (!isLocationType && form.parent_id) {
        throw new Error("Only location-type terms (countries, cities, districts) can have parent terms.");
      }

      const payload = {
        term_type_id: selectedDomain,
        name: form.name_en || form.name,
        name_en: form.name_en || form.name,
        name_ar: form.name_ar || null,
        slug,
        code: slug,
        is_active: form.is_active,
        parent_id: form.parent_id || null,
      };
      if (editingId) {
        const { error } = await supabase.from("taxonomy_terms").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("taxonomy_terms").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: editingId ? "Term updated" : "Term created" });
      invalidate();
      closeDialog();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("taxonomy_terms").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // --- GUARDED TOGGLE: check usage before deactivation ---
  const handleTermToggle = async (term: any, newActive: boolean) => {
    if (newActive) {
      // Reactivation is always safe
      toggleMutation.mutate({ id: term.id, is_active: true });
      return;
    }
    // Deactivation — check usage
    const usage = await checkTermUsage(term.id);
    if (usage.isInUse) {
      setDeactivateConfirm({
        type: "term",
        id: term.id,
        name: term.name_en || term.name,
        usage,
      });
    } else {
      toggleMutation.mutate({ id: term.id, is_active: false });
    }
  };

  // --- GUARDED DOMAIN TOGGLE ---
  const handleDomainToggle = async (domain: any, newActive: boolean) => {
    if (newActive) {
      // Reactivation — safe
      const { error } = await supabase
        .from("taxonomy_term_types")
        .update({ is_active: true })
        .eq("id", domain.id);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else invalidateTypes();
      return;
    }
    // System domain — block deactivation
    if (domain.is_system_domain) {
      const domainUsage = await checkDomainUsage(domain.id);
      setDeactivateConfirm({
        type: "domain",
        id: domain.id,
        name: domain.name_en || domain.name,
        isSystem: true,
        domainUsage,
      });
      return;
    }
    // Non-system domain — check usage
    const domainUsage = await checkDomainUsage(domain.id);
    if (domainUsage.hasTermsInUse || domainUsage.activeTermCount > 0) {
      setDeactivateConfirm({
        type: "domain",
        id: domain.id,
        name: domain.name_en || domain.name,
        isSystem: false,
        domainUsage,
      });
    } else {
      const { error } = await supabase
        .from("taxonomy_term_types")
        .update({ is_active: false })
        .eq("id", domain.id);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else invalidateTypes();
    }
  };

  const confirmDeactivation = async () => {
    if (!deactivateConfirm) return;
    if (deactivateConfirm.type === "term") {
      toggleMutation.mutate({ id: deactivateConfirm.id, is_active: false });
    } else {
      if (deactivateConfirm.isSystem && deactivateConfirm.domainUsage?.hasTermsInUse) {
        toast({
          title: "Blocked",
          description: "This protected system domain has terms in use. Cannot deactivate.",
          variant: "destructive",
        });
        setDeactivateConfirm(null);
        return;
      }
      const { error } = await supabase
        .from("taxonomy_term_types")
        .update({ is_active: false })
        .eq("id", deactivateConfirm.id);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else invalidateTypes();
    }
    setDeactivateConfirm(null);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setSlugLocked(false);
    setDialogOpen(true);
  };

  const openEdit = async (t: any) => {
    setEditingId(t.id);
    setForm({
      name: t.name,
      name_en: t.name_en || t.name,
      name_ar: t.name_ar || "",
      slug: t.slug || t.code || "",
      is_active: t.is_active,
      parent_id: t.parent_id,
    });
    // Check if slug should be locked
    const usage = await checkTermUsage(t.id);
    setSlugLocked(usage.isInUse);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    setSlugLocked(false);
  };

  const parentOptions = showParentSelector ? (crossDomainParents ?? []) : [];
  const getParentName = (pid: string | null) => {
    if (!pid) return "—";
    const found = crossDomainParents?.find((t) => t.id === pid) ?? terms?.find((t) => t.id === pid);
    return found?.name ?? "—";
  };

  // Cascading location picker demo state
  const [locRegion, setLocRegion] = useState("");
  const [locCountry, setLocCountry] = useState("");
  const [locCity, setLocCity] = useState("");

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-foreground">Taxonomy Admin</h1>
          <Badge variant="secondary">Governed · IDs-Only</Badge>
        </div>
        <p className="text-muted-foreground">
          Manage Term Types (Domains) and Terms. Core domains are protected. Deactivate, never delete.
        </p>
      </div>

      {/* Governance Info Panel */}
      <Alert className="border-primary/30 bg-primary/5">
        <Info className="h-4 w-4 text-primary" />
        <AlertTitle className="text-primary">Taxonomy Governance</AlertTitle>
        <AlertDescription className="space-y-1 text-sm text-muted-foreground">
          <ul className="list-disc pl-4 space-y-0.5">
            <li>Taxonomy is the <strong>system language</strong> — all structured data references term IDs.</li>
            <li><strong>IDs-only architecture</strong> is enforced across jobs, profiles, and filters.</li>
            <li>Core domains (marked <Lock className="inline h-3 w-3" />) are <strong>protected</strong> — their keys cannot change.</li>
            <li><strong>Deactivate</strong> instead of delete — no hard deletes through this UI.</li>
            <li>Slugs and type keys are <strong>stable identifiers</strong> — locked once in use.</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* Golden Rule */}
      <Alert>
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>Golden Rule — IDs Only</AlertTitle>
        <AlertDescription className="space-y-1 text-sm">
          <p>All Jobs/Training fields must store taxonomy term IDs only.</p>
          <p>Display labels are resolved at render time. Stored values are always UUIDs.</p>
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="domains">
        <TabsList>
          <TabsTrigger value="domains">Term Types (Domains)</TabsTrigger>
          <TabsTrigger value="terms">Terms</TabsTrigger>
          <TabsTrigger value="hierarchy">Location Picker</TabsTrigger>
          <TabsTrigger value="demo">Select Demo</TabsTrigger>
        </TabsList>

        {/* ─── DOMAINS TAB ─── */}
        <TabsContent value="domains">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Term Types (Domains)</CardTitle>
                <CardDescription>
                  System domains are locked. Keys are immutable after creation.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {loadingTypes ? (
                <p className="text-muted-foreground text-sm">Loading…</p>
              ) : termTypes && termTypes.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name (EN)</TableHead>
                      <TableHead>Name (AR)</TableHead>
                      <TableHead>Key</TableHead>
                      <TableHead>System</TableHead>
                      <TableHead>Active</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {termTypes.map((t: any) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{t.name_en || t.name}</TableCell>
                        <TableCell className="text-muted-foreground">{t.name_ar || "—"}</TableCell>
                        <TableCell>
                          <span className="font-mono text-muted-foreground text-sm flex items-center gap-1">
                            {t.is_system_domain && <Lock className="h-3 w-3 text-primary" />}
                            {t.key}
                          </span>
                        </TableCell>
                        <TableCell>
                          {t.is_system_domain ? (
                            <Badge variant="default" className="text-xs">Protected</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">Custom</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={t.is_active}
                            onCheckedChange={(v) => handleDomainToggle(t, v)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground text-sm">No data yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TERMS TAB ─── */}
        <TabsContent value="terms">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="space-y-1">
                <CardTitle>Terms</CardTitle>
                <CardDescription>Select a domain, then manage its terms. No hard deletes — deactivate only.</CardDescription>
              </div>
              <Button disabled={!selectedDomain} onClick={openCreate}>
                <Plus className="h-4 w-4 mr-1" /> Add Term
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-w-xs">
                <Label>Select Domain</Label>
                <Select value={selectedDomain} onValueChange={setSelectedDomain}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a domain…" />
                  </SelectTrigger>
                  <SelectContent>
                    {termTypes?.filter((d: any) => d.is_active).map((d: any) => (
                      <SelectItem key={d.id} value={d.id}>
                        <span className="flex items-center gap-1">
                          {d.is_system_domain && <Lock className="h-3 w-3" />}
                          {d.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {!selectedDomain && <p className="text-muted-foreground text-sm">Pick a domain above to see its terms.</p>}
              {selectedDomain && loadingTerms && <p className="text-muted-foreground text-sm">Loading…</p>}
              {selectedDomain && !loadingTerms && (
                <>
                  {terms && terms.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name (EN)</TableHead>
                          <TableHead>Name (AR)</TableHead>
                          <TableHead>Slug</TableHead>
                          <TableHead>Parent</TableHead>
                          <TableHead>Active</TableHead>
                          <TableHead className="w-24">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {terms.map((t) => (
                          <TableRow key={t.id}>
                            <TableCell className="font-medium">{t.name_en || t.name}</TableCell>
                            <TableCell className="text-muted-foreground">{t.name_ar || "—"}</TableCell>
                            <TableCell className="font-mono text-muted-foreground text-sm">{t.slug || t.code || "—"}</TableCell>
                            <TableCell className="text-sm">{getParentName(t.parent_id)}</TableCell>
                            <TableCell>
                              <Switch
                                checked={t.is_active}
                                onCheckedChange={(v) => handleTermToggle(t, v)}
                              />
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" onClick={() => openEdit(t)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-muted-foreground text-sm">No terms in this domain yet.</p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── HIERARCHY TAB ─── */}
        <TabsContent value="hierarchy">
          <Card>
            <CardHeader>
              <CardTitle>Cascading Location Picker</CardTitle>
              <CardDescription>
                Strict hierarchy: Region → Country → City. Only location types support parent-child relationships.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <CascadingLocationPicker
                  regionId={locRegion}
                  countryId={locCountry}
                  cityId={locCity}
                  onRegionChange={setLocRegion}
                  onCountryChange={setLocCountry}
                  onCityChange={setLocCity}
                />
                <div className="rounded-md border p-4 bg-muted/50 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">Output (IDs only):</p>
                  <div className="space-y-1 text-sm font-mono">
                    <p>region: <code className="text-primary">{locRegion || "—"}</code></p>
                    <p>country: <code className="text-primary">{locCountry || "—"}</code></p>
                    <p>city: <code className="text-primary">{locCity || "—"}</code></p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── DEMO TAB ─── */}
        <TabsContent value="demo">
          <Card>
            <CardHeader>
              <CardTitle>Taxonomy Select Demo</CardTitle>
              <CardDescription>Validates that reusable select components store IDs only.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <TaxonomySingleSelect
                    domainKey="subjects"
                    value={demoSingle}
                    onChange={setDemoSingle}
                    label="Single Select — Subjects"
                    placeholder="Pick a subject…"
                  />
                  <div className="rounded-md border p-3 bg-muted/50">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Stored Value (ID):</p>
                    <code className="text-sm break-all">{demoSingle || "—"}</code>
                  </div>
                </div>
                <div className="space-y-3">
                  <TaxonomyMultiSelect
                    domainKey="skills"
                    values={demoMulti}
                    onChange={setDemoMulti}
                    label="Multi Select — Skills"
                  />
                  <div className="rounded-md border p-3 bg-muted/50">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Stored Values (IDs):</p>
                    <code className="text-sm break-all">
                      {demoMulti.length > 0 ? JSON.stringify(demoMulti) : "—"}
                    </code>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── CREATE / EDIT DIALOG ─── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Term" : "Create Term"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Name (English) *</Label>
              <Input
                value={form.name_en}
                onChange={(e) => {
                  const val = e.target.value;
                  setForm({
                    ...form,
                    name_en: val,
                    name: val,
                    slug: slugLocked ? form.slug : (form.slug || generateSlug(val)),
                  });
                }}
                placeholder="Term name in English"
              />
            </div>
            <div className="space-y-1">
              <Label>Name (Arabic)</Label>
              <Input
                value={form.name_ar}
                onChange={(e) => setForm({ ...form, name_ar: e.target.value })}
                placeholder="اسم المصطلح بالعربية"
                dir="rtl"
              />
            </div>
            <div className="space-y-1">
              <Label className="flex items-center gap-1">
                Slug *
                {slugLocked && <Lock className="h-3 w-3 text-muted-foreground" />}
              </Label>
              {slugLocked ? (
                <>
                  <Input
                    value={form.slug}
                    disabled
                    className="font-mono text-sm bg-muted"
                  />
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Lock className="h-3 w-3" />
                    Slug is locked because this term is already in use.
                  </p>
                </>
              ) : (
                <Input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="auto-generated-slug"
                  className="font-mono text-sm"
                />
              )}
            </div>
            {showParentSelector ? (
              <div className="space-y-1">
                <Label>Parent (from {parentDomainType?.name ?? parentDomainKey})</Label>
                <p className="text-xs text-muted-foreground">
                  Hierarchy allowed only for locations: Region → Country → City
                </p>
                <Select
                  value={form.parent_id ?? "__none__"}
                  onValueChange={(v) => setForm({ ...form, parent_id: v === "__none__" ? null : v })}
                >
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {parentOptions.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : isLocationType && selectedDomainKey === "regions" ? (
              <p className="text-[11px] text-muted-foreground italic">
                Regions are root-level — no parent selector.
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground italic">
                Parent hierarchy is only available for location types (countries, cities, districts). Non-location terms cannot have parents.
              </p>
            )}
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button disabled={!form.name_en.trim() || saveMutation.isPending} onClick={() => saveMutation.mutate()}>
              {saveMutation.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── DEACTIVATION CONFIRM DIALOG ─── */}
      <Dialog open={!!deactivateConfirm} onOpenChange={() => setDeactivateConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirm Deactivation
            </DialogTitle>
            <DialogDescription>
              Review the impact before deactivating.
            </DialogDescription>
          </DialogHeader>
          {deactivateConfirm && (
            <div className="space-y-3 py-2">
              <p className="text-sm">
                You are about to deactivate{" "}
                <strong>{deactivateConfirm.name}</strong>.
              </p>

              {deactivateConfirm.type === "term" && deactivateConfirm.usage && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Term is in use</AlertTitle>
                  <AlertDescription className="text-sm">
                    This term is referenced in{" "}
                    <strong>{deactivateConfirm.usage.usageCount}</strong> record(s)
                    across: <strong>{deactivateConfirm.usage.usedIn.join(", ")}</strong>.
                    <br />
                    Deactivating may affect filters, matching, and display.
                    Existing references will NOT be auto-removed.
                  </AlertDescription>
                </Alert>
              )}

              {deactivateConfirm.type === "domain" && (
                <>
                  {deactivateConfirm.isSystem && (
                    <Alert variant="destructive">
                      <ShieldAlert className="h-4 w-4" />
                      <AlertTitle>Protected System Domain</AlertTitle>
                      <AlertDescription className="text-sm">
                        This is a core system domain used by the platform infrastructure.
                        {deactivateConfirm.domainUsage?.hasTermsInUse
                          ? " It has terms currently in use — deactivation is BLOCKED."
                          : " Proceed with extreme caution."}
                      </AlertDescription>
                    </Alert>
                  )}
                  {deactivateConfirm.domainUsage && (
                    <p className="text-sm text-muted-foreground">
                      Active terms: <strong>{deactivateConfirm.domainUsage.activeTermCount}</strong>
                      {deactivateConfirm.domainUsage.hasTermsInUse && " (some are in use)"}
                    </p>
                  )}
                </>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeactivateConfirm(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={
                deactivateConfirm?.isSystem && deactivateConfirm?.domainUsage?.hasTermsInUse
              }
              onClick={confirmDeactivation}
            >
              Deactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Taxonomy;
