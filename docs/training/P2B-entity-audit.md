# EduLink Training Catalog — Entity Audit Report

> **Status**: COMPLETE | **Date**: 2026-03-13 | **Type**: Structural Audit (read-only)

---

## STEP 1 — Extracted Real Schema

### Table: `training_items`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `slug` | text | NO | — | UNIQUE |
| `type` | text | NO | `'course'` | Validated by trigger (`course`, `package`, `pathway`) |
| `title` | text | NO | — | |
| `description` | text | YES | — | Long-form content |
| `overview` | text | YES | — | Multi-paragraph introduction |
| `short_description` | text | YES | — | Card summary |
| `outcomes` | text[] | YES | `'{}'` | Array of learning outcomes |
| `syllabus` | text[] | YES | `'{}'` | Array of syllabus items |
| `duration` | text | YES | — | Human-readable (e.g. "6 hours") |
| `duration_hours` | numeric | YES | — | Sortable numeric value |
| `audience` | text | YES | — | |
| `thumbnail_url` | text | YES | — | |
| `learning_format_term_id` | uuid | YES | — | FK → `taxonomy_terms.id` |
| `training_level_term_id` | uuid | YES | — | FK → `taxonomy_terms.id` |
| `credential_type_term_id` | uuid | YES | — | FK → `taxonomy_terms.id` |
| `mentor_supported` | boolean | NO | `false` | |
| `credential_eligible` | boolean | NO | `false` | |
| `subject_term_ids` | uuid[] | YES | `'{}'` | GIN-indexed |
| `skill_term_ids` | uuid[] | YES | `'{}'` | GIN-indexed |
| `grade_band_term_ids` | uuid[] | YES | `'{}'` | GIN-indexed |
| `curriculum_term_ids` | uuid[] | YES | `'{}'` | GIN-indexed |
| `competency_domain_term_ids` | uuid[] | YES | `'{}'` | GIN-indexed |
| `status` | text | NO | `'draft'` | Validated by trigger (`draft`, `published`, `archived`) |
| `is_active` | boolean | NO | `true` | |
| `created_by` | uuid | NO | — | Author user ID |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | |

**Foreign Keys:**
- `learning_format_term_id` → `taxonomy_terms.id`
- `training_level_term_id` → `taxonomy_terms.id`
- `credential_type_term_id` → `taxonomy_terms.id`

**Indexes (15):**
| Index | Type | Definition |
|---|---|---|
| `training_items_pkey` | B-tree (unique) | `id` |
| `training_items_slug_key` | B-tree (unique) | `slug` |
| `idx_training_items_slug` | B-tree | `slug` |
| `idx_training_items_type` | B-tree (partial) | `type WHERE is_active = true` |
| `idx_training_items_status` | B-tree (partial) | `status WHERE is_active = true` |
| `idx_training_items_created_at` | B-tree | `created_at` |
| `idx_training_items_duration_hours` | B-tree | `duration_hours` |
| `idx_training_items_skill_term_ids` | GIN | `skill_term_ids` |
| `idx_training_items_subject_term_ids` | GIN | `subject_term_ids` |
| `idx_training_items_curriculum_term_ids` | GIN | `curriculum_term_ids` |
| `idx_training_items_grade_band_term_ids` | GIN | `grade_band_term_ids` |
| `idx_training_items_competency_domain_term_ids` | GIN | `competency_domain_term_ids` |

**Array Columns (5):** `outcomes`, `syllabus`, `subject_term_ids`, `skill_term_ids`, `grade_band_term_ids`, `curriculum_term_ids`, `competency_domain_term_ids`

**RLS Policies:**
- `Anyone can read published training items` → `status = 'published' AND is_active = true`
- `Admins can manage all training items` → full CRUD
- `School admin can manage training items` → `created_by = auth.uid()` + role check
- `Academic leads can manage training items` → `created_by = auth.uid()` + role check

---

### Table: `training_package_items`

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `package_id` | uuid | NO | — | FK → `training_items.id` |
| `item_id` | uuid | NO | — | FK → `training_items.id` |
| `sort_order` | integer | NO | `0` |
| `created_at` | timestamptz | NO | `now()` |

**Foreign Keys:**
- `package_id` → `training_items.id`
- `item_id` → `training_items.id`

**Unique Constraint:** `(package_id, item_id)` — prevents duplicate membership

**Indexes (3):**
| Index | Type | Definition |
|---|---|---|
| `training_package_items_pkey` | B-tree (unique) | `id` |
| `training_package_items_package_id_item_id_key` | B-tree (unique) | `(package_id, item_id)` |
| `idx_package_items_package` | B-tree | `package_id` |

**RLS Policies:**
- `Anyone can read published package items` → `package_id IN (SELECT id FROM training_items WHERE status = 'published' AND is_active = true)`
- `Admins can manage all package items` → full CRUD
- `School admin can manage own package items` → ownership via `created_by`
- `Academic leads can manage own package items` → ownership via `created_by`

---

### Table: `training_pathway_stages`

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `pathway_id` | uuid | NO | — | FK → `training_items.id` |
| `stage_item_id` | uuid | NO | — | FK → `training_items.id` |
| `stage_label` | text | YES | — | Human-readable stage name |
| `sort_order` | integer | NO | `0` |
| `created_at` | timestamptz | NO | `now()` |

**Foreign Keys:**
- `pathway_id` → `training_items.id`
- `stage_item_id` → `training_items.id`

**Unique Constraint:** `(pathway_id, stage_item_id)` — prevents duplicate stage membership

**Indexes (3):**
| Index | Type | Definition |
|---|---|---|
| `training_pathway_stages_pkey` | B-tree (unique) | `id` |
| `training_pathway_stages_pathway_id_stage_item_id_key` | B-tree (unique) | `(pathway_id, stage_item_id)` |
| `idx_pathway_stages_pathway` | B-tree | `pathway_id` |

**RLS Policies:**
- `Anyone can read published pathway stages` → `pathway_id IN (SELECT id FROM training_items WHERE status = 'published' AND is_active = true)`
- `Admins can manage all pathway stages` → full CRUD
- `School admin can manage own pathway stages` → ownership via `created_by`
- `Academic leads can manage own pathway stages` → ownership via `created_by`

---

### Table: `training_item_prerequisites`

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `training_item_id` | uuid | NO | — | FK → `training_items.id` |
| `prerequisite_item_id` | uuid | NO | — | FK → `training_items.id` |
| `is_required` | boolean | NO | `true` |
| `created_at` | timestamptz | NO | `now()` |

**Foreign Keys:**
- `training_item_id` → `training_items.id`
- `prerequisite_item_id` → `training_items.id`

**Unique Constraint:** `(training_item_id, prerequisite_item_id)` — prevents duplicate prerequisites

**Indexes (3):**
| Index | Type | Definition |
|---|---|---|
| `training_item_prerequisites_pkey` | B-tree (unique) | `id` |
| `training_item_prerequisites_training_item_id_prerequisite_i_key` | B-tree (unique) | `(training_item_id, prerequisite_item_id)` |
| `idx_prereqs_training_item` | B-tree | `training_item_id` |

**RLS Policies:**
- `Anyone can read published prereqs` → `training_item_id IN (SELECT id FROM training_items WHERE status = 'published' AND is_active = true)`
- `Admins can manage all prereqs` → full CRUD
- `School admin can manage own prereqs` → ownership via `created_by`
- `Academic leads can manage own prereqs` → ownership via `created_by`

---

## STEP 2 — Relationship Analysis

### Relationship Map

```
training_package_items.package_id  → training_items.id
training_package_items.item_id     → training_items.id

training_pathway_stages.pathway_id    → training_items.id
training_pathway_stages.stage_item_id → training_items.id

training_item_prerequisites.training_item_id      → training_items.id
training_item_prerequisites.prerequisite_item_id   → training_items.id

training_items.learning_format_term_id    → taxonomy_terms.id
training_items.training_level_term_id     → taxonomy_terms.id
training_items.credential_type_term_id    → taxonomy_terms.id
```

### Key Observations

1. **All satellite tables reference `training_items` exclusively.** There is no cross-referencing between satellite tables.
2. **`training_items` is the single hub entity.** Every relationship radiates from it.
3. **All three satellite tables use dual-FK self-referencing** — both columns point to `training_items.id`, creating typed relationships (package→item, pathway→stage, item→prerequisite).
4. **Taxonomy relationships use a hybrid model:** scalar FKs for single-value attributes (`learning_format_term_id`, `training_level_term_id`, `credential_type_term_id`) and UUID arrays with GIN indexes for multi-value attributes.

---

## STEP 3 — Domain Responsibility Classification

| Table | Classification | Rationale |
|---|---|---|
| `training_items` | **Core Entity** | Single canonical source for all training catalog items (courses, packages, pathways). Contains all content, metadata, taxonomy references, and lifecycle state. |
| `training_package_items` | **Junction Table** | Pure composition link between a package-type `training_items` row and its child items. Adds only `sort_order` for ordering. No content duplication. |
| `training_pathway_stages` | **Hierarchy Table** | Ordered stage mapping between a pathway-type `training_items` row and its stage items. Adds `stage_label` and `sort_order` to express progression semantics. |
| `training_item_prerequisites` | **Dependency Table** | Directed dependency graph between any two `training_items` rows. `is_required` flag distinguishes hard vs. soft prerequisites. No sequencing logic. |

---

## STEP 4 — Reuse Evaluation

### `training_items` — ✅ Reusable as-is

- Serves as the canonical catalog source for all three item types.
- Contains all fields needed for listing cards, detail pages, filtering, and sorting.
- Taxonomy integration is complete (5 GIN-indexed array columns + 3 scalar FKs).
- `type` discriminator cleanly separates courses, packages, and pathways without schema duplication.
- Partial indexes on `type` and `status` (filtered by `is_active`) optimize catalog queries.
- **Verdict:** Fully suitable for catalog listing, detail rendering, and admin CRUD.

### `training_package_items` — ✅ Reusable as-is

- Clean junction table with minimal columns (`package_id`, `item_id`, `sort_order`).
- Unique constraint prevents duplicate membership.
- `sort_order` supports ordered composition display.
- RLS correctly delegates visibility to the parent package's published state.
- **Verdict:** Fully suitable for package composition queries (e.g. "show all courses in this package").

### `training_pathway_stages` — ✅ Reusable as-is

- Adds `stage_label` for human-readable progression labels (e.g. "Foundation", "Advanced").
- `sort_order` defines progression sequence.
- Unique constraint prevents duplicate stage→item pairs.
- RLS correctly delegates visibility to the parent pathway's published state.
- **Verdict:** Fully suitable for pathway progression rendering. `stage_label` provides UI-ready labeling without requiring a separate stages metadata table.

### `training_item_prerequisites` — ✅ Reusable with caution

- Clean dependency graph with `is_required` flag for hard/soft distinction.
- Unique constraint prevents duplicate prerequisite links.
- **Caution:** No circular dependency prevention exists at the database level. Application logic must validate that adding a prerequisite does not create cycles.
- **Caution:** Prerequisites operate independently from pathway stage ordering. These must not be conflated — a pathway's `sort_order` defines progression sequence, while prerequisites define completion dependencies.
- **Verdict:** Suitable for dependency logic, but cycle detection must be enforced in application code.

---

## STEP 5 — Duplication Risk Detection

| Risk ID | Risk | Status | Assessment |
|---|---|---|---|
| DR-1 | Item metadata duplicated in `training_package_items` | ✅ **No risk** | `training_package_items` contains only `package_id`, `item_id`, `sort_order`. No content fields. |
| DR-2 | Pathway metadata duplicated in `training_pathway_stages` | ✅ **No risk** | `training_pathway_stages` contains only `pathway_id`, `stage_item_id`, `stage_label`, `sort_order`. `stage_label` is a junction-specific annotation, not duplicated content. |
| DR-3 | Package/pathway content stored outside `training_items` | ✅ **No risk** | Packages and pathways are themselves rows in `training_items` (with `type = 'package'` or `type = 'pathway'`). All content lives in the core entity. |
| DR-4 | Sequencing logic mixed with prerequisites | ✅ **No risk** | `training_item_prerequisites` has no `sort_order` column. Sequencing is handled exclusively by `training_pathway_stages.sort_order` and `training_package_items.sort_order`. Clear separation. |
| DR-5 | Taxonomy references duplicated across tables | ✅ **No risk** | Only `training_items` holds taxonomy references. Satellite tables reference items by FK only. |
| DR-6 | Redundant slug index | ⚠️ **Minor** | `training_items` has both a UNIQUE constraint index (`training_items_slug_key`) and an explicit B-tree index (`idx_training_items_slug`) on `slug`. The unique constraint already provides an index. The extra index is harmless but redundant. |

---

## STEP 6 — Architectural Role Map

```
training_items                  → Base Catalog Entity
                                   (Single Table Inheritance for course / package / pathway)

training_package_items          → Package Composition Layer
                                   (Ordered membership: package → child items)

training_pathway_stages         → Pathway Progression Layer
                                   (Ordered stages: pathway → stage items + labels)

training_item_prerequisites     → Dependency Logic Layer
                                   (Directed prerequisite graph with required/optional flag)
```

### Architecture Pattern: **Hub-and-Spoke with STI**

`training_items` uses **Single Table Inheritance** (the `type` column discriminates entity subtypes). All satellite tables spoke from the hub via dual foreign keys. This avoids separate tables for courses, packages, and pathways while maintaining clean relational composition.

---

## STEP 7 — Final Verdict Table

| Table | Role | Safe to Reuse | Risk |
|---|---|---|---|
| `training_items` | Base catalog entity (STI) | ✅ Yes | Minor: redundant slug index |
| `training_package_items` | Package composition | ✅ Yes | None |
| `training_pathway_stages` | Pathway progression | ✅ Yes | None |
| `training_item_prerequisites` | Dependency logic | ✅ Yes (with caution) | No DB-level cycle prevention; must not conflate with pathway sequencing |

### Overall Verdict: **FOUNDATION READY**

All four tables are architecturally sound and can serve as the canonical Training Catalog foundation for Phase 5. The schema follows a clean hub-and-spoke pattern with no duplication, proper index coverage, and correctly scoped RLS policies that delegate visibility from the core entity to satellite tables.
