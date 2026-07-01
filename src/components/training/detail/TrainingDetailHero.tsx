import { useNavigate, Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ProviderTrustBadge from "@/components/provider/ProviderTrustBadge";
import { Users, Award, LogIn, Route, Play, CheckCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { type TrainingDetailItem, TYPE_LABELS, isPathwayItem } from "./training-detail-data";
import { useEnrollmentStatus, useSelfEnroll, useStartLearning } from "@/hooks/useTrainingEnrollments";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TrainingDetailHeroProps {
  item: TrainingDetailItem;
}

const TrainingDetailHero = ({ item }: TrainingDetailHeroProps) => {
  const { user, roles } = useAuth();
  const navigate = useNavigate();
  const isTeacher = roles?.includes("teacher");
  const isEnrollable = ["course", "pathway"].includes(item.type);

  // Resolve provider info if provider-owned
  const providerItem = item as any;
  const providerId = providerItem.ownership_type === "provider" ? providerItem.provider_id : null;
  const { data: providerInfo } = useQuery({
    queryKey: ["training_detail_provider", providerId],
    queryFn: async () => {
      const { data } = await supabase
        .from("providers")
        .select("display_name, slug, logo_url, verification_status")
        .eq("id", providerId)
        .eq("status", "active")
        .maybeSingle();
      return data;
    },
    enabled: !!providerId,
  });

  const { data: enrollment, isLoading: enrollmentLoading } = useEnrollmentStatus(
    isTeacher && isEnrollable ? item.id : undefined
  );

  const selfEnroll = useSelfEnroll();
  const startLearning = useStartLearning();

  const handleEnroll = async () => {
    try {
      await selfEnroll.mutateAsync({ itemId: item.id, itemType: item.type });
      toast.success("Successfully enrolled!");
    } catch (err: any) {
      toast.error(err.message || "Failed to enroll");
    }
  };

  const handleStart = async () => {
    if (!enrollment) return;
    try {
      await startLearning.mutateAsync(enrollment.id);
      toast.success("Learning started!");
    } catch (err: any) {
      toast.error(err.message || "Failed to start");
    }
  };

  const renderCTA = () => {
    if (!user) {
      return (
        <Button size="lg" variant="outline" onClick={() => navigate("/login")}>
          <LogIn className="h-4 w-4" />
          Sign in to Enroll
        </Button>
      );
    }

    if (!isTeacher || !isEnrollable) {
      return <Button size="lg" disabled>Not Available</Button>;
    }

    if (enrollmentLoading) {
      return (
        <Button size="lg" disabled>
          <Loader2 className="h-4 w-4 animate-spin" />
        </Button>
      );
    }

    if (!enrollment) {
      return (
        <Button
          size="lg"
          onClick={handleEnroll}
          disabled={selfEnroll.isPending}
        >
          {selfEnroll.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : null}
          Enroll Now
        </Button>
      );
    }

    if (enrollment.status === "enrolled") {
      return (
        <Button
          size="lg"
          onClick={handleStart}
          disabled={startLearning.isPending}
        >
          {startLearning.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          Start Learning
        </Button>
      );
    }

    if (enrollment.status === "active") {
      return (
        <Button size="lg" variant="secondary" onClick={() => navigate("/app/teacher/training")}>
          <Play className="h-4 w-4" />
          Continue Learning
        </Button>
      );
    }

    if (enrollment.status === "completed") {
      return (
        <Button size="lg" variant="outline" disabled>
          <CheckCircle className="h-4 w-4" />
          Completed
        </Button>
      );
    }

    return <Button size="lg">Enroll Now</Button>;
  };

  return (
    <section className="bg-muted/40 border-b border-border">
      <div className="max-w-5xl mx-auto px-6 py-14 space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{TYPE_LABELS[item.type]}</Badge>
          {isPathwayItem(item) && (
            <Badge variant="outline" className="gap-1">
              <Route className="h-3 w-3" /> {item.milestones.length} Milestones
            </Badge>
          )}
        </div>
        <h1 className="text-3xl font-bold text-foreground leading-tight">{item.title}</h1>
        <p className="text-muted-foreground max-w-3xl text-lg">
          {item.short_description || item.description || "No description available."}
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {item.mentor_supported && (
            <Badge variant="outline" className="gap-1">
              <Users className="h-3 w-3" /> Mentor Supported
            </Badge>
          )}
          {item.credential_eligible && (
            <Badge variant="outline" className="gap-1">
              <Award className="h-3 w-3" /> Credential Eligible
            </Badge>
          )}
        </div>
        {/* Provider attribution */}
        {providerInfo && (
          <div className="flex items-center gap-3 pt-1">
            {providerInfo.logo_url ? (
              <img src={providerInfo.logo_url} alt="" className="h-6 w-6 rounded object-cover border border-border" />
            ) : (
              <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center">
                <span className="text-xs font-bold text-primary">{providerInfo.display_name?.[0]}</span>
              </div>
            )}
            <span className="text-sm text-muted-foreground">
              by{" "}
              <Link to={`/providers/${providerInfo.slug}`} className="text-primary hover:underline font-medium">
                {providerInfo.display_name}
              </Link>
            </span>
            <ProviderTrustBadge verificationStatus={providerInfo.verification_status} />
          </div>
        )}
        <div className="pt-3">
          {renderCTA()}
        </div>
      </div>
    </section>
  );
};

export default TrainingDetailHero;
