

# Sprint 4 Parts 7-9 — Validation, Backfill Execution, and Product Verification

## Current State

| Table | Rows | Teachers (of 9) |
|---|---|---|
| intelligence_cri_snapshots | 3 | 3 |
| intelligence_match_snapshots | 3 | 3 |
| intelligence_gap_snapshots | 4 | 4 |
| intelligence_recommendation_snapshots | 0 | 0 |
| intelligence_verified_state_snapshots | 0 | 0 |
| intelligence_talent_profiles | 3 | 3 |

**Root blocker**: The backfill utility was built in Sprint 4 Part 6 but never executed. Additionally, RLS policies will block the backfill for demo teachers (who have fake user_ids like `00000000-...`).

## Critical RLS Gap

The backfill runs client-side as the logged-in user. Current RLS:
- `intelligence_recommendation_snapshots`: Has admin ALL policy — OK
- `intelligence_talent_profiles`: Has service role ALL policy — but no admin policy
- `intelligence_cri_snapshots`: **No admin INSERT/UPDATE** — only teacher-own
- `intelligence_gap_snapshots`: **No admin INSERT/UPDATE** — only teacher-own
- `intelligence_match_snapshots`: **No admin INSERT/UPDATE** — only teacher-own
- `intelligence_verified_state_snapshots`: **No admin INSERT/UPDATE** — only teacher-own

The backfill will silently fail for any teacher whose `user_id != auth.uid()`.

## Plan

### Step 1 — Add Admin RLS Policies (Migration)

Add "Admins can manage" (ALL) policies to 4 tables that lack them:
- `intelligence_cri_snapshots`
- `intelligence_gap_snapshots`
- `intelligence_match_snapshots`
- `intelligence_verified_state_snapshots`

Also add admin ALL policy to `intelligence_talent_profiles` (currently only has service role).

Pattern (same as existing `intelligence_recommendation_snapshots`):
```sql
CREATE POLICY "Admins can manage all X snapshots"
ON public.TABLE FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));
```

### Step 2 — Create Admin Backfill Trigger Page

Create `src/pages/app/admin/IntelligenceBackfill.tsx`:
- Protected by admin role check
- "Run Backfill" button that calls `runIntelligenceBackfill()`
- Shows live progress/results table
- Displays per-teacher success/failure with error details

Add route in app router, guarded by admin role.

### Step 3 — Run Backfill

After deployment, trigger backfill as admin user. Expected results:

| Table | Before | After |
|---|---|---|
| intelligence_cri_snapshots | 3 | ~9 |
| intelligence_match_snapshots | 3 | ~12 |
| intelligence_gap_snapshots | 4 | ~9 |
| intelligence_recommendation_snapshots | 0 | ~9 |
| intelligence_verified_state_snapshots | 0 | ~9 |
| intelligence_talent_profiles | 3 | ~9 |

### Step 4 — Product-Level Verification

After backfill, verify:
- Teacher Dashboard: recommendations card, readiness score, verified state badge show real data
- School Dashboard: growth summary reflects real data via intelligence bridge
- Talent Search: verified/readiness signals populated

## Execution Order

1. Database migration: add admin RLS policies (5 tables)
2. Create admin backfill page + route
3. User runs backfill as admin
4. Validate snapshot counts and product surfaces

## What This Does NOT Touch
- No DB schema changes (only RLS policies)
- No engine/contract changes
- No UI changes to existing pages
- No normalization changes

