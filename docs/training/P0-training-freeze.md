# Sprint P0 — Training Shell Freeze & Readiness Lock

> **Status**: FROZEN | **Date**: 2026-03-13 | **Sprint**: P0

---

## A) Training Freeze Document

### Shell Freeze Rules

1. The current Training UI shell is the **approved execution surface**. All future implementation MUST happen inside this shell.
2. No Training component may be redesigned, renamed, or relocated without a new sprint decision.
3. No new Training routes may be added until Phase 5 implementation begins.

### Route Freeze Rules

1. Every route listed in the Route Contract Matrix (Section B) is **frozen as an interface contract**.
2. Routes may receive real data wiring but must NOT change paths, audiences, or purposes.
3. Redirect routes (e.g., `/app/school/training/certificates` → `/credentials`) are also frozen.

### Scope In (This Sprint)

- Freeze shell decision
- Freeze route contracts
- Mock/placeholder audit
- UI-to-data mapping matrix
- Readiness tier classification

### Scope Out (NOT This Sprint)

- Enrollments, assignments, certificates, progress tracking
- Mentor workflows or recommendation logic
- New routes or navigation changes
- Any code changes

### Canonical Catalog Source

**`training_items`** is the canonical source for all catalog-facing pages. It uses a `type` discriminator (`course`, `package`, `pathway`) and taxonomy-based fields (`skill_term_ids`, `subject_term_ids`, `curriculum_term_ids`, `grade_band_term_ids`).

Supporting tables: `training_package_items`, `training_pathway_stages`, `training_item_prerequisites`.

---

## B) Route Contract Matrix

### Public Routes (Unauthenticated)

| Route | Audience | Purpose | UI Status | Data Status | Contract |
|---|---|---|---|---|---|
| `/training` | Public | Training hub — product type cards + static sections | Complete shell | Static + i18n strings | **FROZEN** |
| `/training/courses` | Public | Browse courses | Complete shell with search/filter | Mock (`MOCK_COURSES` in `useTrainingSearch`) | **FROZEN** |
| `/training/packages` | Public | Browse packages | Complete shell with search/filter | Mock (`MOCK_PACKAGES` in `useTrainingSearch`) | **FROZEN** |
| `/training/pathways` | Public | Browse pathways | Complete shell with search/filter | Mock (`MOCK_PATHWAYS` in `useTrainingSearch`) | **FROZEN** |
| `/training/certifications` | Public | Certification catalog | Complete shell | Static marketing content | **FROZEN** |
| `/training/mentors` | Public | Mentor directory | Complete shell | Static marketing content | **FROZEN** |
| `/training/for-teachers` | Public | Teacher-facing marketing | Complete shell | Static + i18n strings | **FROZEN** |
| `/training/for-schools` | Public | School-facing marketing | Complete shell | Static + i18n strings | **FROZEN** |
| `/training/:slug` | Public | Training item detail | Modular component shell | Mock (`MOCK_ITEMS` in `training-detail-data.ts`) | **FROZEN** |

### Teacher Routes (Authenticated — role: teacher)

| Route | Audience | Purpose | UI Status | Data Status | Contract |
|---|---|---|---|---|---|
| `/app/teacher/training` | Teacher | Training dashboard hub | Complete shell | Mock (hardcoded arrays) | **FROZEN** |
| `/app/teacher/my-learning` | Teacher | In-progress / assigned / completed / saved | Complete shell with tabs | Mock (hardcoded arrays) | **FROZEN** |
| `/app/teacher/pathways` | Teacher | Active / suggested / career pathways | Complete shell | Mock (hardcoded arrays) | **FROZEN** |
| `/app/teacher/credentials` | Teacher | Certificates, badges, verification status | Complete shell | Mock (hardcoded arrays) | **FROZEN** |
| `/app/teacher/practice` | Teacher | Practice tasks and reflections | Complete shell | Mock (hardcoded arrays) | **FROZEN** |
| `/app/teacher/evidence` | Teacher | Evidence artifacts for pathways | Complete shell with tabs | Mock (hardcoded arrays) | **FROZEN** |
| `/app/teacher/library` | Teacher | Saved resources and recommendations | Complete shell | Mock (hardcoded arrays) | **FROZEN** |
| `/app/teacher/mentors` | Teacher | Mentor relationship management | Complete shell | Mock (hardcoded object) | **FROZEN** |
| `/app/teacher/skills` | Teacher | Skill inventory | Complete shell | Mock or placeholder | **FROZEN** |
| `/app/teacher/certificates` | Teacher | Certificate management | Complete shell | Mock or placeholder | **FROZEN** |

### School Routes (Authenticated — role: school_admin)

| Route | Audience | Purpose | UI Status | Data Status | Contract |
|---|---|---|---|---|---|
| `/app/school/training/overview` | School | Training dashboard | Complete shell | Mock / static stats | **FROZEN** |
| `/app/school/training/catalog` | School | Browse & select training for staff | Complete shell with tabs | Mock (`mockCourses`, `mockBundles`) | **FROZEN** |
| `/app/school/training/assign` | School | Assign training to staff | Complete shell with table | Mock (`mockAssignments`) | **FROZEN** |
| `/app/school/training/team-progress` | School | Track team PD progress | Complete shell with table | Mock (`mockTeamMembers`, `mockDepartments`) | **FROZEN** |
| `/app/school/training/credentials` | School | View staff credentials | Complete shell with table | Mock (`mockCredentials`) | **FROZEN** |
| `/app/school/training/certificates` | School | Redirect → `/credentials` | Redirect only | N/A | **FROZEN** |
| `/app/school/training/compliance` | School | Compliance tracking | Complete shell | Mock / placeholder | **FROZEN** |
| `/app/school/training/library` | School | School resource library | Complete shell with tabs | Mock (`mockResources`, `mockCollections`) | **FROZEN** |
| `/app/school/training/mentors` | School | Mentor management | Complete shell | Mock / placeholder | **FROZEN** |
| `/app/school/training/cohorts` | School | Cohort management | Complete shell | Mock / placeholder | **FROZEN** |

**Total frozen routes: 29**

---

## C) Mock / Placeholder Audit

### Classification Key

| Classification | Meaning |
|---|---|
| **Static Marketing** | i18n-driven content, no data model needed |
| **Mock Catalog** | Uses hardcoded arrays mimicking `training_items` shape |
| **Placeholder Dashboard** | UI shell with hardcoded operational data (enrollments, progress, assignments) |
| **Taxonomy-Backed No-Op** | Uses taxonomy IDs in schema but no operational records exist |
| **Real-Ready** | Can be wired to existing `training_items` table now |

### Page Classifications

| Page | Classification |
|---|---|
| `/training` | Static Marketing |
| `/training/courses` | Mock Catalog → **Real-Ready** |
| `/training/packages` | Mock Catalog → **Real-Ready** |
| `/training/pathways` | Mock Catalog → **Real-Ready** |
| `/training/certifications` | Static Marketing |
| `/training/mentors` | Static Marketing |
| `/training/for-teachers` | Static Marketing |
| `/training/for-schools` | Static Marketing |
| `/training/:slug` | Mock Catalog → **Real-Ready** |
| `/app/school/training/overview` | Placeholder Dashboard |
| `/app/school/training/catalog` | Mock Catalog → **Real-Ready** |
| `/app/school/training/assign` | Placeholder Dashboard (needs `training_assignments` table) |
| `/app/school/training/team-progress` | Placeholder Dashboard (needs `training_enrollments` table) |
| `/app/school/training/credentials` | Placeholder Dashboard (needs `training_credentials_earned` table) |
| `/app/school/training/compliance` | Placeholder Dashboard (needs operational tables) |
| `/app/school/training/library` | Placeholder Dashboard |
| `/app/school/training/mentors` | Placeholder Dashboard |
| `/app/school/training/cohorts` | Placeholder Dashboard |
| `/app/teacher/training` | Placeholder Dashboard (needs `training_enrollments`) |
| `/app/teacher/my-learning` | Placeholder Dashboard (needs `training_enrollments`) |
| `/app/teacher/pathways` | Placeholder Dashboard (needs `training_enrollments` + pathway stages) |
| `/app/teacher/credentials` | Placeholder Dashboard (needs `training_credentials_earned`) |
| `/app/teacher/practice` | Placeholder Dashboard (needs practice tables — Phase 6) |
| `/app/teacher/evidence` | Placeholder Dashboard (needs evidence tables — Phase 6) |
| `/app/teacher/library` | Placeholder Dashboard |
| `/app/teacher/mentors` | Placeholder Dashboard (needs mentor tables — Phase 6) |
| `/app/teacher/skills` | Taxonomy-Backed No-Op |
| `/app/teacher/certificates` | Placeholder Dashboard |

---

## D) UI-to-Data Mapping Matrix

| Page | Canonical Data Source | Current Source | Additional Tables Needed |
|---|---|---|---|
| `/training/courses` | `training_items` WHERE `type='course'` | `MOCK_COURSES` in `useTrainingSearch` | None |
| `/training/packages` | `training_items` WHERE `type='package'` + `training_package_items` | `MOCK_PACKAGES` in `useTrainingSearch` | None |
| `/training/pathways` | `training_items` WHERE `type='pathway'` + `training_pathway_stages` | `MOCK_PATHWAYS` in `useTrainingSearch` | None |
| `/training/:slug` | `training_items` WHERE `slug=:slug` + prerequisites | `MOCK_ITEMS` dict in `training-detail-data.ts` | None |
| `/app/school/training/catalog` | `training_items` (all published) | `mockCourses`, `mockBundles` inline | None |
| `/app/teacher/training` | `training_enrollments` + `training_items` | Hardcoded arrays | `training_enrollments` |
| `/app/teacher/my-learning` | `training_enrollments` + `training_items` | Hardcoded arrays | `training_enrollments` |
| `/app/teacher/pathways` | `training_enrollments` WHERE type='pathway' + `training_pathway_stages` | Hardcoded arrays | `training_enrollments` |
| `/app/teacher/credentials` | `training_credentials_earned` | Hardcoded arrays | `training_credentials_earned` |
| `/app/school/training/assign` | `training_assignments` + `training_items` | `mockAssignments` inline | `training_assignments` |
| `/app/school/training/team-progress` | `training_enrollments` + `teacher_profiles` | `mockTeamMembers` inline | `training_enrollments` |
| `/app/school/training/credentials` | `training_credentials_earned` + `teacher_profiles` | `mockCredentials` inline | `training_credentials_earned` |
| `/app/school/training/compliance` | `training_assignments` + `training_enrollments` | Placeholder | `training_assignments`, `training_enrollments` |
| `/app/teacher/practice` | Future `training_practice_tasks` | Hardcoded arrays | Phase 6 table |
| `/app/teacher/evidence` | Future `training_evidence` | Hardcoded arrays | Phase 6 table |
| `/app/teacher/mentors` | Future `training_mentor_relationships` | Hardcoded object | Phase 6 table |

---

## E) Readiness Tier Classification

### Tier 1 — Ready for Real Data Wiring NOW

These pages can be connected to the existing `training_items` table with no new tables required.

| Page | Action Required |
|---|---|
| `/training/courses` | Replace `MOCK_COURSES` in `useTrainingSearch` with Supabase query on `training_items(type='course')` |
| `/training/packages` | Replace `MOCK_PACKAGES` with query on `training_items(type='package')` + `training_package_items` |
| `/training/pathways` | Replace `MOCK_PATHWAYS` with query on `training_items(type='pathway')` + `training_pathway_stages` |
| `/training/:slug` | Replace `MOCK_ITEMS` lookup with query on `training_items(slug=:slug)` |
| `/app/school/training/catalog` | Replace `mockCourses`/`mockBundles` with `training_items` query |

### Tier 2 — Blocked Until Supporting Operational Tables Exist

These pages require new transactional tables before they can display real data.

| Page | Blocking Table(s) |
|---|---|
| `/app/teacher/training` | `training_enrollments` |
| `/app/teacher/my-learning` | `training_enrollments` |
| `/app/teacher/pathways` | `training_enrollments` |
| `/app/teacher/credentials` | `training_credentials_earned` |
| `/app/school/training/assign` | `training_assignments` |
| `/app/school/training/team-progress` | `training_enrollments` |
| `/app/school/training/credentials` | `training_credentials_earned` |
| `/app/school/training/compliance` | `training_assignments` + `training_enrollments` |
| `/app/school/training/overview` | Multiple operational tables |

### Tier 3 — Intentionally Static / Deferred to Phase 6+

| Page | Reason |
|---|---|
| `/training` | Static marketing hub — no data wiring needed |
| `/training/certifications` | Static marketing — no data model required |
| `/training/mentors` | Static marketing — mentor system deferred |
| `/training/for-teachers` | Static marketing |
| `/training/for-schools` | Static marketing |
| `/app/teacher/practice` | Practice domain deferred to Phase 6 |
| `/app/teacher/evidence` | Evidence domain deferred to Phase 6 |
| `/app/teacher/mentors` | Mentor system deferred to Phase 6 |
| `/app/teacher/library` | Library concept deferred |
| `/app/school/training/library` | Library concept deferred |
| `/app/school/training/mentors` | Mentor system deferred to Phase 6 |
| `/app/school/training/cohorts` | Cohort system deferred |

---

## F) Decisions Record

| # | Decision | Status |
|---|---|---|
| 1 | Current Training shell is **frozen** | ✅ DECIDED |
| 2 | Current Training routes (29) are **frozen as interface contracts** | ✅ DECIDED |
| 3 | All Training implementation must occur **under the existing shell only** | ✅ DECIDED |
| 4 | `training_items` is the **canonical catalog source** | ✅ DECIDED |
| 5 | **Tier 1 catalog pages** are the first real-data wiring target | ✅ DECIDED |
| 6 | Teacher/school operational pages are **Tier 2** — blocked until transactional tables exist | ✅ DECIDED |
| 7 | Practice, Evidence, Mentors are **Tier 3** — deferred to Phase 6 | ✅ DECIDED |

---

## G) CRI Integration Note

The CRI engine currently reads training signals from `teacher_profiles.completed_training` (JSONB). This is a temporary stopgap. Phase 5 must eventually transition CRI training signals to read from relational `training_enrollments` / `training_credentials_earned` records. This refactor is classified as **Step 5.7** and is NOT part of Sprint P0.
