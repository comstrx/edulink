import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import SearchPagination from "@/components/discovery/SearchPagination";
import TaxonomySingleSelect from "@/components/taxonomy/TaxonomySingleSelect";
import StarRating from "@/components/mentors/StarRating";
import { useMentorDirectory, useMentorLanguages } from "@/hooks/useMentorDirectory";
import { Search, ArrowRight, Users, Loader2, X, CheckCircle, Briefcase, Star } from "lucide-react";

const MentorsDirectory = () => {
  const {
    results, totalCount, totalPages, currentPage,
    isLoading, filters, updateFilters, resetFilters, setPage,
  } = useMentorDirectory();

  const { data: languages } = useMentorLanguages();
  const hasActiveFilters = filters.searchQuery || filters.specializationId || filters.language || filters.experienceRange || filters.minRating || filters.sortBy;

  return (
    <div className="pb-16">
      {/* Hero */}
      <section className="bg-muted/40 border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-12 space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Mentors</h1>
          <p className="text-muted-foreground max-w-2xl">
            Connect with experienced education professionals for guidance, feedback, and professional validation.
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Search & Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search mentors..."
              value={filters.searchQuery}
              onChange={(e) => updateFilters({ searchQuery: e.target.value })}
              className="pl-9"
            />
          </div>
          <div className="flex gap-3 flex-wrap">
            <div className="w-48">
              <TaxonomySingleSelect
                domainKey="skills"
                value={filters.specializationId}
                onChange={(v) => updateFilters({ specializationId: v })}
                placeholder="Specialization"
                triggerClassName="h-10"
              />
            </div>
            <Select
              value={filters.language || "all"}
              onValueChange={(v) => updateFilters({ language: v === "all" ? "" : v })}
            >
              <SelectTrigger className="w-40 h-10">
                <SelectValue placeholder="Language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Languages</SelectItem>
                {(languages ?? []).map((l) => (
                  <SelectItem key={l} value={l}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.experienceRange || "all"}
              onValueChange={(v) => updateFilters({ experienceRange: v === "all" ? "" : v })}
            >
              <SelectTrigger className="w-36 h-10">
                <SelectValue placeholder="Experience" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any Experience</SelectItem>
                <SelectItem value="0-3">0–3 years</SelectItem>
                <SelectItem value="3-7">3–7 years</SelectItem>
                <SelectItem value="7-15">7–15 years</SelectItem>
                <SelectItem value="15+">15+ years</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.minRating || "all"}
              onValueChange={(v) => updateFilters({ minRating: v === "all" ? "" : v })}
            >
              <SelectTrigger className="w-28 h-10">
                <SelectValue placeholder="Rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any Rating</SelectItem>
                <SelectItem value="4">4+ Stars</SelectItem>
                <SelectItem value="4.5">4.5+ Stars</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.sortBy || "default"}
              onValueChange={(v) => updateFilters({ sortBy: v === "default" ? "" : v })}
            >
              <SelectTrigger className="w-36 h-10">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default</SelectItem>
                <SelectItem value="rating">Highest Rated</SelectItem>
                <SelectItem value="reviews">Most Reviewed</SelectItem>
                <SelectItem value="experience">Most Experienced</SelectItem>
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters} className="text-destructive h-10 px-3">
                <X className="h-4 w-4 mr-1" /> Clear
              </Button>
            )}
          </div>
        </div>

        {/* Count */}
        {!isLoading && (
          <p className="text-sm text-muted-foreground mb-6">
            {totalCount} mentor{totalCount !== 1 ? "s" : ""} found
          </p>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Empty */}
        {!isLoading && results.length === 0 && (
          <div className="text-center py-24 space-y-3">
            <Users className="h-12 w-12 mx-auto text-muted-foreground/40" />
            <h3 className="text-lg font-medium text-foreground">No mentors found</h3>
            <p className="text-muted-foreground text-sm">Try adjusting your search or filters.</p>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={resetFilters}>Clear Filters</Button>
            )}
          </div>
        )}

        {/* Grid */}
        {!isLoading && results.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {results.map((mentor) => (
              <Link key={mentor.id} to={`/mentors/${mentor.id}`} className="group">
                <Card className="h-full hover:shadow-md transition-shadow border-border">
                  <CardContent className="p-5 flex flex-col h-full">
                    {/* Avatar + Name */}
                    <div className="flex items-start gap-3 mb-3">
                      <Avatar className="h-12 w-12 shrink-0">
                        <AvatarImage src={mentor.avatar_url ?? undefined} alt={mentor.full_name} />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {mentor.full_name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                          {mentor.full_name}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          {mentor.average_rating > 0 && mentor.session_review_count > 0 ? (
                            <StarRating rating={mentor.average_rating} count={mentor.session_review_count} size="sm" />
                          ) : (
                            <>
                              {mentor.years_experience != null && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Briefcase className="h-3 w-3" /> {mentor.years_experience}y exp
                                </span>
                              )}
                              {mentor.approved_review_count > 0 && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <CheckCircle className="h-3 w-3" /> {mentor.approved_review_count} reviews
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bio */}
                    {mentor.bio && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3 flex-1">{mentor.bio}</p>
                    )}
                    {!mentor.bio && <div className="flex-1" />}

                    {/* Specializations */}
                    {mentor.specialization_names.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {mentor.specialization_names.slice(0, 4).map((name, i) => (
                          <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0">
                            {name}
                          </Badge>
                        ))}
                        {mentor.specialization_names.length > 4 && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            +{mentor.specialization_names.length - 4}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-border mt-auto">
                      <div className="flex gap-1 flex-wrap">
                        {mentor.languages.slice(0, 3).map((lang) => (
                          <span key={lang} className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {lang}
                          </span>
                        ))}
                      </div>
                      {mentor.provider_name && (
                        <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                          {mentor.provider_name}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-xs text-primary mt-3 font-medium group-hover:underline">
                      View Profile <ArrowRight className="h-3 w-3" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

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

export default MentorsDirectory;
