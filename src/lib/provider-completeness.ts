/**
 * getProviderCompleteness — Domain logic for provider organization readiness.
 */

export interface ProviderCompletenessInput {
  display_name: string | null;
  legal_name: string | null;
  bio: string | null;
  contact_email: string | null;
  logo_url: string | null;
  status: string | null;
}

export interface ProviderCompleteness {
  isComplete: boolean;
  completionPercent: number;
  missingFields: string[];
}

export function getProviderCompleteness(input: ProviderCompletenessInput): ProviderCompleteness {
  const missingFields: string[] = [];

  if (!input.display_name || input.display_name.trim().length < 2) {
    missingFields.push("display_name");
  }

  if (!input.legal_name || input.legal_name.trim().length < 2) {
    missingFields.push("legal_name");
  }

  if (!input.bio || input.bio.trim().length < 20) {
    missingFields.push("bio");
  }

  if (!input.contact_email || !input.contact_email.includes("@")) {
    missingFields.push("contact_email");
  }

  if (!input.logo_url) {
    missingFields.push("logo_url");
  }

  const totalFields = 5;
  const completedFields = totalFields - missingFields.length;
  const completionPercent = Math.round((completedFields / totalFields) * 100);

  return {
    isComplete: missingFields.length === 0,
    completionPercent,
    missingFields,
  };
}
