import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  if (!code || code.trim().length === 0) {
    return new Response(
      JSON.stringify({ status: "invalid_code", message: "No verification code provided." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Sanitize code: only allow alphanumeric + hyphens
  const sanitizedCode = code.trim();
  if (!/^[A-Za-z0-9\-]+$/.test(sanitizedCode)) {
    return new Response(
      JSON.stringify({ status: "invalid_code", message: "Invalid verification code format." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Lookup credential by verification code using service role (bypasses RLS)
    const { data: credential, error } = await supabase
      .from("earned_credentials")
      .select("id, title, credential_kind, issuer_name, issued_at, expiry_date, status, verification_code, teacher_id, source_type")
      .eq("verification_code", sanitizedCode)
      .maybeSingle();

    if (error) {
      console.error("Verification lookup error:", error);
      return new Response(
        JSON.stringify({ status: "error", message: "Verification service error." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!credential) {
      return new Response(
        JSON.stringify({ status: "not_found", message: "No credential matches this verification code." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Resolve teacher display name (public-safe: name only)
    const { data: teacher } = await supabase
      .from("teacher_profiles")
      .select("full_name")
      .eq("id", credential.teacher_id)
      .maybeSingle();

    // Determine verification state
    let verificationStatus: string;
    if (credential.status === "revoked") {
      verificationStatus = "revoked";
    } else if (
      credential.expiry_date &&
      new Date(credential.expiry_date) < new Date()
    ) {
      verificationStatus = "expired";
    } else if (credential.status === "expired") {
      verificationStatus = "expired";
    } else {
      verificationStatus = "valid";
    }

    // Source type label mapping
    const sourceLabels: Record<string, string> = {
      training_item: "Training Course",
      training_package: "Training Package",
      training_pathway: "Learning Pathway",
    };

    // Return public-safe verification result
    const result = {
      status: verificationStatus,
      credential: {
        title: credential.title,
        credentialKind: credential.credential_kind,
        issuerName: credential.issuer_name,
        issuedAt: credential.issued_at,
        expiryDate: credential.expiry_date,
        verificationCode: credential.verification_code,
        holderName: teacher?.full_name ?? "EduLink Educator",
        sourceLabel: sourceLabels[credential.source_type] ?? "Training",
      },
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ status: "error", message: "Unexpected verification error." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
