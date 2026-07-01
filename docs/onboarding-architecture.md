# Onboarding & Access Architecture

## Platform Access Formula

```
Access = Auth + Role + Membership/Persona + Entitlement + Onboarding/Readiness
```

Each layer is enforced independently:

| Layer | Mechanism | Examples |
|---|---|---|
| **Auth** | `RequireAuth` guard | Must be signed in |
| **Role** | `RequireAuth(allowedRoles)` | `teacher`, `school_admin`, `provider` |
| **Membership** | `RequireSchoolMembership`, `RequireProviderMembership` | Active org membership |
| **Entitlement** | `RequireEntitlement(check)` | `canUseHiring`, `canUseProviderPortal` |
| **Onboarding** | `RequireOnboardingResolved` + domain guards | Profile/org setup complete |

## Normalized Onboarding States

All persona-specific onboarding states map into a shared vocabulary:

| Status | Meaning |
|---|---|
| `not_applicable` | User does not have this persona |
| `not_started` | Persona exists but setup not begun |
| `in_progress` | Setup started, not complete |
| `under_review` | Submitted for review (mentor/provider) |
| `complete` | Fully onboarded and ready |
| `blocked` | Suspended, rejected, or otherwise unable to proceed |

## Persona Mapping

### Teacher
- No profile → `not_started` (→ /app/teacher/start)
- Profile exists but missing `preferred_start` or `subject_ids` → `in_progress` (→ /app/teacher/start)
- `preferred_start` set AND `subject_ids.length > 0` → `complete`

### School
- No membership → `blocked` (→ /access-denied)
- Org incomplete → `in_progress` (→ /app/school/start)
- Complete → `complete`

### Mentor (Teacher Extension)
- No mentor record → `not_started` (→ /app/mentor/start)
- Draft → `in_progress` (→ /app/mentor/onboarding)
- Pending review → `under_review` (→ /app/mentor/onboarding)
- Active + onboarded → `complete`
- Paused/rejected → `blocked` (→ /app/mentor/onboarding)

### Provider
- No membership → `not_applicable`
- Draft/incomplete → `in_progress` (→ /app/provider/start)
- Pending review → `under_review` (→ /app/provider/start)
- Active + onboarded → `complete`
- Suspended/rejected → `blocked` (→ /app/provider/start)

## Orchestration Layer

### `useShellSnapshot()` — Identity Layer

Provides runtime identity context. Does NOT decide onboarding readiness.

Responsibilities:
- User identity (user, account, roles)
- Role booleans (isTeacher, isSchoolUser, isProvider, isAdmin)
- Domain profile signals (hasTeacherProfile, hasActiveMentorProfile)
- Organization context (currentSchoolId, currentProviderId, memberships)
- Shell orchestration (shellArea, sidebarType, defaultRedirect)
- Entitlement defaults (populated by useEffectiveEntitlements)

### `useOnboardingSnapshot()` — Readiness Layer

Composes domain-specific hooks into a single read model.
Teacher readiness is resolved here (not in shell) to maintain boundary.

Responsibilities:
- Aggregate persona onboarding states into normalized vocabulary
- Resolve blocking routes and next recommended steps
- Determine which persona is blocking workspace access

```ts
const snapshot = useOnboardingSnapshot();
// snapshot.teacher.status → "complete"
// snapshot.school.status → "in_progress"
// snapshot.blockingRoute → "/app/school/start"
// snapshot.hasBlockingOnboarding → true
// snapshot.blockingPersona → "school"
```

### Boundary Rule

> Shell snapshot owns **identity**.
> Onboarding snapshot owns **readiness**.
> Neither duplicates the other's responsibility.

### `RequireOnboardingResolved`

Centralized guard that reads the snapshot and redirects when onboarding
is incomplete for the current shell area. Setup/start routes are always
allowed through to prevent loops.

For teacher persona, it also redirects complete users away from setup
routes back to the dashboard.

### `OnboardingBanner`

Shell-level component that displays a non-intrusive banner when
onboarding is blocking, driven by `snapshot.blockingPersona`.

## Canonical Guard Order

All workspace route groups MUST follow this sequence:

```
RequireAuth(roles)
  → RequireMembership (school/provider — where applicable)
    → RequireEntitlement (where applicable)
      → RequireOnboardingResolved (or domain-specific guard)
        → Domain Workspace Layout
```

### Per-Persona Guard Stacks

**Teacher**
```
RequireAuth(["teacher"])
  → RequireOnboardingResolved
    → AppLayout
```

**School (Hiring)**
```
RequireAuth(["school_admin", "school_recruiter"])
  → RequireSchoolMembership
    → RequireEntitlement("canUseHiring")
      → RequireOnboardingResolved
        → AppLayout
```

**Provider Setup** (no entitlement/onboarding needed)
```
RequireAuth(["provider"])
  → RequireProviderMembership
    → AppLayout
```

**Provider Workspace**
```
RequireAuth(["provider"])
  → RequireProviderMembership
    → RequireEntitlement("canUseProviderPortal")
      → RequireProviderOnboarding
        → RequireOnboardingResolved
          → AppLayout
```

**Mentor Setup** (no entitlement needed)
```
RequireAuth(["teacher"])
  → AppLayout
```

**Mentor Workspace**
```
RequireAuth(["teacher"])
  → RequireActiveMentor
    → RequireEntitlement("canUseMentorWorkspace")
      → RequireMentorOnboarding
        → AppLayout
```

Setup/application routes (e.g., `/app/mentor/start`, `/app/provider/start`)
sit OUTSIDE entitlement + onboarding guards so users can complete setup
without needing workspace entitlements.

## Setup Route Whitelist

The following routes are whitelisted by `RequireOnboardingResolved` to
prevent redirect loops:

```
/app/teacher/start
/app/teacher/onboarding
/app/school/start
/app/school/onboarding
/app/mentor/start
/app/mentor/onboarding
/app/provider/start
/app/provider/onboarding
/app/provider/organization
```

## Public vs Workspace Boundary

Public routes (`/jobs`, `/training`, `/schools`, `/teachers/:id`, `/mentors`)
are served via `PublicLayout` and are NEVER affected by onboarding guards.
Onboarding logic only applies within `/app/*` and `/admin/*` route trees.

## Key Principle

> Onboarding orchestration determines the *next setup step* and
> *blocking routes*. It does NOT replace auth, role, membership,
> or entitlement enforcement — it sits above them.
