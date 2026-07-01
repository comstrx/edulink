import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, Eye, CheckCircle2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { applyTeacherPublicFilters } from "@/lib/visibility-rules";

const FeaturedTeachers = () => {
  const { t } = useLanguage();

  const { data: featured } = useQuery({
    queryKey: ["featured_teachers"],
    queryFn: async () => {
      const { data, error } = await applyTeacherPublicFilters(
        supabase
          .from("teacher_profiles")
          .select("id, full_name, city, country, years_of_experience, availability_status, subject_ids, curriculum_ids, profile_source")
      )
        .eq("is_featured", true)
        .limit(6);
      if (error) throw error;
      return data ?? [];
    },
  });

  if (!featured || featured.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Star className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">{t("tsearch.featured")}</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {featured.map((teacher) => {
          const initials = teacher.full_name
            ? teacher.full_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
            : "??";
          const location = [teacher.city, teacher.country].filter(Boolean).join(", ");
          const primarySubject = (teacher.subject_ids ?? [])[0];

          return (
            <Card key={teacher.id} className="border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground text-sm truncate">{teacher.full_name}</p>
                    {location && <p className="text-xs text-muted-foreground truncate">{location}</p>}
                  </div>
                  {teacher.availability_status === "open" && (
                    <Badge variant="default" className="text-xs gap-1 shrink-0">
                      <CheckCircle2 className="h-3 w-3" />
                      {t("tsearch.avail.open")}
                    </Badge>
                  )}
                  {/* Featured badge — demo profiles excluded by applyTeacherPublicFilters */}
                </div>
                <div className="flex gap-1.5 flex-wrap mb-2">
                  {primarySubject && <Badge variant="secondary" className="text-xs">{primarySubject}</Badge>}
                  {teacher.years_of_experience != null && teacher.years_of_experience > 0 && (
                    <Badge variant="outline" className="text-xs">{teacher.years_of_experience} {t("tsearch.yrs")}</Badge>
                  )}
                </div>
                <Button asChild size="sm" variant="outline" className="w-full gap-1.5">
                  <Link to={`/teachers/${teacher.id}`}>
                    <Eye className="h-3.5 w-3.5" />
                    {t("tsearch.viewProfile")}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
};

export default FeaturedTeachers;
