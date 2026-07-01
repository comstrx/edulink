# Production Hardening & Performance Stabilization — Phase 4.2

## Overview

This document defines the performance guardrails, indexing strategy, and query safety rules for the EduLink Hiring OS. All search surfaces, intelligence snapshot reads, and data loading patterns must follow these constraints.

## Critical Query Paths

### 1. Talent Search (`useTalentSearch`)
- **Table**: `teacher_profiles` (single table, no joins)
- **Filters**: 15+ filterable fields (location, subjects, experience, availability, etc.)
- **Array filters**: Use `overlaps()` with GIN indexes
- **Verified filter**: Pre-fetches teacher IDs from `intelligence_verified_state_snapshots`, then uses `.in()`
- **Batch verification**: Single batch fetch for all result teacher IDs (no N+1)
- **Page size**: 18, capped at MAX_PAGE_SIZE (100)

### 2. Job Search (`useJobSearch`)
- **Table**: `jobs` (single table, no joins)
- **Filters**: Location, subjects, salary, employment type, etc.
- **Taxonomy resolution**: Batch resolves all term IDs after query
- **Page size**: 12, capped at MAX_PAGE_SIZE (100)

### 3. Applicant List (`useJobApplicants`)
- **Tables**: `applications` + `teacher_profiles` (2-query pattern)
- **Pattern**: Fetch applications → batch-fetch teacher profiles by ID
- **Intelligence**: Per-card hooks via `ApplicantIntelligenceRow` (acceptable for small sets)

### 4. Teacher Dashboard (intelligence cards)
- **Pattern**: 4 independent intelligence snapshot reads (CRI, Gap, Recommendations, Verification)
- **All from**: Dedicated snapshot tables (no computation in request path)
- **React Query dedup**: Prevents redundant fetches

## Database Indexing Strategy

### teacher_profiles (Talent Search)
| Index | Type | Purpose |
|-------|------|---------|
| `idx_teacher_profiles_public` | B-tree (partial) | `is_public_profile = true` filter |
| `idx_teacher_profiles_country_id` | B-tree | Country filter |
| `idx_teacher_profiles_region_id` | B-tree | Region filter |
| `idx_teacher_profiles_city_id` | B-tree | City filter |
| `idx_teacher_profiles_experience` | B-tree | Experience range filter |
| `idx_teacher_profiles_default_sort` | B-tree (composite, partial) | Default sort (featured + availability + experience) |
| `idx_teacher_profiles_subject_ids` | GIN | Subject overlap filter |
| `idx_teacher_profiles_curriculum_ids` | GIN | Curriculum overlap filter |
| `idx_teacher_profiles_grade_band_ids` | GIN | Grade band overlap filter |
| `idx_teacher_profiles_language_ids` | GIN | Language overlap filter |
| `idx_teacher_profiles_certification_ids` | GIN | Certification overlap filter |
| `idx_teacher_profiles_work_arrangement_ids` | GIN | Work arrangement overlap |
| `idx_teacher_profiles_employment_type_ids` | GIN | Employment type overlap |
| `idx_teacher_profiles_fullname_trgm` | GIN (pg_trgm) | ILIKE text search |

### jobs (Job Search)
| Index | Type | Purpose |
|-------|------|---------|
| `idx_jobs_published` | B-tree (partial) | Published status filter |
| `idx_jobs_default_sort` | B-tree (composite, partial) | Featured + date sort |
| `idx_jobs_country_term_id` | B-tree | Country filter |
| `idx_jobs_subject_term_ids` | GIN | Subject overlap |
| `idx_jobs_title_trgm` | GIN (pg_trgm) | ILIKE title search |
| `idx_jobs_salary_max/min` | B-tree (partial) | Salary sort |

### Intelligence Snapshots
| Index | Type | Purpose |
|-------|------|---------|
| `idx_cri_snapshots_teacher_job` | B-tree (composite) | CRI lookup by teacher+job |
| `idx_match_snapshots_teacher_job` | B-tree (composite) | Match lookup |
| `idx_gap_snapshots_teacher` | B-tree | Gap lookup by teacher |
| `idx_verified_state_snapshots_status` | B-tree (partial) | Verified-only filter |

## Performance Guardrails

### Page Size Limits
- Default page sizes are defined per surface in `src/lib/performance-guardrails.ts`
- Maximum page size: **100** (prevents unbounded queries via URL manipulation)
- All pagination uses 0-indexed internal state

### Query Safety
- **MAX_IN_FILTER_IDS**: 500 — limits `.in()` filter arrays to prevent oversized queries
- **clampIdList()**: Truncates ID arrays to safe lengths
- **safeOffset()**: Bounds-checks page offsets

### Stale Times (React Query)
| Category | Stale Time | Rationale |
|----------|------------|-----------|
| Intelligence snapshots | 5 min | Rarely change, expensive to compute |
| Search results | 1 min | Need moderate freshness |
| Taxonomy terms | 10 min | Very stable reference data |
| Verification state | 5 min | Matches intelligence cache |

### Performance Observability
- `trackQueryPerf()` wraps all search queries
- Automatically logs queries slower than 2 seconds
- Buffers last 100 entries for debug inspection via `getRecentPerfEntries()`
- `getAverageQueryTime(surface)` for surface-specific latency monitoring

## Snapshot Usage Rules

1. **UI MUST read from snapshot tables** — never from source/domain tables for intelligence data
2. **No computation in request path** — engines run via event pipeline only
3. **Snapshot freshness is metadata-only** — reading a stale snapshot does NOT trigger recomputation
4. **Batch fetching required** — all verification/intelligence data for result sets must be batch-fetched

## N+1 Prevention Checklist

| Surface | Pattern | Status |
|---------|---------|--------|
| Talent Search → verification | Batch fetch in search query | ✅ |
| Talent Search → teacher data | Single query with all columns | ✅ |
| Job Search → taxonomy names | Batch resolve after query | ✅ |
| Applicants → teacher profiles | Batch fetch by teacher IDs | ✅ |
| Applicants → intelligence | Per-card hooks (small sets OK) | ⚠️ Acceptable |
| Dashboard → intelligence | Independent hooks (1 per card) | ✅ |

## Guidelines for New Queries

1. Always use pagination with bounded page sizes
2. Add database indexes for any new filter field
3. Use GIN indexes for array overlap filters
4. Batch-fetch related data — never per-row
5. Use `trackQueryPerf()` for observability
6. Use `STALE_TIMES` constants for React Query configuration
7. Test with production-scale data volumes before shipping
