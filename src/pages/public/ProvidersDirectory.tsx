import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SearchPagination from "@/components/discovery/SearchPagination";
import TaxonomySingleSelect from "@/components/taxonomy/TaxonomySingleSelect";
import ProviderTrustBadge from "@/components/provider/ProviderTrustBadge";
import { useProviderDirectory } from "@/hooks/useProviderDirectory";
import { Search, MapPin, BookOpen, ArrowRight, Building2, Loader2, X } from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  course: "Courses",
  package: "Packages",
  pathway: "Pathways",
  library: "Libraries",
  resource: "Resources",
};

const ProvidersDirectory = () => {
  const {
    results,
    totalCount,
    totalPages,
    currentPage,
    isLoading,
    filters,
    updateFilters,
    resetFilters,
    setPage,
  } = useProviderDirectory();

  const hasActiveFilters = filters.searchQuery || filters.countryId || filters.contentType;

  return (
    <div className="pb-16">
      {/* Hero */}
      <section className="bg-muted/40 border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-12 space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Training Providers</h1>
          <p className="text-muted-foreground max-w-2xl">
            Explore verified teacher training providers and professional development programs on EduLink.
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Search & Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search providers..."
              value={filters.searchQuery}
              onChange={(e) => updateFilters({ searchQuery: e.target.value })}
              className="pl-9"
            />
          </div>
          <div className="flex gap-3 flex-wrap">
            <div className="w-48">
              <TaxonomySingleSelect
                domainKey="countries"
                value={filters.countryId}
                onChange={(v) => updateFilters({ countryId: v })}
                placeholder="All Countries"
                triggerClassName="h-10"
              />
            </div>
            <div className="w-44">
              <Select
                value={filters.contentType || "all"}
                onValueChange={(v) => updateFilters({ contentType: v === "all" ? "" : v })}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Content Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="course">Courses</SelectItem>
                  <SelectItem value="package">Packages</SelectItem>
                  <SelectItem value="pathway">Pathways</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters} className="text-destructive h-10 px-3">
                <X className="h-4 w-4 mr-1" /> Clear
              </Button>
            )}
          </div>
        </div>

        {/* Results count */}
        {!isLoading && (
          <p className="text-sm text-muted-foreground mb-6">
            {totalCount} provider{totalCount !== 1 ? "s" : ""} found
          </p>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && results.length === 0 && (
          <div className="text-center py-24 space-y-3">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground/40" />
            <h3 className="text-lg font-medium text-foreground">No providers found</h3>
            <p className="text-muted-foreground text-sm">Try adjusting your search or filters.</p>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={resetFilters}>
                Clear Filters
              </Button>
            )}
          </div>
        )}

        {/* Provider grid */}
        {!isLoading && results.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {results.map((provider) => (
              <Link key={provider.id} to={`/providers/${provider.slug}`} className="group">
                <Card className="h-full hover:shadow-md transition-shadow border-border">
                  <CardContent className="p-5 flex flex-col h-full">
                    {/* Logo + Name */}
                    <div className="flex items-start gap-3 mb-3">
                      {provider.logo_url ? (
                        <img
                          src={provider.logo_url}
                          alt={`${provider.display_name} logo`}
                          className="h-12 w-12 rounded-lg object-cover border border-border bg-background shrink-0"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-lg font-bold text-primary">
                            {provider.display_name?.[0]}
                          </span>
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                            {provider.display_name}
                          </h3>
                          <ProviderTrustBadge verificationStatus={provider.verification_status} />
                        </div>
                        {provider.country_name && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3" /> {provider.country_name}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bio */}
                    {provider.bio && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3 flex-1">
                        {provider.bio}
                      </p>
                    )}
                    {!provider.bio && <div className="flex-1" />}

                    {/* Footer: item types + count */}
                    <div className="flex items-center justify-between mt-auto pt-3 border-t border-border">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {provider.item_types.length > 0 ? (
                          provider.item_types.slice(0, 3).map((t) => (
                            <Badge key={t} variant="secondary" className="text-[10px] px-1.5 py-0 capitalize">
                              {TYPE_LABELS[t] || t}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">No items yet</span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <BookOpen className="h-3 w-3" />
                        {provider.approved_item_count}
                      </span>
                    </div>

                    {/* CTA */}
                    <div className="flex items-center gap-1 text-xs text-primary mt-3 font-medium group-hover:underline">
                      View Provider <ArrowRight className="h-3 w-3" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        <SearchPagination
          currentPage={currentPage}
          totalPages={totalPages}
          isLoading={isLoading}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
};

export default ProvidersDirectory;
