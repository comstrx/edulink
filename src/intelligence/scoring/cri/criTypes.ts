/**
 * CRI Scoring Engine — Types
 * Sprint 8H-A: Score & Logic Stabilization
 */

export interface CriInput {
  educationLevelTermId: string | null;
  yearsExperience: number | null;
  certificationIds: string[];
  languageLevelTermId: string | null;
  completedTrainingIds: string[];
  verificationStatus: {
    identityVerified: boolean;
    educationVerified: boolean;
    experienceVerified: boolean;
  };
}

export interface CriBreakdown {
  education: number;
  experience: number;
  certifications: number;
  training: number;
  language: number;
  verification: number;
}

export interface CriResult {
  score: number;
  breakdown: CriBreakdown;
}
