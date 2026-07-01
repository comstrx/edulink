import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { applyProviderPublicFilters } from "@/lib/visibility-rules";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ProviderTrustBadge from "@/components/provider/ProviderTrustBadge";
import { Loader2, Globe, MapPin, BookOpen, ExternalLink, Award, Calendar } from "lucide-react";

const ProviderProfile = () => {
  const { slug } = useParams<{ slug: string }>();

  const { data: provider, isLoading, error } = useQuery({
    queryKey: ["public_provider", slug],
    queryFn: async () => {
      if (!slug) return null;
      const { data, error } = await applyProviderPublicFilters(
        supabase
          .from("providers")
          .select("id, display_name, slug, logo_url, cover_url, bio, website_url, country_term_id, city_term_id, type, status, verification_status, updated_at")
      )
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  const locationTermIds = [provider?.country_term_id, provider?.city_term_id].filter(Boolean) as string[];
  const { data: locationMap } = useQuery({
    queryKey: ["provider_location_terms", locationTermIds],
    queryFn: async () => {
      const { data } = await supabase.from("taxonomy_terms").select("id, name").in("id", locationTermIds);
      const map: Record<string, string> = {};
      data?.forEach((t) => (map[t.id] = t.name));
      return map;
    },
    enabled: locationTermIds.length > 0,
  });

  const { data: items } = useQuery({
    queryKey: ["public_provider_items", provider?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_items")
        .select("id, title, slug, type, short_description, duration, credential_eligible, updated_at")
        .eq("provider_id", provider.id)
        .eq("ownership_type", "provider")
        .eq("review_status", "approved")
        .eq("is_active", true)
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!provider?.id,
  });

  // Credential count for this provider
  const { data: credentialCount } = useQuery({
    queryKey: ["provider_credential_count", provider?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("earned_credentials")
        .select("id", { count: "exact", head: true })
        .eq("issuer_provider_id", provider.id)
        .eq("status", "active");
      if (error) return 0;
      return count ?? 0;
    },
    enabled: !!provider?.id,
  });

  const typeCounts = (items ?? []).reduce<Record<string, number>>((acc, i) => {
    acc[i.type] = (acc[i.type] || 0) + 1;
    return acc;
  }, {});

  const countryName = provider?.country_term_id && locationMap ? locationMap[provider.country_term_id] : null;
  const cityName = provider?.city_term_id && locationMap ? locationMap[provider.city_term_id] : null;
  const locationStr = [cityName, countryName].filter(Boolean).join(", ");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !provider) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-16 text-center space-y-4">
        <h1 className="text-3xl font-bold text-foreground">Provider Not Found</h1>
        <p className="text-muted-foreground">This provider doesn't exist or is not currently active.</p>
        <Button asChild><Link to="/training/courses">Browse Catalog</Link></Button>
      </div>
    );
  }

  const TYPE_LABELS: Record<string, string> = { course: "Courses", package: "Packages", pathway: "Pathways" };

  return (
    <div className="space-y-0 pb-16">
      {/* Cover + Identity */}
      <section className="relative bg-muted/40 border-b border-border">
        {provider.cover_url && (
          <div className="h-48 w-full overflow-hidden">
            <img src={provider.cover_url} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex items-start gap-5">
            {provider.logo_url ? (
              <img src={provider.logo_url} alt={`${provider.display_name} logo`} className="h-16 w-16 rounded-lg object-cover border border-border bg-background shrink-0" />
            ) : (
              <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-xl font-bold text-primary">{provider.display_name?.[0]}</span>
              </div>
            )}
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">{provider.display_name}</h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <Badge variant="secondary" className="capitalize">{provider.type?.replace(/_/g, " ")}</Badge>
                <ProviderTrustBadge verificationStatus={provider.verification_status} size="md" />
                {locationStr && (
                  <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {locationStr}</span>
                )}
                {provider.website_url && (
                  <a href={provider.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                    <Globe className="h-3.5 w-3.5" /> Website <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-10">
        {/* Trust & Activity Signals */}
        <section className="grid sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <BookOpen className="h-5 w-5 text-primary" />
              <div>
                <p className="text-lg font-semibold text-foreground">{items?.length ?? 0}</p>
                <p className="text-xs text-muted-foreground">Approved Programs</p>
              </div>
            </CardContent>
          </Card>
          {(credentialCount ?? 0) > 0 && (
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <Award className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-lg font-semibold text-foreground">{credentialCount}</p>
                  <p className="text-xs text-muted-foreground">Credentials Issued</p>
                </div>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {new Date(provider.updated_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </p>
                <p className="text-xs text-muted-foreground">Last Updated</p>
              </div>
            </CardContent>
          </Card>
        </section>

        {provider.bio && (
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">About</h2>
            <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{provider.bio}</p>
          </section>
        )}

        {Object.keys(typeCounts).length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">Training Offered</h2>
            <div className="flex gap-3">
              {Object.entries(typeCounts).map(([type, count]) => (
                <Badge key={type} variant="outline" className="text-sm px-3 py-1">
                  {count} {TYPE_LABELS[type] || type}
                </Badge>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4">
            {items?.length ? `${items.length} Training Items` : "No Training Items Yet"}
          </h2>
          {items && items.length > 0 ? (
            <div className="grid sm:grid-cols-2 gap-4">
              {items.map((item) => (
                <Card key={item.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="text-xs capitalize">{item.type}</Badge>
                      {item.credential_eligible && <Badge className="text-xs">Credential</Badge>}
                    </div>
                    <CardTitle className="text-base">
                      <Link to={`/training/${item.slug}`} className="hover:underline">{item.title}</Link>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {item.short_description && <p className="text-sm text-muted-foreground line-clamp-2">{item.short_description}</p>}
                    {item.duration && <p className="text-xs text-muted-foreground mt-2">Duration: {item.duration}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p>This provider hasn't published any training items yet.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default ProviderProfile;
