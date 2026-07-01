# EduLink Training — Mentor Capability Audit

> **Status**: COMPLETE | **Date**: 2026-03-13 | **Type**: Structural Audit (read-only)

---

## 1. Database Layer

### Mentor-Related Schema

| Table | Column | Type | Purpose |
|---|---|---|---|
| `training_items` | `mentor_supported` | boolean (NOT NULL, default `false`) | Flag indicating whether a training item includes mentor support |

**No dedicated mentor tables exist.** There are no tables for:
- Mentor profiles / entities
- Mentor–mentee pairings
- Mentoring sessions
- Session feedback / notes
- Mentor availability or scheduling
- Mentor specializations or taxonomy links

### Verdict: **No mentor data layer exists**

The only database-level mentor concept is a single boolean flag on `training_items`. All mentor-related UI is powered entirely by hardcoded mock data.

---

## 2. UI Layer Inventory

### Component

| Component | Path | Purpose |
|---|---|---|
| `MentorCard` | `src/components/training/MentorCard.tsx` | Reusable card displaying mentor name, title, specializations, model, rating, sessions, availability |

### Pages (3 total)

| Page | Route | Role | Data Source |
|---|---|---|---|
| `TrainingMentors` | `/training/mentors` | **Public** marketing page | `FEATURED_MENTORS` (6 hardcoded mentors), `SPECIALIZATIONS` (8 strings), `SUPPORT_MODELS` (3 objects) |
| `Mentors` (teacher) | `/app/teacher/mentors` | **Teacher** dashboard — my mentor, recommended experts, sessions, feedback | `myMentor`, `recommendedExperts` (3), `upcomingSessions` (1), `recentFeedback` (2) — all hardcoded |
| `SchoolMentors` | `/app/school/training/mentors` | **School** dashboard — available mentors, pairings, feedback | `mockMentors` (3), `mockPairings` (3), `mockFeedback` (2) — all hardcoded |

### Cross-References

| Location | Mentor Reference |
|---|---|
| `src/pages/app/teacher/Training.tsx` | "Mentor Support" section with CTA link to `/app/teacher/mentors` |
| `src/pages/app/teacher/Skills.tsx` | Suggestion text: "Connect with a mentor for guided support" |
| `src/components/training/detail/training-detail-data.ts` | `mentorSupported: true/false` on mock detail items; "mentor check-ins" in format strings |
| `src/intelligence/read-models/types/intelligence-read-models.types.ts` | `"mentor"` as a valid `RecommendationEntry.type` |

---

## 3. Mock Data Inventory

| Mock Constant | Location | Records | Fields |
|---|---|---|---|
| `FEATURED_MENTORS` | `TrainingMentors.tsx` | 6 | name, title, specializations[], model |
| `SPECIALIZATIONS` | `TrainingMentors.tsx` | 8 | string labels |
| `SUPPORT_MODELS` | `TrainingMentors.tsx` | 3 | icon, title, description |
| `myMentor` | `teacher/Mentors.tsx` | 1 | name, title, specializations[], model, sessions, lastSession |
| `recommendedExperts` | `teacher/Mentors.tsx` | 3 | name, title, specializations[], model |
| `upcomingSessions` | `teacher/Mentors.tsx` | 1 | mentor, topic, date, time |
| `recentFeedback` | `teacher/Mentors.tsx` | 2 | from, message, date |
| `mockMentors` | `school/Mentors.tsx` | 3 | id, name, specialty, rating, sessionsCompleted, availability |
| `mockPairings` | `school/Mentors.tsx` | 3 | mentee, mentor, focus, sessions, nextSession |
| `mockFeedback` | `school/Mentors.tsx` | 2 | mentor, mentee, date, summary |

**Total mock objects: 32** across 10 constants in 3 files.

---

## 4. Implicit Entity Model (derived from mock data)

The mock data implicitly defines the following entities that **do not exist in the database**:

### Mentor Profile
- `name` (text)
- `title` (text)
- `specializations` (text[])
- `model` (text — e.g. "Guided Learning", "Expert Feedback", "Coaching Sessions")
- `rating` (numeric)
- `sessionsCompleted` (integer)
- `availability` (text — "Available" / "Busy")

### Mentor–Mentee Pairing
- `mentee` (text / user reference)
- `mentor` (text / mentor reference)
- `focus` (text — topic area)
- `sessions` (integer — count)
- `nextSession` (date)

### Mentoring Session
- `mentor` (reference)
- `topic` (text)
- `date` (date)
- `time` (text)

### Session Feedback
- `mentor` (reference)
- `mentee` (reference)
- `date` (date)
- `summary` / `message` (text)

---

## 5. Mentoring Model Types

The UI defines three mentoring models (used as labels, not database entities):

| Model | Description |
|---|---|
| **Guided Learning** | Mentor walks alongside through a structured pathway, offering direction at each milestone |
| **Expert Feedback** | Submit practice evidence/assignments, receive detailed personalised feedback |
| **Coaching Sessions** | One-to-one or small-group coaching focused on goal-setting and reflection |

These are currently hardcoded strings. No taxonomy domain exists for mentoring models.

---

## 6. Capability Gap Summary

| Capability | UI Exists | Database Exists | Status |
|---|---|---|---|
| Flag training items as mentor-supported | ✅ | ✅ (`mentor_supported` boolean) | **Functional** |
| Display mentor profiles | ✅ (3 pages) | ❌ | **Mock only** |
| Mentor specializations | ✅ (badges) | ❌ | **Mock only** |
| Mentor availability | ✅ (badge) | ❌ | **Mock only** |
| Mentor ratings | ✅ (star display) | ❌ | **Mock only** |
| Mentor–mentee pairings | ✅ (school page) | ❌ | **Mock only** |
| Session scheduling | ✅ (placeholder) | ❌ | **Mock only** |
| Session feedback | ✅ (cards) | ❌ | **Mock only** |
| Mentoring model taxonomy | ✅ (string labels) | ❌ | **Mock only** |
| Mentor recommendations | ✅ (intelligence type) | ❌ | **Type defined, no data** |

---

## 7. Risk Assessment

| Risk | Severity | Detail |
|---|---|---|
| **No mentor entity in database** | High | All 3 mentor pages are entirely non-functional beyond visual scaffolding |
| **Mentoring model not in taxonomy** | Medium | "Guided Learning" / "Expert Feedback" / "Coaching Sessions" are hardcoded strings, not taxonomy terms |
| **Intelligence type defined prematurely** | Low | `RecommendationEntry.type` includes `"mentor"` but no mentor entity exists to recommend |
| **Pairing/session/feedback have no schema** | High | These are complex relational structures that will require significant schema design |
| **`mentor_supported` flag is orphaned** | Low | The boolean exists but has no downstream logic — it's a display-only badge |

---

## 8. Final Verdict

| Aspect | Status |
|---|---|
| Database readiness for mentoring | ❌ **Not ready** — only a single boolean flag exists |
| UI scaffolding | ✅ **Complete** — 3 pages, 1 reusable component, 3 mentoring models defined |
| Mock data coverage | ✅ **Comprehensive** — 32 mock objects model the implicit entity structure |
| Reuse potential of `MentorCard` | ✅ **High** — well-structured component with flexible props |
| Schema work required for Phase 5 | 🔴 **Substantial** — mentor profiles, pairings, sessions, feedback, and taxonomy domains all need creation |

### Bottom Line

The mentor capability is **fully scaffolded at the UI layer** but has **zero functional data infrastructure**. The `training_items.mentor_supported` boolean is the only database touchpoint. Implementing mentoring functionality would require designing and building an entirely new entity graph (mentor profiles, pairings, sessions, feedback) — this is a standalone workstream, not an extension of the existing catalog schema.
