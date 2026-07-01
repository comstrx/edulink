import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { loginSchema } from "@/lib/validation-schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PostAuthRedirector from "@/components/auth/PostAuthRedirector";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const redirectErrorRef = useRef(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    const result = loginSchema.safeParse({ email, password });
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

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: result.data.email,
        password: result.data.password,
      });

      if (signInError) {
        console.error("[Login] signInWithPassword error:", signInError.message);
        setError(signInError.message);
        setSubmitting(false);
        return;
      }

      // Sign-in succeeded. PostAuthRedirector will handle navigation
      // after AuthContext hydrates the user + roles.
      console.log("[Login] signIn success — waiting for auth hydration…");
    } catch (err: any) {
      console.error("[Login] signIn failed:", err);
      setError(err?.message || "Login failed. Please try again.");
      setSubmitting(false);
    }
  };

  const handleRedirectError = (message: string) => {
    redirectErrorRef.current = true;
    setError(message);
    setSubmitting(false);
  };

  // Authenticated user → delegate to PostAuthRedirector
  if (!authLoading && user && !redirectErrorRef.current) {
    return <PostAuthRedirector onError={handleRedirectError} />;
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground">{t("login.title")}</h1>
          <p className="mt-2 text-muted-foreground">{t("login.subtitle")}</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t("login.email")}</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!fieldErrors.email}
            />
            {fieldErrors.email && <p className="text-xs text-destructive">{fieldErrors.email}</p>}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">{t("login.password")}</Label>
              <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={!!fieldErrors.password}
            />
            {fieldErrors.password && <p className="text-xs text-destructive">{fieldErrors.password}</p>}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? t("login.loading") : t("login.submit")}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground">
          {t("login.noAccount")}{" "}
          <Link to="/signup" className="text-primary underline">{t("login.signUpLink")}</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
