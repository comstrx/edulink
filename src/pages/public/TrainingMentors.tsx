import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  MessageSquare,
  Star,
  Lightbulb,
  Target,
  ArrowRight,
  Loader2,
  GraduationCap,
  CheckCircle2,
  BookOpen,
  School,
  UserPlus,
  ClipboardCheck,
  TrendingUp,
  Sparkles,
  ChevronRight,
  Shield,
  BarChart3,
  FileCheck,
} from "lucide-react";
import MentorCard from "@/components/training/MentorCard";
import PublicTrainingSubNav from "@/components/training/PublicTrainingSubNav";
import { useMentorList } from "@/hooks/useMentorDirectory";

/* ─── Static data ─── */

const JOURNEY_STEPS = [
  {
    step: 1,
    icon: UserPlus,
    title: "Connect With a Mentor",
    description:
      "Find an experienced educator who supports the teaching competencies you want to develop.",
  },
  {
    step: 2,
    icon: Lightbulb,
    title: "Get Structured Guidance",
    description:
      "Receive coaching and expert feedback grounded in real classroom practice and professional standards.",
  },
  {
    step: 3,
    icon: ClipboardCheck,
    title: "Apply What You Learn",
    description:
      "Put guidance into practice, experiment with new approaches, and refine your teaching.",
  },
  {
    step: 4,
    icon: FileCheck,
    title: "Submit Evidence & Receive Feedback",
    description:
      "Share professional practice evidence with your mentor and receive structured validation.",
  },
  {
    step: 5,
    icon: TrendingUp,
    title: "Grow Professionally",
    description:
      "Mentorship feeds into your broader professional development journey, building competencies that matter.",
  },
];

const ROLE_CARDS = [
  {
    role: "Teachers",
    icon: GraduationCap,
    color: "bg-primary/10 text-primary",
    points: [
      "Solve classroom challenges with expert guidance",
      "Improve teaching practice through structured coaching",
      "Receive personalised feedback on your professional evidence",
      "Accelerate growth in targeted competency areas",
    ],
    cta: "Find a Mentor",
    ctaLink: "/signup",
  },
  {
    role: "Mentors",
    icon: Users,
    color: "bg-accent/50 text-accent-foreground",
    points: [
      "Share your expertise and coach educators",
      "Support teacher development across competencies",
      "Build your professional reputation and impact",
      "Contribute to a growing professional community",
    ],
    cta: "Become a Mentor",
    ctaLink: "/signup",
  },
  {
    role: "Schools",
    icon: School,
    color: "bg-secondary text-secondary-foreground",
    points: [
      "Support new and developing teachers",
      "Improve instructional quality across departments",
      "Strengthen staff development programmes",
      "Integrate mentorship into professional learning plans",
    ],
    cta: "Support Your Teachers",
    ctaLink: "/signup",
  },
];

const POST_LOGIN_PREVIEWS = [
  {
    role: "Teachers",
    icon: GraduationCap,
    items: [
      "Book mentoring sessions",
      "Track mentorship activity and progress",
      "Submit professional practice evidence",
      "See growth in context of your development journey",
    ],
  },
  {
    role: "Mentors",
    icon: Users,
    items: [
      "Manage sessions and availability",
      "Tag competencies covered in each session",
      "Review and validate teacher evidence",
      "Support structured professional development",
    ],
  },
  {
    role: "Schools",
    icon: School,
    items: [
      "View mentorship engagement across staff",
      "Connect mentorship to training and development",
      "Support teacher growth at institutional level",
      "Monitor professional development initiatives",
    ],
  },
];

/* ─── Component ─── */

const TrainingMentors = () => {
  const { data: mentors, isLoading } = useMentorList();
  const hasMentors = mentors && mentors.length > 0;

  const specializations = hasMentors
    ? [...new Set(mentors.flatMap((m) => m.specialization_names))].sort()
    : [];

  return (
    <div className="space-y-0 pb-0">
      <PublicTrainingSubNav />

      {/* ── 1. Hero ── */}
      <section className="bg-muted/40 border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-20 text-center space-y-6">
          <div className="flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Users className="h-7 w-7 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground leading-tight">
            Expert Mentorship for Real Teaching Growth
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg leading-relaxed">
            EduLink connects educators with experienced mentors who support
            classroom practice, professional development, and career growth
            through structured guidance, expert feedback, and evidence-based
            validation.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Button asChild size="lg">
              <Link to="/signup">
                Find a Mentor <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/signup">Become a Mentor</Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link to="/signup">For Schools</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── 2. Why Mentorship Matters ── */}
      <section className="max-w-5xl mx-auto px-6 py-16 space-y-6">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center">
          Why Mentorship Matters
        </h2>
        <p className="text-muted-foreground text-center max-w-2xl mx-auto text-base leading-relaxed">
          Teaching is complex, and professional growth should not depend on trial
          and error alone. Schools need stronger support structures, and
          educators deserve guidance from those who have navigated the same
          challenges.
        </p>
        <div className="grid md:grid-cols-3 gap-6 pt-4">
          {[
            {
              icon: Target,
              title: "Faster, Focused Growth",
              desc: "Mentors help teachers concentrate on the competencies that matter most, accelerating development with precision.",
            },
            {
              icon: Shield,
              title: "Stronger Support Structures",
              desc: "Schools that invest in mentorship build cultures of continuous improvement and instructional excellence.",
            },
            {
              icon: Sparkles,
              title: "Evidence-Based Development",
              desc: "Mentorship connected to professional evidence transforms subjective advice into validated, measurable progress.",
            },
          ].map((item) => (
            <Card key={item.title}>
              <CardContent className="pt-6 space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ── 3. How Mentoring Works (Journey) ── */}
      <section className="bg-muted/40 border-y border-border">
        <div className="max-w-5xl mx-auto px-6 py-16 space-y-8">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center">
            How Mentoring Works
          </h2>
          <p className="text-muted-foreground text-center max-w-2xl mx-auto">
            EduLink mentorship follows a structured journey — from initial
            connection through to validated professional growth.
          </p>
          <div className="grid gap-4 pt-2">
            {JOURNEY_STEPS.map((s) => (
              <div
                key={s.step}
                className="flex items-start gap-4 p-4 rounded-lg bg-card border border-border"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                  {s.step}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <s.icon className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold text-foreground text-sm">
                      {s.title}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {s.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3b. Featured Mentors ── */}
      <section className="max-w-5xl mx-auto px-6 py-16 space-y-6">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center">
          Featured Mentors
        </h2>
        <p className="text-muted-foreground text-center max-w-2xl mx-auto">
          Meet some of the experienced educators supporting professional growth
          through EduLink mentorship.
        </p>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : hasMentors ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
            {mentors.slice(0, 6).map((m) => (
              <Card key={m.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6 space-y-3">
                  <div className="flex items-start gap-3">
                    {m.avatar_url ? (
                      <img
                        src={m.avatar_url}
                        alt={m.full_name}
                        className="h-12 w-12 shrink-0 rounded-full object-cover border border-border"
                      />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                        {m.full_name
                          .split(" ")
                          .map((w) => w[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">
                        {m.full_name}
                      </p>
                      {m.specialization_names.length > 0 && (
                        <p className="text-xs text-muted-foreground truncate">
                          {m.specialization_names.slice(0, 2).join(" • ")}
                        </p>
                      )}
                    </div>
                  </div>

                  {m.years_experience && (
                    <p className="text-xs text-muted-foreground">
                      {m.years_experience}+ years teaching experience
                    </p>
                  )}

                  {m.bio && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {m.bio}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    {m.average_rating > 0 && (
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-primary text-primary" />
                        {m.average_rating}
                      </span>
                    )}
                    {m.languages.length > 0 && (
                      <span>{m.languages.slice(0, 2).join(", ")}</span>
                    )}
                  </div>

                  <Button asChild size="sm" variant="outline" className="w-full">
                    <Link to="/mentors">View Mentor</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
            {mentors.length < 3 && (
              <Card className="border-dashed hover:shadow-md transition-shadow">
                <CardContent className="pt-6 flex flex-col items-center justify-center text-center space-y-3 h-full">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <UserPlus className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground">
                    Become a Mentor
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Join EduLink as a mentor and help educators grow through
                    expert guidance and coaching.
                  </p>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/signup">
                      Become a Mentor <ArrowRight className="ml-1 h-3 w-3" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
            <Card className="border-dashed col-span-full sm:col-span-2 lg:col-span-3">
              <CardContent className="pt-6 flex flex-col items-center justify-center text-center space-y-4 py-12">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <Users className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground text-lg">
                  Our Mentor Community Is Growing
                </h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  EduLink is building a network of experienced educators,
                  coaches, and specialists to support teacher development across
                  international education.
                </p>
                <Button asChild>
                  <Link to="/signup">
                    Become a Mentor <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </section>

      {/* ── 4. Who Is It For ── */}
      <section className="max-w-5xl mx-auto px-6 py-16 space-y-8">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center">
          Who Mentorship Is For
        </h2>
        <p className="text-muted-foreground text-center max-w-2xl mx-auto">
          Whether you are developing your teaching practice, sharing your
          expertise, or building a stronger institution — EduLink mentorship is
          designed for you.
        </p>
        <div className="grid md:grid-cols-3 gap-6 pt-2">
          {ROLE_CARDS.map((r) => (
            <Card key={r.role} className="flex flex-col">
              <CardContent className="pt-6 flex-1 space-y-4">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full ${r.color}`}
                >
                  <r.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-foreground text-lg">
                  {r.role}
                </h3>
                <ul className="space-y-2">
                  {r.points.map((p) => (
                    <li
                      key={p}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
                <Button asChild className="w-full mt-auto" variant="outline">
                  <Link to={r.ctaLink}>
                    {r.cta} <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ── 5. Mentor Community / Directory ── */}
      <section className="bg-muted/40 border-y border-border">
        <div className="max-w-5xl mx-auto px-6 py-16 space-y-6">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center">
            Our Mentor Community
          </h2>
          <p className="text-muted-foreground text-center max-w-2xl mx-auto">
            EduLink mentors are practising educators, researchers, and
            specialists with deep domain expertise in international education.
          </p>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : hasMentors ? (
            <>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
                {mentors.slice(0, 6).map((m) => (
                  <MentorCard
                    key={m.id}
                    name={m.full_name}
                    title={m.bio ?? undefined}
                    specializations={m.specialization_names}
                    sessionsCompleted={
                      m.approved_review_count + m.session_review_count
                    }
                    availability={
                      m.average_rating > 0
                        ? `★ ${m.average_rating}`
                        : undefined
                    }
                  />
                ))}
              </div>
              <div className="flex justify-center pt-2">
                <Button asChild variant="outline">
                  <Link to="/mentors">
                    View All Mentors <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-border bg-card p-8 text-center space-y-4">
              <div className="flex justify-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
              </div>
              <h3 className="font-semibold text-foreground">
                Our Mentor Community Is Growing
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                EduLink is building a network of experienced educators, coaches,
                and specialists to support teacher development across
                international education.
              </p>
              <Button asChild variant="outline">
                <Link to="/signup">
                  Become a Mentor <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          )}

          {/* Specialisation badges */}
          {specializations.length > 0 && (
            <div className="pt-4 space-y-3 text-center">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                Mentor Specialisations
              </h3>
              <div className="flex flex-wrap justify-center gap-2">
                {specializations.map((s) => (
                  <Badge
                    key={s}
                    variant="secondary"
                    className="px-3 py-1.5 text-sm"
                  >
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── 6. Mentorship + Training Integration ── */}
      <section className="max-w-5xl mx-auto px-6 py-16 space-y-6">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center">
          Mentorship + Training, Connected
        </h2>
        <p className="text-muted-foreground text-center max-w-2xl mx-auto leading-relaxed">
          EduLink mentorship is not standalone — it strengthens structured
          professional learning. Mentors guide educators through courses,
          packages, and pathways, turning self-paced training into supported,
          competency-driven growth.
        </p>
        <div className="grid sm:grid-cols-3 gap-6 pt-4">
          {[
            {
              icon: BookOpen,
              title: "Courses",
              desc: "Mentors provide coaching alongside structured course content, reinforcing key teaching competencies.",
            },
            {
              icon: BarChart3,
              title: "Packages",
              desc: "Training packages can include dedicated mentor support, combining learning with personalised guidance.",
            },
            {
              icon: TrendingUp,
              title: "Pathways",
              desc: "Long-term professional pathways integrate mentorship milestones for evidence-based progression.",
            },
          ].map((item) => (
            <Card key={item.title}>
              <CardContent className="pt-6 space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ── 7. Explore Guided Programs ── */}
      <section className="bg-muted/40 border-y border-border">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="rounded-lg border border-border bg-card p-8 text-center space-y-4">
            <h2 className="text-2xl font-bold text-foreground">
              Explore Guided Programs With Mentor Support
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Browse structured training pathways and packages that include
              expert mentorship — combining professional learning with
              personalised guidance for meaningful development.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <Button asChild size="lg">
                <Link to="/training/pathways">
                  View Pathways <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/training/packages">Browse Packages</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── 8. What Happens After Sign-In ── */}
      <section className="max-w-5xl mx-auto px-6 py-16 space-y-8">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center">
          What Happens After You Sign In
        </h2>
        <p className="text-muted-foreground text-center max-w-2xl mx-auto">
          Your mentorship experience lives inside your personalised dashboard.
          Here is a preview of what each role can access.
        </p>
        <div className="grid md:grid-cols-3 gap-6 pt-2">
          {POST_LOGIN_PREVIEWS.map((p) => (
            <Card key={p.role} className="flex flex-col">
              <CardContent className="pt-6 flex-1 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                    <p.icon className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground">{p.role}</h3>
                </div>
                <ul className="space-y-2">
                  {p.items.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ── 8b. Real Impact From Mentorship ── */}
      <section className="bg-muted/40 border-y border-border">
        <div className="max-w-5xl mx-auto px-6 py-16 space-y-8">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center">
            Real Impact From Mentorship
          </h2>
          <p className="text-muted-foreground text-center max-w-2xl mx-auto">
            Hear from educators who have experienced the difference that
            structured mentorship makes in professional practice.
          </p>
          <div className="grid md:grid-cols-3 gap-6 pt-2">
            {[
              {
                quote:
                  "The mentoring session helped me improve my classroom management strategies. The feedback I received was practical and immediately useful.",
                role: "Primary School Teacher",
                icon: GraduationCap,
              },
              {
                quote:
                  "Mentoring teachers through EduLink allows me to support real classroom challenges and guide professional growth in a structured way.",
                role: "Instructional Mentor",
                icon: Users,
              },
              {
                quote:
                  "Mentorship helped us support new teachers and strengthen instructional practices across our school community.",
                role: "School Academic Lead",
                icon: School,
              },
            ].map((t) => (
              <Card key={t.role}>
                <CardContent className="pt-6 space-y-4">
                  <MessageSquare className="h-5 w-5 text-primary/40" />
                  <p className="text-sm text-muted-foreground italic leading-relaxed">
                    "{t.quote}"
                  </p>
                  <div className="flex items-center gap-2 pt-2 border-t border-border">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                      <t.icon className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      {t.role}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── 9. Final CTA ── */}
      <section className="bg-primary/5 border-t border-border">
        <div className="max-w-5xl mx-auto px-6 py-16 text-center space-y-6">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">
            Start Your Mentorship Journey
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Whether you are looking to grow as a teacher, share your expertise
            as a mentor, or strengthen your school's professional development —
            EduLink is ready.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Button asChild size="lg">
              <Link to="/signup">
                Get Mentorship Support <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/signup">Become a Mentor</Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link to="/signup">For Schools</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default TrainingMentors;
