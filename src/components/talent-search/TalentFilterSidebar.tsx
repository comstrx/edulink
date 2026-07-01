import { useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { RotateCcw, SlidersHorizontal, ShieldCheck } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import TaxonomyCompactSelect from "@/components/taxonomy/TaxonomyCompactSelect";
import TaxonomySingleSelect from "@/components/taxonomy/TaxonomySingleSelect";
import type { TalentFilters } from "./TalentSearchFilters";
import { emptyFilters, countActiveFilters } from "./TalentSearchFilters";

interface Props {
  filters: TalentFilters;
  onChange: (f: TalentFilters) => void;
}

/* ── Experience bucket (not taxonomy — numeric range) ── */
const ExpBucketSelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <div className="space-y-1">
    <Label className="text-[11px] font-medium text-muted-foreground">Years of Experience</Label>
    <Select value={value || "any"} onValueChange={(v) => onChange(v === "any" ? "" : v)}>
      <SelectTrigger className="h-8 text-xs border-border/60">
        <SelectValue placeholder="Any" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="any">Any</SelectItem>
        <SelectItem value="0-2">0–2 years</SelectItem>
        <SelectItem value="3-5">3–5 years</SelectItem>
        <SelectItem value="6-10">6–10 years</SelectItem>
        <SelectItem value="10+">10+ years</SelectItem>
      </SelectContent>
    </Select>
  </div>
);

const hdr = "text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-3 hover:no-underline";

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/*  Filter Content                                  */
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const FilterContent = ({ filters, onChange }: Props) => {
  const set = <K extends keyof TalentFilters>(key: K, val: TalentFilters[K]) =>
    onChange({ ...filters, [key]: val });

  return (
    <Accordion type="multiple" defaultValue={["location", "international", "work", "credentials", "verification"]} className="w-full space-y-2">

      {/* SECTION 0: LOCATION (Cascading) */}
      <AccordionItem value="location" className="border-b-0">
        <AccordionTrigger className={hdr}>Location</AccordionTrigger>
        <AccordionContent className="space-y-3 pt-1 pb-3">
          <TaxonomySingleSelect
            domainKey="regions"
            value={filters.regionId}
            onChange={(v) => {
              onChange({ ...filters, regionId: v, countryId: "", cityId: "" });
            }}
            label="Region"
            placeholder="Any region"
          />
          <TaxonomySingleSelect
            domainKey="countries"
            value={filters.countryId}
            onChange={(v) => {
              onChange({ ...filters, countryId: v, cityId: "" });
            }}
            label="Country"
            placeholder={filters.regionId ? "Any country" : "Select region first"}
            parentId={filters.regionId || undefined}
          />
          <TaxonomySingleSelect
            domainKey="cities"
            value={filters.cityId}
            onChange={(v) => set("cityId", v)}
            label="City / Area"
            placeholder={filters.countryId ? "Any city" : "Select country first"}
            parentId={filters.countryId || undefined}
          />
          <p className="text-[10px] text-muted-foreground/70">Region → Country → City</p>
        </AccordionContent>
      </AccordionItem>

      <div className="border-t border-border/40" />

      {/* SECTION 1: INTERNATIONAL PROFILE */}
      <AccordionItem value="international" className="border-b-0">
        <AccordionTrigger className={hdr}>International Profile</AccordionTrigger>
        <AccordionContent className="space-y-3 pt-1 pb-3">
          <TaxonomyCompactSelect
            domainKey="languages"
            values={filters.languages}
            onChange={(v) => set("languages", v)}
            label="Languages"
            placeholder="Any language"
          />
          <TaxonomyCompactSelect
            domainKey="nationalities"
            values={filters.nationalities}
            onChange={(v) => set("nationalities", v)}
            label="Nationality"
            placeholder="Any nationality"
          />
        </AccordionContent>
      </AccordionItem>

      <div className="border-t border-border/40" />

      {/* SECTION 2: WORK PREFERENCES */}
      <AccordionItem value="work" className="border-b-0">
        <AccordionTrigger className={hdr}>Work Preferences</AccordionTrigger>
        <AccordionContent className="space-y-3 pt-1 pb-3">
          <TaxonomyCompactSelect
            domainKey="work_arrangements"
            values={filters.workArrangements}
            onChange={(v) => set("workArrangements", v)}
            label="Work Arrangement"
            placeholder="Any arrangement"
          />
          <TaxonomyCompactSelect
            domainKey="employment_types"
            values={filters.employmentTypes}
            onChange={(v) => set("employmentTypes", v)}
            label="Employment Type"
            placeholder="Any type"
          />
          <TaxonomyCompactSelect
            domainKey="availability_status"
            values={filters.availabilityStatuses}
            onChange={(v) => set("availabilityStatuses", v)}
            label="Availability"
            placeholder="Any availability"
          />
        </AccordionContent>
      </AccordionItem>

      <div className="border-t border-border/40" />

      {/* SECTION 3: EXPERIENCE & CREDENTIALS */}
      <AccordionItem value="credentials" className="border-b-0">
        <AccordionTrigger className={hdr}>Experience & Credentials</AccordionTrigger>
        <AccordionContent className="space-y-3 pt-1 pb-3">
          <ExpBucketSelect value={filters.expBucket} onChange={(v) => set("expBucket", v)} />
          <TaxonomyCompactSelect
            domainKey="certifications"
            values={filters.certifications}
            onChange={(v) => set("certifications", v)}
            label="Certifications"
            placeholder="Any certification"
          />
        </AccordionContent>
      </AccordionItem>

      <div className="border-t border-border/40" />

      {/* SECTION 4: VERIFICATION */}
      <AccordionItem value="verification" className="border-b-0">
        <AccordionTrigger className={hdr}>Verification</AccordionTrigger>
        <AccordionContent className="pt-1 pb-3">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="verified-toggle" className="text-xs flex items-center gap-1.5 cursor-pointer">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              Verified teachers only
            </Label>
            <Switch
              id="verified-toggle"
              checked={filters.verifiedOnly}
              onCheckedChange={(v) => set("verifiedOnly", v)}
            />
          </div>
          <p className="text-[10px] text-muted-foreground/70 mt-1.5">Show only teachers with fully verified credentials</p>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/*  Sidebar wrapper                                  */
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const TalentFilterSidebar = ({ filters, onChange }: Props) => {
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);
  const activeCount = countActiveFilters(filters);
  const hasFilters = activeCount > 0;

  if (isMobile) {
    return (
      <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button size="lg" className="rounded-full shadow-lg gap-2 px-6">
              <SlidersHorizontal className="h-4 w-4" />
              Filters{activeCount > 0 ? ` (${activeCount})` : ""}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[85vh] flex flex-col rounded-t-xl">
            <SheetHeader className="pb-2">
              <div className="flex items-center justify-between">
                <SheetTitle className="text-sm font-semibold">Filters {activeCount > 0 && `(${activeCount})`}</SheetTitle>
                {hasFilters && (
                  <Button variant="link" size="sm" onClick={() => onChange(emptyFilters)} className="text-xs h-auto p-0 text-destructive">Clear All</Button>
                )}
              </div>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-1">
              <FilterContent filters={filters} onChange={onChange} />
            </div>
            <div className="border-t pt-3 pb-2">
              <Button className="w-full" onClick={() => setMobileOpen(false)}>Show Results</Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  return (
    <aside className="hidden lg:flex w-[232px] shrink-0 flex-col sticky top-20 self-start max-h-[calc(100vh-6rem)]">
      <div className="rounded-md border border-border/50 bg-card p-3.5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <SlidersHorizontal className="h-3 w-3" />
            Advanced Filters {activeCount > 0 && <span className="font-normal text-muted-foreground/70">({activeCount})</span>}
          </h2>
          {hasFilters && (
            <Button variant="link" size="sm" onClick={() => onChange(emptyFilters)} className="text-[11px] h-auto p-0 text-destructive">Clear</Button>
          )}
        </div>
        <div className="overflow-y-auto max-h-[calc(100vh-10rem)] pr-1 -mr-1">
          <FilterContent filters={filters} onChange={onChange} />
        </div>
      </div>
    </aside>
  );
};

export default TalentFilterSidebar;
