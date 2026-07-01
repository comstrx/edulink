import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Award, ShieldCheck, BadgeCheck, GraduationCap, CheckCircle, ArrowRight } from "lucide-react";
import CredentialSampleCard from "@/components/training/CredentialSampleCard";
import { useLanguage } from "@/contexts/LanguageContext";
import PublicTrainingSubNav from "@/components/training/PublicTrainingSubNav";

const CREDENTIAL_TYPES = [
  {
    icon: BadgeCheck,
    title: "Badges",
    description: "Micro-credentials awarded for demonstrating specific competencies or completing focused learning activities. Badges are stackable and represent targeted skill mastery.",
    examples: ["Completion of a single course", "Demonstrated classroom technique", "Peer-reviewed practice cycle"],
  },
  {
    icon: GraduationCap,
    title: "Certificates",
    description: "Formal credentials awarded upon completing a structured learning pathway or comprehensive training package. Certificates represent deeper, validated professional development.",
    examples: ["Multi-course pathway completion", "Assessed portfolio of evidence", "School-endorsed professional development"],
  },
];

const SAMPLE_CREDENTIALS = [
  { title: "Classroom Practice Badge", type: "Badge", color: "bg-primary/10 text-primary", icon: BadgeCheck, description: "Awarded for completing the Classroom Practice Essentials course and submitting a reflective teaching log." },
  { title: "Assessment Foundations Certificate", type: "Certificate", color: "bg-accent/80 text-accent-foreground", icon: GraduationCap, description: "Earned after completing the full Assessment & Evaluation pathway, including peer review and portfolio submission." },
  { title: "Early Years Instruction Badge", type: "Badge", color: "bg-primary/10 text-primary", icon: BadgeCheck, description: "Recognises demonstrated competency in early years pedagogy through course completion and practice evidence." },
  { title: "School Leadership Development Certificate", type: "Certificate", color: "bg-accent/80 text-accent-foreground", icon: GraduationCap, description: "Awarded to educators who complete the Leadership Pathway, including mentorship hours and a capstone project." },
];

const TrainingCredentials = () => {
  const { t } = useLanguage();

  return (
    <div className="space-y-16 pb-16">
      <PublicTrainingSubNav />
      {/* Hero */}
      <section className="bg-muted/40 border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-16 text-center space-y-5">
          <div className="flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Award className="h-7 w-7 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-foreground leading-tight">
            Credentials That Matter
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            EduLink credentials go beyond completion stamps. Every badge and certificate represents verified professional growth — skills practiced, evidence reviewed, and competency demonstrated.
          </p>
        </div>
      </section>

      {/* Credential Types */}
      <section className="max-w-5xl mx-auto px-6 space-y-6">
        <h2 className="text-2xl font-bold text-foreground text-center">Two Credential Formats</h2>
        <p className="text-muted-foreground text-center max-w-2xl mx-auto">
          EduLink issues two types of credentials, each designed for a different depth of professional learning.
        </p>
        <div className="grid md:grid-cols-2 gap-6 pt-2">
          {CREDENTIAL_TYPES.map((ct) => (
            <Card key={ct.title} className="flex flex-col">
              <CardHeader>
                <ct.icon className="h-7 w-7 text-primary mb-2" />
                <CardTitle className="text-xl">{ct.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                <p className="text-sm text-muted-foreground">{ct.description}</p>
                <ul className="space-y-1.5">
                  {ct.examples.map((ex) => (
                    <li key={ex} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      {ex}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Verification Concept */}
      <section className="bg-muted/40 border-y border-border">
        <div className="max-w-5xl mx-auto px-6 py-10 space-y-5 text-center">
          <div className="flex justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-foreground">Built-in Verification</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Every credential issued by EduLink will carry a unique verification hash. Schools, recruiters, and institutions can independently verify any credential's authenticity — no intermediaries, no guesswork.
          </p>
          <div className="grid sm:grid-cols-3 gap-4 pt-2 max-w-3xl mx-auto">
            {[
              { label: "Tamper-Proof", desc: "Each credential is cryptographically linked to its holder." },
              { label: "Instant Lookup", desc: "Verify any credential with a single link or QR code." },
              { label: "Employer-Ready", desc: "Schools and hiring teams can trust credentials at face value." },
            ].map((v) => (
              <div key={v.label} className="rounded-lg border border-border bg-card p-4 text-left space-y-1">
                <p className="text-sm font-semibold text-foreground">{v.label}</p>
                <p className="text-xs text-muted-foreground">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sample Credential Cards */}
      <section className="max-w-5xl mx-auto px-6 space-y-6">
        <h2 className="text-2xl font-bold text-foreground text-center">Sample Credentials</h2>
        <p className="text-muted-foreground text-center max-w-2xl mx-auto">
          Here's what EduLink credentials will look like. Each one maps to real learning outcomes.
        </p>
        <div className="grid sm:grid-cols-2 gap-6 pt-2">
          {SAMPLE_CREDENTIALS.map((cred) => (
            <CredentialSampleCard key={cred.title} item={cred} />
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-6">
        <div className="rounded-lg border border-border bg-card p-8 text-center space-y-4">
          <h2 className="text-2xl font-bold text-foreground">Start Earning Credentials</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Browse our training catalog to find courses, packages, and pathways that lead to recognised badges and certificates.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <Button asChild size="lg">
              <Link to="/training/courses">
                Explore Courses <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/training/pathways">View Pathways</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default TrainingCredentials;
