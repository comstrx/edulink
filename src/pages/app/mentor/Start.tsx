import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { insertMentor } from "@/lib/supabase-typed-queries";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Award, TrendingUp, BookOpen, Loader2 } from "lucide-react";
import { toast } from "sonner";

const benefits = [
  {
    icon: Users,
    title: "Guide Fellow Educators",
    description: "Share your expertise and help teachers grow in their careers.",
  },
  {
    icon: Award,
    title: "Build Your Reputation",
    description: "Earn verified reviews and credentials through your mentoring work.",
  },
  {
    icon: TrendingUp,
    title: "Professional Growth",
    description: "Deepen your own expertise by coaching and reviewing evidence.",
  },
  {
    icon: BookOpen,
    title: "Flexible Scheduling",
    description: "Set your own availability and session types on your terms.",
  },
];

export default function MentorStart() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);

  const handleBecomeMentor = async () => {
    if (!user) return;
    setCreating(true);
    try {
      await insertMentor({
        user_id: user.id,
        status: "draft",
        onboarding_started_at: new Date().toISOString(),
        onboarding_current_step: "profile",
      });
      toast.success("Mentor profile created! Let's complete your setup.");
      navigate("/app/mentor/onboarding");
    } catch (err: any) {
      if (err?.code === "23505") {
        navigate("/app/mentor/onboarding");
        return;
      }
      toast.error(err.message || "Failed to create mentor profile");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-8">
      <div className="text-center space-y-3">
        <Badge variant="secondary" className="text-sm">Mentor Program</Badge>
        <h1 className="text-3xl font-bold text-foreground">Become a Mentor</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Share your teaching expertise with educators around the world.
          Mentor sessions, evidence reviews, and professional guidance — all from your workspace.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {benefits.map((b) => (
          <Card key={b.title} className="border-border">
            <CardContent className="pt-6 flex gap-4">
              <div className="shrink-0 h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <b.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{b.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{b.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="text-center">
          <CardTitle>Ready to get started?</CardTitle>
          <CardDescription>
            Complete a short setup to configure your mentor profile, expertise areas, and availability.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center pb-6">
          <Button size="lg" onClick={handleBecomeMentor} disabled={creating}>
            {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Start Mentor Setup
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
