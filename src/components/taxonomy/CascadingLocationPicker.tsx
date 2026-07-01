import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchTermsByDomain, fetchCountriesByRegion, fetchCitiesByCountry, type TaxonomyTerm } from "@/lib/taxonomy-api";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CascadingLocationPickerProps {
  regionId: string;
  countryId: string;
  cityId: string;
  onRegionChange: (id: string) => void;
  onCountryChange: (id: string) => void;
  onCityChange: (id: string) => void;
  locale?: "en" | "ar";
  disabled?: boolean;
}

const NONE = "__none__";

const getLabel = (term: TaxonomyTerm, locale: "en" | "ar") =>
  locale === "ar" && term.name_ar ? term.name_ar : (term.name_en || term.name);

const CascadingLocationPicker = ({
  regionId,
  countryId,
  cityId,
  onRegionChange,
  onCountryChange,
  onCityChange,
  locale = "en",
  disabled = false,
}: CascadingLocationPickerProps) => {
  // Fetch regions (root)
  const { data: regions } = useQuery({
    queryKey: ["taxonomy_regions"],
    queryFn: () => fetchTermsByDomain("regions"),
  });

  // Fetch countries filtered by selected region
  const { data: countries } = useQuery({
    queryKey: ["taxonomy_countries_by_region", regionId],
    enabled: !!regionId,
    queryFn: () => fetchCountriesByRegion(regionId),
  });

  // Fetch cities filtered by selected country
  const { data: cities } = useQuery({
    queryKey: ["taxonomy_cities_by_country", countryId],
    enabled: !!countryId,
    queryFn: () => fetchCitiesByCountry(countryId),
  });

  const handleRegionChange = (val: string) => {
    const id = val === NONE ? "" : val;
    onRegionChange(id);
    onCountryChange("");
    onCityChange("");
  };

  const handleCountryChange = (val: string) => {
    const id = val === NONE ? "" : val;
    onCountryChange(id);
    onCityChange("");
  };

  const handleCityChange = (val: string) => {
    onCityChange(val === NONE ? "" : val);
  };

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-muted-foreground">
        Hierarchy: Region → Country → City/Area
      </p>

      {/* Region */}
      <div className="space-y-1">
        <Label className="text-xs font-medium">Region</Label>
        <Select value={regionId || NONE} onValueChange={handleRegionChange} disabled={disabled}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Select region…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>— None —</SelectItem>
            {regions?.map((r) => (
              <SelectItem key={r.id} value={r.id}>{getLabel(r, locale)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Country */}
      <div className="space-y-1">
        <Label className="text-xs font-medium">Country</Label>
        <Select
          value={countryId || NONE}
          onValueChange={handleCountryChange}
          disabled={disabled || !regionId}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder={regionId ? "Select country…" : "Select region first"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>— None —</SelectItem>
            {countries?.map((c) => (
              <SelectItem key={c.id} value={c.id}>{getLabel(c, locale)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* City */}
      <div className="space-y-1">
        <Label className="text-xs font-medium">City / Area</Label>
        <Select
          value={cityId || NONE}
          onValueChange={handleCityChange}
          disabled={disabled || !countryId}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder={countryId ? "Select city…" : "Select country first"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>— None —</SelectItem>
            {cities?.map((c) => (
              <SelectItem key={c.id} value={c.id}>{getLabel(c, locale)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default CascadingLocationPicker;
