# Sprint P1 — Training Catalog Readiness (Data & Schema Preparation)

> **Status**: COMPLETE | **Date**: 2026-03-13 | **Sprint**: P1

---

## 1. Schema Audit

### training_items — Final Column Inventory

| Column | Type | Status |
|---|---|---|
| `id` | uuid PK | ✅ Existed |
| `slug` | text UNIQUE | ✅ Existed |
| `title` | text NOT NULL | ✅ Existed |
| `description` | text | ✅ Existed (serves as long description) |
| `short_description` | text | ✅ **Added in P1** |
| `overview` | text | ✅ Existed |
| `type` | text (`course` / `package` / `pathway`) | ✅ Existed (validated by trigger) |
| `status` | text (`draft` / `published` / `archived`) | ✅ Existed (validated by trigger) |
| `thumbnail_url` | text | ✅ **Added in P1** |
| `duration` | text | ✅ Existed (human-readable) |
| `duration_hours` | numeric | ✅ **Added in P1** (sortable) |
| `training_level_term_id` | uuid FK → taxonomy_terms | ✅ Existed (difficulty level) |
| `learning_format_term_id` | uuid FK → taxonomy_terms | ✅ Existed |
| `skill_term_ids` | uuid[] + GIN | ✅ Existed |
| `subject_term_ids` | uuid[] + GIN | ✅ Existed |
| `curriculum_term_ids` | uuid[] + GIN | ✅ Existed |
| `grade_band_term_ids` | uuid[] + GIN | ✅ Existed |
| `competency_domain_term_ids` | uuid[] + GIN | ✅ **Added in P1** |
| `credential_eligible` | boolean | ✅ Existed |
| `credential_type_term_id` | uuid FK → taxonomy_terms | ✅ Existed |
| `mentor_supported` | boolean | ✅ Existed |
| `outcomes` | text[] | ✅ Existed |
| `syllabus` | text[] | ✅ Existed |
| `audience` | text | ✅ Existed |
| `is_active` | boolean | ✅ Existed |
| `created_by` | uuid NOT NULL | ✅ Existed |
| `created_at` | timestamptz | ✅ Existed |
| `updated_at` | timestamptz | ✅ Existed |

**No columns were removed.** Only 4 columns added: `short_description`, `thumbnail_url`, `duration_hours`, `competency_domain_term_ids`.

---

## 2. Taxonomy Compatibility

| Taxonomy Domain | Integration Method | Status |
|---|---|---|
| **skills** | `skill_term_ids uuid[]` + GIN index | ✅ Ready |
| **competency_domains** | `competency_domain_term_ids uuid[]` + GIN index | ✅ **Added in P1** |
| **grade_bands** | `grade_band_term_ids uuid[]` + GIN index | ✅ Ready |
| **curricula** | `curriculum_term_ids uuid[]` + GIN index | ✅ Ready |
| **subjects** | `subject_term_ids uuid[]` + GIN index | ✅ Ready |
| **certifications** | `credential_type_term_id uuid` FK | ✅ Ready |
| **learning_formats** | `learning_format_term_id uuid` FK | ✅ Ready |
| **training_levels** | `training_level_term_id uuid` FK | ✅ Ready |

### Architecture Decision: UUID Arrays (not junction tables)

The platform uses **UUID array columns with GIN indexes** for many-to-many taxonomy relationships. This is the established pattern across `jobs`, `teacher_profiles`, and now `training_items`. Junction tables are NOT used — filtering uses `@>` (contains) and `&&` (overlaps) operators against GIN-indexed arrays.

---

## 3. Relationship Tables

| Table | Purpose | Status |
|---|---|---|
| `training_package_items` | Links packages → child items (ordered) | ✅ Existed |
| `training_pathway_stages` | Links pathways → stage items (ordered + labeled) | ✅ Existed |
| `training_item_prerequisites` | Item → prerequisite dependencies | ✅ Existed |

No new junction tables were created. Taxonomy filtering uses the GIN-indexed array columns directly.

---

## 4. Seed Data Summary

| Type | Count | Slugs |
|---|---|---|
| **course** | 6 | `differentiated-instruction-masterclass`, `classroom-management-essentials`, `ib-curriculum-design-workshop`, `assessment-for-learning`, `digital-tools-for-engagement`, `trauma-informed-teaching` |
| **package** | 3 | `esl-teacher-starter-bundle`, `ib-leadership-track`, `early-years-foundations` |
| **pathway** | 2 | `aspiring-head-of-department`, `esl-specialist-certification-path` |

All items: `status = 'published'`, `is_active = true`, with taxonomy references to real term IDs.

### Taxonomy Coverage in Seed Data

- **Skills**: 10 distinct skill term IDs referenced
- **Competency domains**: 6 of 7 domains covered
- **Grade bands**: All 5 bands covered
- **Training levels**: Beginner, Intermediate, Advanced
- **Learning formats**: Self-Paced, Cohort-Based, Blended, Live Online, Mentor-Led
- **Curricula**: IB curriculum referenced where relevant
- **Subjects**: Languages referenced for ESL items

---

## 5. Readiness Verdict

### Query Readiness ✅

| Query Pattern | Verified |
|---|---|
| Filter by `type` | ✅ Returns 6 courses, 3 packages, 2 pathways |
| Filter by skill (`@>`) | ✅ e.g. differentiated-instruction returns 4 items |
| Filter by curriculum (`@>`) | ✅ IB filter returns 2 items |
| Filter by competency domain | ✅ Leadership domain returns 2 items |
| Sort by `duration_hours ASC` | ✅ Correct ordering |
| Sort by `created_at DESC` | ✅ Newest first |
| Pagination (`LIMIT/OFFSET`) | ✅ Verified with LIMIT 3 OFFSET 3 |

### Index Readiness ✅

| Index | Type | Column |
|---|---|---|
| `idx_training_items_type` | btree | `type` |
| `idx_training_items_status` | btree | `status` |
| `idx_training_items_created_at` | btree | `created_at` |
| `idx_training_items_slug` | btree | `slug` |
| `idx_training_items_duration_hours` | btree | `duration_hours` |
| `idx_training_items_skill_term_ids` | GIN | `skill_term_ids` |
| `idx_training_items_subject_term_ids` | GIN | `subject_term_ids` |
| `idx_training_items_curriculum_term_ids` | GIN | `curriculum_term_ids` |
| `idx_training_items_grade_band_term_ids` | GIN | `grade_band_term_ids` |
| `idx_training_items_competency_domain_term_ids` | GIN | `competency_domain_term_ids` |

### Final Verdict: **CATALOG READY**

`training_items` can serve as the canonical catalog source for all Tier 1 pages. The UI still uses mock data — wiring will occur in Sprint P2.
