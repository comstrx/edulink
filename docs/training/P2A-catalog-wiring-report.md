# Sprint P2A — Training Catalog Listing Wiring Report

> **Status**: COMPLETE | **Date**: 2026-03-13 | **Sprint**: P2A

---

## 1. Query Functions Implemented

| Function | Location | Purpose |
|---|---|---|
| `fetchTrainingItems()` | `src/hooks/useTrainingSearch.ts` | Supabase query builder with filters, sorting, pagination |
| `resolveTermNames()` | `src/hooks/useTrainingSearch.ts` | Batch taxonomy ID → name resolution |

All queries read from `training_items` with RLS enforcing `status = 'published' AND is_active = true`.

---

## 2. Hooks Implemented

| Hook | Purpose |
|---|---|
| `useTrainingSearch` | Full search engine (replaces mock data) |
| `useTrainingFilterUrlSync` | Bidirectional URL ↔ filter state sync |

Both hooks implement the `SearchEngineReturn` contract from `src/lib/search-contract.ts`.

---

## 3. Routes Successfully Wired

| Route | Type Filter | Status |
|---|---|---|
| `/training/courses` | `type = 'course'` | ✅ Wired |
| `/training/packages` | `type = 'package'` | ✅ Wired |
| `/training/pathways` | `type = 'pathway'` | ✅ Wired |
| `/app/school/training/catalog` | Mixed (tab-switchable) | ✅ Wired |

---

## 4. Filters Enabled

| Filter | URL Param | Column | Operator |
|---|---|---|---|
| Competency Domain | `comp` | `competency_domain_term_ids` | `@> ARRAY[?]` |
| Grade Band | `grade` | `grade_band_term_ids` | `@> ARRAY[?]` |
| Curriculum | `cur` | `curriculum_term_ids` | `@> ARRAY[?]` |
| Subject | `subject` | `subject_term_ids` | `@> ARRAY[?]` |
| Learning Format | `format` | `learning_format_term_id` | `= ?` |
| Training Level | `level` | `training_level_term_id` | `= ?` |
| Skills (multi) | `skill` | `skill_term_ids` | `@> ARRAY[?]` |
| Text Search | `q` | `title`, `short_description` | `ILIKE` |

Removed deprecated filters: `deliveryModeId`, `languageLevelId`, `roleFamilyId`, `certifications`.

---

## 5. Sorting Behavior

| Sort Key | Column | Direction |
|---|---|---|
| `recommended` (default) | `created_at` | DESC |
| `newest` | `created_at` | DESC |
| `title-asc` | `title` | ASC |
| `duration` | `duration_hours` | ASC NULLS LAST |

Sort changes reset pagination to page 0.

---

## 6. Pagination

- Server-side via Supabase `.range(from, to)` with `{ count: 'exact' }`
- Page size: 4 (public), 6 (school catalog)
- `SearchPagination` component handles numbered page navigation
- 0-indexed internal state, 1-indexed UI labels

---

## 7. Mock Data Removal

- ✅ `MOCK_COURSES` — removed from `useTrainingSearch.ts`
- ✅ `MOCK_PACKAGES` — removed from `useTrainingSearch.ts`
- ✅ `MOCK_PATHWAYS` — removed from `useTrainingSearch.ts`
- ✅ `mockCourses` — removed from school `Catalog.tsx`
- ✅ `mockBundles` — removed from school `Catalog.tsx`

All catalog pages now query `training_items` via Supabase.

---

## 8. Filter Chip Resolution

All pages now use the shared `useFilterChipBuilder` hook to resolve taxonomy UUIDs into human-readable labels, consistent with Jobs and Talent search patterns.

---

## 9. URL State Preservation

Filter state is fully synced to URL query parameters. Refreshing preserves all active filters, sort, and page state.
