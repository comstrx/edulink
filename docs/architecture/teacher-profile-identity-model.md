# Teacher Profile Identity Model

## Overview

`teacher_profiles` is a **mixed-identity surface** containing two explicit profile source types:

| `profile_source` | Description | Can authenticate? | Can edit profile? | Visible in public directory? |
|---|---|---|---|---|
| `auth` | Real user linked to `auth.users` via `user_id` | ✅ Yes | ✅ Yes | ✅ Yes |
| `demo` | Synthetic showcase identity (seeded catalog data) | ❌ No | ❌ No | ✅ Yes |

## Why both types exist

- **`auth` profiles** are created during teacher onboarding when a real user signs up, verifies email, and completes the setup wizard. These are full operational identities.
- **`demo` profiles** were seeded as public catalog artifacts to populate the talent directory before real user growth. They use fabricated `user_id` values that do not map to `auth.users`.

## Operational rules

1. **Only `auth` profiles participate in ownership-based flows**: self-edit, onboarding continuation, training linkage, credential issuance, hiring signals, applications, and intelligence computation.
2. **`demo` profiles are read-only public catalog artifacts**: they appear in the public teacher directory and public profile pages with a "Featured Profile" badge, but all operational CTAs (Contact, Save, Schedule Interview) are hidden or disabled.
3. **School internal hiring workspace** (`/app/school/hiring/*`) excludes `demo` profiles entirely via the `excludeDemo` query option to prevent demo identities from entering real recruitment pipelines.
4. **No foreign key** exists from `teacher_profiles.user_id` to `auth.users(id)` — this is intentional to support the mixed-identity model without migration complexity.

## Validation

A database trigger (`trg_validate_teacher_profile_source`) enforces that `profile_source` must be either `'auth'` or `'demo'`. All new profiles default to `'auth'`.

## Future evolution options

As real user growth increases:

1. **Reduce demo visibility**: Add a filter to the public directory to deprioritize demo profiles when sufficient auth profiles exist. (Sort-ready structure already in place: `profile_source ASC` sorts auth before demo.)
2. **Archive demo profiles**: Set `is_public_profile = false` on demo profiles to remove them from public results without deleting data.
3. **Fallback-only display**: Show demo profiles only when search results would otherwise be empty, as visual inventory padding.
4. **Full removal**: Delete demo profiles once the platform has sufficient real educator registrations to sustain a credible public directory.

## Key files

- `src/hooks/useTalentSearch.ts` — public/school search engine, `excludeDemo` option, sort-ready `profile_source` ordering
- `src/components/talent-search/TeacherResultCard.tsx` — "Featured Profile" badge, CTA gating
- `src/components/teacher-profile/CandidatePanel.tsx` — detail page CTA gating, Featured Profile badge
- `src/pages/public/TeacherProfile.tsx` — passes `isDemo` to CandidatePanel
- `src/components/talent-search/FeaturedTeachers.tsx` — Featured badge in showcase section
- `src/pages/app/school/hiring/TalentSearch.tsx` — passes `excludeDemo: true`
