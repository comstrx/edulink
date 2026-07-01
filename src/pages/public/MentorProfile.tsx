import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import ReputationBadge from "@/components/reputation/ReputationBadge";
import ExplanationPanel from "@/components/explainability/ExplanationPanel";
import { useProfessionalReputation } from "@/reputation/hooks/useProfessionalReputation";
import { useMentorTrustExplanation } from "@/explainability/hooks/useMentorTrustExplanation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Briefcase, CheckCircle, Calendar, Globe, Users, ArrowLeft, Star } from "lucide-react";
import BookingSection from "@/components/mentors/BookingSection";
import StarRating from "@/components/mentors/StarRating";
import PricingBadge from "@/components/commerce/PricingBadge";
import { useMentorApprovedReviews, useMentorRating } from "@/hooks/useMentorReputation";
import { useResolveMentorPrice } from "@/hooks/useBilling";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const MentorProfile = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const isAuthenticated = !!user;

  // Fetch mentor — public-safe fields only (no user_id in response)
  const { data: mentorWithProfile, isLoading, error } = useQuery({
    queryKey: ["public_mentor", id],
    queryFn: async () => {
      if (!id) return null;
      // Fetch mentor with public-safe fields
      const { data: mentorData, error: mErr } = await supabase
        .from("mentors")
        .select("id, user_id, bio, years_experience, languages, is_independent, primary_provider_id, status, pricing_type, session_price_amount, session_price_currency, onboarding_completed_at")
        .eq("id", id)
        .eq("status", "active")
        .not("onboarding_completed_at", "is", null)
        .maybeSingle();
      if (mErr) throw mErr;
      if (!mentorData) return null;

      // Resolve teacher profile using user_id internally (never expose user_id to component)
      const { data: profileData } = await supabase
        .from("teacher_profiles")
        .select("id, full_name, avatar_url, bio")
        .eq("user_id", mentorData.user_id)
        .maybeSingle();

      // Return combined result WITHOUT user_id
      const { user_id: _uid, ...mentorPublic } = mentorData;
      return {
        mentor: mentorPublic,
        profile: profileData,
      };
    },
    enabled: !!id,
  });

  const mentor = mentorWithProfile?.mentor ?? null;
  const profile = mentorWithProfile?.profile ?? null;

  // Reputation — only fetch for authenticated users (public visitors see no internal signals)
  const reputation = useProfessionalReputation(isAuthenticated ? profile?.id : undefined);
  const mentorTrust = useMentorTrustExplanation(isAuthenticated ? profile?.id : undefined);

  // Specializations
  const { data: specializations } = useQuery({
    queryKey: ["mentor_specializations", id],
    queryFn: async () => {
      const { data: specs } = await supabase
        .from("mentor_specializations")
        .select("term_id")
        .eq("mentor_id", id);
      if (!specs?.length) return [];
      const termIds = specs.map((s: any) => s.term_id);
      const { data: terms } = await supabase.from("taxonomy_terms").select("id, name").in("id", termIds);
      return terms ?? [];
    },
    enabled: !!id,
  });

  // Approved session reviews (reputation)
  const { data: sessionReviews } = useMentorApprovedReviews(id);
  const { data: ratingData } = useMentorRating(id);

  // Legacy evidence reviews (kept for backward compat)
  const { data: reviews } = useQuery({
    queryKey: ["mentor_reviews_public", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("mentor_reviews")
        .select("id, review_decision, review_notes, reviewed_at")
        .eq("mentor_id", id)
        .eq("review_decision", "approved")
        .order("reviewed_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
    enabled: !!id,
  });

  // Availability summary
  const { data: availability } = useQuery({
    queryKey: ["mentor_availability_public", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("mentor_availability")
        .select("day_of_week, start_time, end_time")
        .eq("mentor_id", id)
        .eq("is_active", true)
        .order("day_of_week");
      return data ?? [];
    },
    enabled: !!id,
  });

  // Provider name
  const { data: providerInfo } = useQuery({
    queryKey: ["mentor_provider", mentor?.primary_provider_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("providers")
        .select("display_name, slug")
        .eq("id", mentor.primary_provider_id)
        .maybeSingle();
      return data;
    },
    enabled: !!mentor?.primary_provider_id,
  });

  const fullName = profile?.full_name ?? "Mentor";
  const avatarUrl = profile?.avatar_url ?? null;
  const bio = mentor?.bio || profile?.bio;
  const mentorPrice = useResolveMentorPrice(mentor);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !mentor) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-16 text-center space-y-4">
        <h1 className="text-3xl font-bold text-foreground">Mentor Not Found</h1>
        <p className="text-muted-foreground">This mentor doesn't exist or is not currently active.</p>
        <Button asChild><Link to="/mentors">Browse Mentors</Link></Button>
      </div>
    );
  }

  // Availability summary
  const availableDays = (availability ?? []).map((a: any) => DAY_NAMES[a.day_of_week] as string).filter(Boolean);
  const uniqueDays = [...new Set(availableDays)] as string[];
  const hasWeekdays = uniqueDays.some((d: string) => !["Saturday", "Sunday"].includes(d));
  const hasWeekends = uniqueDays.some((d: string) => ["Saturday", "Sunday"].includes(d));

  return (
    <div className="pb-16">
      {/* Hero */}
      <section className="bg-muted/40 border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
            <Link to="/mentors"><ArrowLeft className="h-4 w-4 mr-1" /> All Mentors</Link>
          </Button>
          <div className="flex items-start gap-5">
            <Avatar className="h-20 w-20 shrink-0">
              <AvatarImage src={avatarUrl ?? undefined} alt={fullName} />
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                {fullName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-foreground">{fullName}</h1>
                {/* Reputation badge — only show level label for auth users, never raw score publicly */}
                {isAuthenticated && <ReputationBadge reputation={reputation} size="md" />}
              </div>
              {mentorPrice && <PricingBadge price={mentorPrice} />}
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                {mentor.years_experience != null && (
                  <span className="flex items-center gap-1">
                    <Briefcase className="h-3.5 w-3.5" /> {mentor.years_experience} years experience
                  </span>
                )}
                {ratingData && ratingData.review_count > 0 && (
                  <span className="flex items-center gap-1">
                    <StarRating rating={ratingData.average_rating} count={ratingData.review_count} />
                  </span>
                )}
                {ratingData?.review_count === 0 && (reviews?.length ?? 0) > 0 && (
                  <span className="flex items-center gap-1">
                    <CheckCircle className="h-3.5 w-3.5" /> {reviews.length} verified reviews
                  </span>
                )}
                {mentor.languages?.length > 0 && (
                  <span className="flex items-center gap-1">
                    <Globe className="h-3.5 w-3.5" /> {mentor.languages.join(", ")}
                  </span>
                )}
              </div>
              {providerInfo && (
                <p className="text-sm text-muted-foreground">
                  Affiliated with{" "}
                  <Link to={`/providers/${providerInfo.slug}`} className="text-primary hover:underline font-medium">
                    {providerInfo.display_name}
                  </Link>
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-10">
        {/* Trust signals row */}
        <div className="grid sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              {ratingData && ratingData.review_count > 0 ? (
                <>
                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  <div>
                    <p className="text-lg font-semibold text-foreground">{ratingData.average_rating}</p>
                    <p className="text-xs text-muted-foreground">Average Rating</p>
                  </div>
                </>
              ) : (
                <>
                  <Briefcase className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-lg font-semibold text-foreground">{mentor.years_experience ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Years Experience</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-primary" />
              <div>
                <p className="text-lg font-semibold text-foreground">
                  {(ratingData?.review_count ?? 0) + (reviews?.length ?? 0)}
                </p>
                <p className="text-xs text-muted-foreground">Total Reviews</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="text-lg font-semibold text-foreground">
                  {specializations?.length ?? 0}
                </p>
                <p className="text-xs text-muted-foreground">Specializations</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Mentor Trust Explanation — only for authenticated viewers */}
        {isAuthenticated && mentorTrust.status === "ready" && (
          <ExplanationPanel explanation={mentorTrust} />
        )}

        {/* Bio */}
        {bio && (
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">About</h2>
            <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{bio}</p>
          </section>
        )}

        {/* Specializations */}
        {specializations && specializations.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">Expertise</h2>
            <div className="flex flex-wrap gap-2">
              {specializations.map((s: any) => (
                <Badge key={s.id} variant="secondary" className="text-sm px-3 py-1">{s.name}</Badge>
              ))}
            </div>
          </section>
        )}

        {/* Availability */}
        {uniqueDays.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">Availability</h2>
            <Card>
              <CardContent className="p-4 space-y-2">
                <p className="text-sm font-medium text-primary flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" /> Available for Mentoring
                </p>
                <div className="flex flex-wrap gap-2">
                  {hasWeekdays && (
                    <Badge variant="outline" className="text-xs">Weekdays</Badge>
                  )}
                  {hasWeekends && (
                    <Badge variant="outline" className="text-xs">Weekends</Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {uniqueDays.map((d: string) => (
                    <span key={d} className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">{d}</span>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Booking */}
        <section>
          <BookingSection mentorId={mentor.id} mentorName={fullName} />
        </section>

        {/* Session Reviews (Reputation) */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4">
            {sessionReviews && sessionReviews.length > 0
              ? <>Reviews <span className="text-muted-foreground font-normal">({sessionReviews.length})</span></>
              : reviews && reviews.length > 0
                ? <>Verified Reviews <span className="text-muted-foreground font-normal">({reviews.length})</span></>
                : "No Reviews Yet"
            }
          </h2>

          {/* Session-based reviews with ratings */}
          {sessionReviews && sessionReviews.length > 0 ? (
            <div className="space-y-3">
              {sessionReviews.map((review: any) => (
                <Card key={review.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`h-3.5 w-3.5 ${
                              s <= review.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/20"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(review.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </div>
                    {review.comment && (
                      <p className="text-sm text-muted-foreground">{review.comment}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : reviews && reviews.length > 0 ? (
            /* Fallback: evidence-based reviews */
            <div className="space-y-3">
              {reviews.map((review: any) => (
                <Card key={review.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline" className="text-xs gap-1">
                        <CheckCircle className="h-3 w-3" /> Verified
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(review.reviewed_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </div>
                    {review.review_notes && (
                      <p className="text-sm text-muted-foreground">{review.review_notes}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No reviews yet.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default MentorProfile;
