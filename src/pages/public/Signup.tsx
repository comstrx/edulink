import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { getSchoolAdminRedirect } from "@/lib/getSchoolRedirect";
import { signupSchema } from "@/lib/validation-schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CheckCircle2, XCircle, GraduationCap, School, Building2 } from "lucide-react";

const PASSWORD_RULES = [
  { test: (p: string) => p.length >= 8, label: "At least 8 characters" },
  { test: (p: string) => /[A-Z]/.test(p), label: "One uppercase letter" },
  { test: (p: string) => /[a-z]/.test(p), label: "One lowercase letter" },
  { test: (p: string) => /[0-9]/.test(p), label: "One number" },
];

type IntendedRole = "teacher" | "school_admin" | "provider";

const ROLE_OPTIONS: { value: IntendedRole; labelKey: string; fallback: string; icon: React.ElementType; descKey: string; descFallback: string }[] = [
  { value: "teacher", labelKey: "signup.teacherAccount", fallback: "Teacher", icon: GraduationCap, descKey: "signup.teacherDesc", descFallback: "Find jobs, build credentials, grow your career" },
  { value: "school_admin", labelKey: "signup.schoolAccount", fallback: "School", icon: School, descKey: "signup.schoolDesc", descFallback: "Post jobs, manage staff, assign training" },
  { value: "provider", labelKey: "signup.providerAccount", fallback: "Training Provider", icon: Building2, descKey: "signup.providerDesc", descFallback: "Publish courses, manage content, reach educators" },
];

function resolveRoleFromParam(param: string | null): IntendedRole | null {
  if (param === "teacher") return "teacher";
  if (param === "school") return "school_admin";
  if (param === "provider") return "provider";
  return null;
}

const Signup = () => {
  const [searchParams] = useSearchParams();
  const initialRole = resolveRoleFromParam(searchParams.get("role"));

  const [roleIntent, setRoleIntent] = useState<IntendedRole | null>(initialRole);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [signUpComplete, setSignUpComplete] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user, loading: authLoading, refreshRoles } = useAuth();
  const redirectingRef = useRef(false);

  // Post-signup bootstrap (when auto-confirm is ON and session is created immediately)
  useEffect(() => {
    if (!signUpComplete || authLoading || !user || redirectingRef.current || !roleIntent) return;
    redirectingRef.current = true;

    const bootstrap = async () => {
      try {
        const { error: rpcError } = await supabase.rpc("bootstrap_initial_role", { _role: roleIntent });
        if (rpcError) console.error("Role bootstrap error:", rpcError);
        await refreshRoles();

        if (roleIntent === "school_admin") {
          const dest = await getSchoolAdminRedirect(user.id);
          navigate(dest, { replace: true });
        } else if (roleIntent === "provider") {
          navigate("/app/provider/start", { replace: true });
        } else {
          navigate("/app/teacher/onboarding", { replace: true });
        }
      } catch (err) {
        console.error("Bootstrap error:", err);
        setError("Account created but setup failed. Please try logging in.");
        setSubmitting(false);
        redirectingRef.current = false;
      }
    };
    bootstrap();
  }, [signUpComplete, authLoading, user, roleIntent, navigate, refreshRoles]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    // Hard validation: role must be selected
    if (!roleIntent) {
      setError("Please select an account type before signing up.");
      return;
    }

    const result = signupSchema.safeParse({ email, password });
    if (!result.success) {
      const errors: Record<string, string> = {};
      for (const issue of result.error.errors) {
        const key = issue.path[0]?.toString() ?? "form";
        if (!errors[key]) errors[key] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: result.data.email,
      password: result.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
        data: { intended_role: roleIntent },
      },
    });

    if (signUpError) {
      if (signUpError.message.includes("already registered") || signUpError.message.includes("already_exists")) {
        setError(t("signup.alreadyRegistered") || "This email is already registered. Please log in instead.");
      } else {
        setError(signUpError.message);
      }
      setSubmitting(false);
      return;
    }

    if (data.user && !data.session) {
      setConfirmationSent(true);
      setSubmitting(false);
      return;
    }

    if (data.user && data.session) {
      setSignUpComplete(true);
      return;
    }

    setSubmitting(false);
  };

  // ── Confirmation sent screen ──
  if (confirmationSent) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground">{t("signup.checkEmail") || "Check your email"}</h1>
          <p className="text-muted-foreground">
            {t("signup.confirmationMessage") || "We've sent a confirmation link to"}{" "}
            <strong className="text-foreground">{email}</strong>.
            {" "}{t("signup.confirmationInstructions") || "Please check your inbox and click the link to activate your account."}
          </p>
          <p className="text-sm text-muted-foreground">
            {t("signup.hasAccount")}{" "}
            <Link to="/login" className="text-primary underline">{t("signup.loginLink")}</Link>
          </p>
        </div>
      </div>
    );
  }

  // ── Main signup form ──
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground">{t("signup.title")}</h1>
          <p className="mt-2 text-muted-foreground">{t("signup.subtitle")}</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          {/* ── Account type picker ── */}
          <div className="space-y-2">
            <Label>{t("signup.accountType") || "Account type"}</Label>
            <RadioGroup
              value={roleIntent ?? ""}
              onValueChange={(v) => setRoleIntent(v as IntendedRole)}
              className="grid gap-2"
            >
              {ROLE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const selected = roleIntent === opt.value;
                return (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-3 rounded-md border p-3 cursor-pointer transition-colors ${
                      selected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground/30"
                    }`}
                  >
                    <RadioGroupItem value={opt.value} id={`role-${opt.value}`} />
                    <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{t(opt.labelKey) || opt.fallback}</p>
                      <p className="text-xs text-muted-foreground">{t(opt.descKey) || opt.descFallback}</p>
                    </div>
                  </label>
                );
              })}
            </RadioGroup>
          </div>

          {/* ── Email ── */}
          <div className="space-y-2">
            <Label htmlFor="email">{t("signup.email")}</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!fieldErrors.email}
            />
            {fieldErrors.email && <p className="text-xs text-destructive">{fieldErrors.email}</p>}
          </div>

          {/* ── Password ── */}
          <div className="space-y-2">
            <Label htmlFor="password">{t("signup.password")}</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={!!fieldErrors.password}
            />
            {fieldErrors.password && <p className="text-xs text-destructive">{fieldErrors.password}</p>}
            {password.length > 0 && (
              <ul className="space-y-1 mt-2">
                {PASSWORD_RULES.map((rule) => {
                  const pass = rule.test(password);
                  return (
                    <li key={rule.label} className={`flex items-center gap-1.5 text-xs ${pass ? "text-green-600" : "text-muted-foreground"}`}>
                      {pass ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      {rule.label}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* ── Error ── */}
          {error && (
            <div className="text-sm text-destructive space-y-1">
              <p>{error}</p>
              {error.includes("already registered") && (
                <Link to="/login" className="block text-primary underline">
                  {t("signup.loginLink") || "Log in"}
                </Link>
              )}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? t("signup.loading") : t("signup.submit")}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {t("signup.hasAccount")}{" "}
          <Link to="/login" className="text-primary underline">{t("signup.loginLink")}</Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
