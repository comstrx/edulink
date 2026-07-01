import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GraduationCap, Sparkles, Route, Award, Users, ArrowRight, CheckCircle, BookOpen } from "lucide-react";
import PublicTrainingSubNav from "@/components/training/PublicTrainingSubNav";

const BENEFITS = [
  { icon: Sparkles, title: "Sharpen Classroom Practice", points: ["Evidence-based teaching strategies", "Practical techniques you can apply immediately", "Reflection-driven improvement cycles"] },
  { icon: BookOpen, title: "Build In-Demand Skills", points: ["Curriculum design and differentiation", "Assessment literacy and data use", "Technology-enhanced instruction"] },
  { icon: Award, title: "Earn Recognised Credentials", points: ["Stackable badges for focused competencies", "Certificates for pathway completion", "Verifiable credentials for your portfolio"] },
];

const OPPORTUNITIES = [
  { icon: GraduationCap, title: "Courses", description: "Structured, self-paced modules covering specific teaching competencies — from classroom management to assessment design.", href: "/training/courses" },
  { icon: Route, title: "Pathways", description: "Multi-course learning journeys that build deep expertise in a domain, culminating in a formal certificate.", href: "/training/pathways" },
  { icon: Sparkles, title: "Practice-Based Learning", description: "Go beyond theory. Apply what you learn through guided practice tasks, peer review, and reflective portfolios." },
  { icon: Award, title: "Credentials", description: "Every completed course or pathway earns you a verifiable badge or certificate — proof of real professional growth.", href: "/training/credentials" },
];

const TrainingForTeachers = () => (
  <div className="space-y-16 pb-16">
    <PublicTrainingSubNav />
    {/* Hero */}
    <section className="bg-muted/40 border-b border-border">
      <div className="max-w-5xl mx-auto px-6 py-16 text-center space-y-5">
        <h1 className="text-4xl font-bold text-foreground leading-tight">
          Your Professional Growth, On Your Terms
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
          EduLink Training is built for teachers who want more than passive PD. Develop real skills, practise in context, collect evidence, and earn credentials that schools and recruiters trust.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <Button asChild size="lg">
            <Link to="/training/courses">Start Learning <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/training/pathways">Explore Pathways</Link>
          </Button>
        </div>
      </div>
    </section>

    {/* Why Teachers Use EduLink */}
    <section className="max-w-5xl mx-auto px-6 space-y-6">
      <h2 className="text-2xl font-bold text-foreground text-center">Why Teachers Choose EduLink</h2>
      <div className="grid md:grid-cols-3 gap-6">
        {BENEFITS.map((b) => (
          <Card key={b.title} className="flex flex-col">
            <CardContent className="pt-6 flex-1 space-y-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <b.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">{b.title}</h3>
              <ul className="space-y-1.5">
                {b.points.map((p) => (
                  <li key={p} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />{p}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>

    {/* Learning Opportunities */}
    <section className="bg-muted/40 border-y border-border">
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-6">
        <h2 className="text-2xl font-bold text-foreground text-center">How You'll Learn</h2>
        <p className="text-muted-foreground text-center max-w-2xl mx-auto">
          EduLink offers multiple learning formats so you can grow at your own pace and depth.
        </p>
        <div className="grid sm:grid-cols-2 gap-6 pt-2">
          {OPPORTUNITIES.map((o) => (
            <div key={o.title} className="rounded-lg border border-border bg-card p-5 space-y-2">
              <div className="flex items-center gap-2">
                <o.icon className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-foreground text-sm">{o.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground">{o.description}</p>
              {o.href && (
                <Link to={o.href} className="inline-flex items-center text-xs font-medium text-primary hover:underline">
                  Learn more <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Mentor Support */}
    <section className="max-w-5xl mx-auto px-6 space-y-6">
      <div className="grid md:grid-cols-2 gap-8 items-center">
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground">Expert Mentors By Your Side</h2>
          <p className="text-muted-foreground">
            You don't have to learn alone. EduLink pairs you with experienced mentors who provide personalised feedback, coaching, and guidance throughout your learning journey.
          </p>
          <ul className="space-y-1.5">
            {["Personalised feedback on your practice evidence", "Goal-setting and reflection coaching", "Domain-specific expertise when you need it"].map((t) => (
              <li key={t} className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />{t}
              </li>
            ))}
          </ul>
          <Button asChild variant="outline">
            <Link to="/training/mentors">Meet Our Mentors</Link>
          </Button>
        </div>
        <div className="flex justify-center">
          <div className="flex h-40 w-40 items-center justify-center rounded-full bg-primary/10">
            <Users className="h-16 w-16 text-primary" />
          </div>
        </div>
      </div>
    </section>

    {/* CTA */}
    <section className="max-w-5xl mx-auto px-6">
      <div className="rounded-lg border border-border bg-card p-8 text-center space-y-4">
        <h2 className="text-2xl font-bold text-foreground">Ready to Grow?</h2>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Explore the full training catalog and find the right courses, pathways, and credentials for your career stage.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <Button asChild size="lg">
            <Link to="/training/courses">Browse Courses <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/training/credentials">View Credentials</Link>
          </Button>
        </div>
      </div>
    </section>
  </div>
);

export default TrainingForTeachers;
