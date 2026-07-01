/**
 * Step 6E — Smart Glue Gap Integration Tests (Rule-Level Only)
 *
 * Tests rules directly with mock context.
 * No dispatcher. No Supabase. No context readers.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { onProfileUpdated } from "@/smart-glue/rules/identity-rules";
import { onMatchScoreUpdated } from "@/smart-glue/rules/intelligence-rules";
import { EVENT_NAMES } from "@/contracts/core/event-names";
import type { DomainEvent } from "@/contracts/core/domain-event";
import type { ProfileUpdatedPayload } from "@/contracts/identity/identity.contracts";
import type { MatchScoreUpdatedPayload } from "@/contracts/intelligence/intelligence.contracts";

const TEACHER_ID = "teacher-gap-glue-001";
const JOB_ID = "job-gap-glue-001";

const MEANINGFUL_CONTEXT = {
  hasMeaningfulChange: true,
  meaningfulFields: ["subject_term_ids"],
  cosmeticFields: ["bio"],
  hasExistingRecommendations: false,
  recommendationCount: 0,
};

function makeProfileUpdatedEvent(
  profileType: "teacher" | "school" = "teacher",
): DomainEvent<ProfileUpdatedPayload> {
  return {
    event: EVENT_NAMES.identity.profileUpdated,
    domain: "identity",
    version: 1,
    timestamp: new Date().toISOString(),
    payload: {
      userId: TEACHER_ID,
      profileId: `profile-${TEACHER_ID}`,
      profileType,
      updatedFields: ["subject_ids", "bio"],
    },
  };
}

function makeMatchScoreUpdatedEvent(): DomainEvent<MatchScoreUpdatedPayload> {
  return {
    event: EVENT_NAMES.intelligence.matchScoreUpdated,
    domain: "intelligence",
    version: 1,
    timestamp: new Date().toISOString(),
    payload: {
      teacherId: TEACHER_ID,
      jobId: JOB_ID,
      previousScore: 60,
      newScore: 75,
      updatedAt: new Date().toISOString(),
    },
  };
}

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("Step 6E — Gap Refresh Smart Glue (Rule-Level)", () => {
  describe("identity.profile_updated → gap refresh", () => {
    it("emits skill_gap_refresh_requested for meaningful teacher profile update", () => {
      const intents = onProfileUpdated.emitIntents(makeProfileUpdatedEvent(), MEANINGFUL_CONTEXT);
      const gapIntents = intents.filter(
        (i) => i.intent === EVENT_NAMES.intents.skillGapRefreshRequested,
      );

      expect(gapIntents).toHaveLength(1);
      expect(gapIntents[0].payload.teacherId).toBe(TEACHER_ID);
      expect(gapIntents[0].payload.triggeredBy).toBe(EVENT_NAMES.identity.profileUpdated);
    });

    it("emits CRI, match, and gap refresh together", () => {
      const intents = onProfileUpdated.emitIntents(makeProfileUpdatedEvent(), MEANINGFUL_CONTEXT);
      const names = intents.map((i) => i.intent);

      expect(names).toContain(EVENT_NAMES.intents.criRefreshRequested);
      expect(names).toContain(EVENT_NAMES.intents.matchRefreshRequested);
      expect(names).toContain(EVENT_NAMES.intents.skillGapRefreshRequested);
    });

    it("does NOT emit for school profile update (condition fails)", () => {
      expect(onProfileUpdated.condition?.(makeProfileUpdatedEvent("school"))).toBe(false);
    });
  });

  describe("intelligence.match_score_updated → gap refresh", () => {
    it("emits skill_gap_refresh_requested on match score change", () => {
      const intents = onMatchScoreUpdated.emitIntents(makeMatchScoreUpdatedEvent());
      const gapIntents = intents.filter(
        (i) => i.intent === EVENT_NAMES.intents.skillGapRefreshRequested,
      );

      expect(gapIntents).toHaveLength(1);
      expect(gapIntents[0].payload.teacherId).toBe(TEACHER_ID);
      expect(gapIntents[0].payload.jobId).toBe(JOB_ID);
      expect(gapIntents[0].payload.triggeredBy).toBe(EVENT_NAMES.intelligence.matchScoreUpdated);
    });

    it("emits training recommendation on match score change", () => {
      const intents = onMatchScoreUpdated.emitIntents(makeMatchScoreUpdatedEvent());
      const recIntents = intents.filter(
        (i) => i.intent === EVENT_NAMES.intents.trainingRecommendationRequested,
      );

      expect(recIntents).toHaveLength(1);
      expect(recIntents[0].payload.teacherId).toBe(TEACHER_ID);
    });
  });

  describe("metadata & payload correctness", () => {
    it("profile rule includes triggeredBy in gap intent payload", () => {
      const intents = onProfileUpdated.emitIntents(makeProfileUpdatedEvent(), MEANINGFUL_CONTEXT);
      const gap = intents.find((i) => i.intent === EVENT_NAMES.intents.skillGapRefreshRequested);

      expect(gap).toBeDefined();
      expect(gap!.payload.teacherId).toBe(TEACHER_ID);
      expect(gap!.payload.triggeredBy).toBe(EVENT_NAMES.identity.profileUpdated);
    });

    it("match rule includes jobId in gap intent payload", () => {
      const intents = onMatchScoreUpdated.emitIntents(makeMatchScoreUpdatedEvent());
      const gap = intents.find((i) => i.intent === EVENT_NAMES.intents.skillGapRefreshRequested);

      expect(gap!.payload.jobId).toBe(JOB_ID);
    });
  });

  describe("deduplication (rule-level)", () => {
    it("does not produce duplicate gap intents from profile rule", () => {
      const intents = onProfileUpdated.emitIntents(makeProfileUpdatedEvent(), MEANINGFUL_CONTEXT);
      const gapIntents = intents.filter(
        (i) => i.intent === EVENT_NAMES.intents.skillGapRefreshRequested,
      );
      expect(gapIntents).toHaveLength(1);
    });

    it("does not produce duplicate gap intents from match rule", () => {
      const intents = onMatchScoreUpdated.emitIntents(makeMatchScoreUpdatedEvent());
      const gapIntents = intents.filter(
        (i) => i.intent === EVENT_NAMES.intents.skillGapRefreshRequested,
      );
      expect(gapIntents).toHaveLength(1);
    });
  });
});
