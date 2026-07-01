# EduLink Access Model

## Access Formula

```
Access = Auth + Role + Membership/Persona + Entitlement
```

Every protected surface in EduLink requires **all applicable layers** to grant access.
No single layer is sufficient on its own.

## Layers

### 1. Authentication (`RequireAuth`)
User must have a valid session via `auth.users`.

### 2. Role (`user_roles`)
User must hold the required role. Roles are global identifiers:
- `teacher`
- `school_admin`, `school_recruiter`, `school_academic_lead`, `school_training_manager`
- `provider`
- `admin`

### 3. Membership / Persona
Context-specific verification:
- **School users**: Must have an active `school_members` row (`RequireSchoolMembership`)
- **Mentor workspace**: Must have `mentors.status = 'active'` (`RequireActiveMentor`)
- **Provider**: Provider organization membership (future)

### 4. Entitlement (`RequireEntitlement`)
Explicit activation check. Module access is never implied by role alone.

#### Account Entitlements (`account_entitlements`)
Per-user module activation:
| Module Key | Description |
|---|---|
| `teacher_app` | Access to teacher workspace |
| `mentor_workspace` | Access to mentor tools |
| `provider_portal` | Access to provider workspace |
| `admin_console` | Access to admin console |

#### Organization Entitlements (`organization_entitlements`)
Per-organization module activation:
| Module Key | Description |
|---|---|
| `hiring` | School hiring workspace |
| `training` | School training workspace |
| `mentorship` | Mentorship features |
| `credentials` | Credential management |
| `provider_portal` | Provider portal access |
| `talent_pool` | Talent pool features |

## Route Guard Stacking

Guards execute in this order:

```
RequireAuth (role filter)
  → Membership/Persona guard
    → Entitlement guard
      → Layout + Content
```

### Examples

| Route | Guard Stack |
|---|---|
| `/app/mentor/*` | `RequireAuth(teacher)` → `RequireActiveMentor` → `RequireEntitlement(canUseMentorWorkspace)` |
| `/app/school/hiring/*` | `RequireAuth(school_admin, school_recruiter)` → `RequireSchoolMembership` → `RequireEntitlement(canUseHiring)` |
| `/app/school/training/*` | `RequireAuth(school_admin, school_academic_lead, school_training_manager)` → `RequireSchoolMembership` → `RequireEntitlement(canUseTraining)` |
| `/app/provider/*` | `RequireAuth(provider)` → `RequireEntitlement(canUseProviderPortal)` |
| `/admin/*` | `RequireAuth(admin)` → `RequireEntitlement(canUseAdminConsole)` |

## Capability Resolution

`useEffectiveEntitlements()` resolves the final boolean capabilities:

| Capability | Requires |
|---|---|
| `canUseHiring` | School role + school membership + `hiring` org entitlement |
| `canUseTraining` | School role + school membership + `training` org entitlement |
| `canUseMentorWorkspace` | Active mentor record + `mentor_workspace` account entitlement |
| `canUseProviderPortal` | Provider role + `provider_portal` account entitlement |
| `canUseAdminConsole` | Admin role + `admin_console` account entitlement |

## Database Security

- RLS on `account_entitlements`: users read own rows only; admins manage all
- RLS on `organization_entitlements`: users read entitlements for orgs they belong to; admins manage all
- Unique constraints prevent duplicate entitlement rows
- Validation triggers enforce allowed `module_key` and `source_type` values
