import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import JobsSubnav from "@/components/JobsSubnav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, ChevronRight } from "lucide-react";

const useTermsByDomain = (domainKey: string, parentId?: string) =>
  useQuery({
    queryKey: ["taxonomy_terms_by_key", domainKey, parentId ?? "all"],
    queryFn: async () => {
      const { data: tt, error: ttErr } = await supabase.from("taxonomy_term_types").select("id").eq("key", domainKey).eq("is_active", true).single();
      if (ttErr) throw ttErr;
      let q = supabase.from("taxonomy_terms").select("id, name").eq("term_type_id", tt.id).eq("is_active", true);
      if (parentId) q = q.eq("parent_id", parentId);
      const { data, error } = await q.order("sort_order").order("name");
      if (error) throw error;
      return data;
    },
  });

const JobsByRegion = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [selectedCountryId, setSelectedCountryId] = useState("");
  const [selectedRegionId, setSelectedRegionId] = useState("");

  const { data: countries, isLoading: countriesLoading } = useTermsByDomain("countries");
  const { data: regions, isLoading: regionsLoading } = useTermsByDomain("regions", selectedCountryId || undefined);

  const selectedCountryName = countries?.find((c) => c.id === selectedCountryId)?.name;

  const handleCountryClick = (id: string) => { setSelectedCountryId(id); setSelectedRegionId(""); };

  const handleViewJobs = () => {
    const params = new URLSearchParams();
    if (selectedCountryId) params.set("country", selectedCountryId);
    if (selectedRegionId) params.set("region", selectedRegionId);
    navigate(`/jobs?${params.toString()}`);
  };

  return (
    <>
      <JobsSubnav />
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t("jobs.region.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("jobs.region.subtitle")}</p>
        </div>

        {countries && countries.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-muted-foreground mr-1 self-center">{t("jobs.region.popular")}</span>
            {countries.slice(0, 6).map((c) => (
              <Badge key={c.id} variant={selectedCountryId === c.id ? "default" : "secondary"} className="cursor-pointer gap-1 hover:bg-accent transition-colors" onClick={() => handleCountryClick(c.id)}>
                <MapPin className="h-3 w-3" /> {c.name}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="lg:w-72 shrink-0 space-y-2">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">{t("jobs.region.countries")}</h2>
            {countriesLoading ? (
              <p className="text-sm text-muted-foreground">{t("jobs.region.loading")}</p>
            ) : !countries?.length ? (
              <p className="text-sm text-muted-foreground">{t("jobs.region.noCountries")}</p>
            ) : (
              <div className="space-y-1">
                {countries.map((c) => (
                  <button key={c.id} onClick={() => handleCountryClick(c.id)} className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center justify-between transition-colors ${selectedCountryId === c.id ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted text-foreground"}`}>
                    {c.name}<ChevronRight className="h-4 w-4 opacity-50" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 space-y-4">
            {!selectedCountryId ? (
              <Card><CardContent className="py-12 text-center"><MapPin className="h-8 w-8 mx-auto text-muted-foreground mb-2" /><p className="text-muted-foreground">{t("jobs.region.selectCountry")}</p><Button variant="secondary" size="sm" className="mt-4" onClick={() => navigate("/jobs")}>{t("jobs.region.viewAllJobs")}</Button></CardContent></Card>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground">{t("jobs.region.regionsIn")} {selectedCountryName}</h2>
                  <Button variant="ghost" size="sm" onClick={() => { setSelectedCountryId(""); setSelectedRegionId(""); }}>{t("jobs.region.clear")}</Button>
                </div>
                <Button onClick={() => navigate(`/jobs?country=${selectedCountryId}`)} className="gap-2 w-full sm:w-auto">
                  {t("jobs.region.viewJobsIn")} {selectedCountryName} <ChevronRight className="h-4 w-4" />
                </Button>
                {regionsLoading ? (
                  <p className="text-sm text-muted-foreground">{t("jobs.region.loadingRegions")}</p>
                ) : !regions?.length ? (
                  <Card><CardContent className="py-8 text-center"><p className="text-muted-foreground">{t("jobs.region.noRegions")}</p></CardContent></Card>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {regions.map((r) => (
                      <button key={r.id} onClick={() => setSelectedRegionId(r.id === selectedRegionId ? "" : r.id)} className={`rounded-lg border px-4 py-3 text-left text-sm transition-colors ${selectedRegionId === r.id ? "border-primary bg-primary/10 text-foreground font-medium" : "border-border hover:border-primary/50 text-foreground"}`}>
                        {r.name}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default JobsByRegion;
