import { z } from "zod";

/* ─── Auth ─── */

export const signupSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Invalid email address")
    .max(255, "Email must be under 255 characters"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be under 128 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

export const loginSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const resetPasswordSchema = z
  .object({
    password: signupSchema.shape.password,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

/* ─── Teacher Profile / Onboarding ─── */

export const educationEntrySchema = z.object({
  degree_level: z.string().max(100).optional(),
  major: z.string().max(200).optional(),
  university: z.string().max(200).optional(),
  graduation_year: z
    .string()
    .optional()
    .refine(
      (v) => !v || (Number(v) >= 1950 && Number(v) <= new Date().getFullYear() + 5),
      { message: "Graduation year must be between 1950 and 5 years from now" }
    ),
});

export const teacherProfileSchema = z.object({
  full_name: z.string().trim().min(2, "Name must be at least 2 characters").max(120, "Name must be less than 120 characters"),
  subject_ids: z.array(z.string().uuid()).min(1, "Select at least one subject"),
  curriculum_ids: z.array(z.string().uuid()).min(1, "Select at least one curriculum"),
  years_of_experience: z
    .number()
    .int()
    .min(0, "Experience cannot be negative")
    .max(60, "Experience cannot exceed 60 years"),
  education: z.array(educationEntrySchema).optional(),
  country_id: z.string().uuid("Select a country"),
  region_id: z.string().uuid().optional().or(z.literal("")),
});

/* ─── Job ─── */

export const jobDraftSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
});

export const jobPublishSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().min(10, "Description is required (min 10 chars)"),
  subject_term_ids: z.array(z.string()).min(1, "At least one subject is required"),
  country_term_id: z.string().min(1, "Location (country) is required"),
});

/* ─── Provider Org ─── */

export const providerOrgSchema = z.object({
  display_name: z.string().trim().min(1, "Display name is required").max(200),
  bio: z.string().max(2000).optional().or(z.literal("")),
  contact_email: z
    .string()
    .trim()
    .email("Invalid email format")
    .optional()
    .or(z.literal("")),
  website_url: z
    .string()
    .trim()
    .url("Invalid URL format")
    .optional()
    .or(z.literal("")),
  logo_url: z.string().trim().url("Invalid URL").optional().or(z.literal("")),
  cover_url: z.string().trim().url("Invalid URL").optional().or(z.literal("")),
});

/* ─── Mentor Onboarding ─── */

export const mentorProfileSchema = z.object({
  headline: z.string().trim().min(5, "Headline must be at least 5 characters").max(200),
  bio: z.string().trim().min(20, "Bio must be at least 20 characters").max(2000),
  years_experience: z
    .number()
    .int()
    .min(0, "Cannot be negative")
    .max(60, "Cannot exceed 60 years"),
});

/* ─── Helpers ─── */

/** Extract first error message from a ZodError for display */
export function firstZodError(err: z.ZodError): string {
  return err.errors[0]?.message ?? "Validation failed";
}
