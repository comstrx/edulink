# EduLink Training — Credential / Certification Capability Audit

> **Status**: COMPLETE | **Date**: 2026-03-13 | **Type**: Structural Audit (read-only)

---

## 1. Database Layer

### Credential-Related Columns

| Table | Column | Type | Purpose |
|---|---|---|---|
| `training_items` | `credential_eligible` | boolean (NOT NULL, default `false`) | Flag: does completing this item earn a credential? |
| `training_items` | `credential_type_term_id` | uuid FK → `taxonomy_terms.id` (nullable) | Links to a taxonomy term identifying the credential type |
| `teacher_profiles` | `certification_ids` | uuid[] (nullable, default `'{}'`) | Legacy array of certification taxonomy term IDs on teacher profile |
| `teacher_certifications` | *(full table)* | — | Relational table storing teacher-held certifications with metadata |
| `jobs` | `certification_term_ids` | uuid[] (nullable, default `'{}'`) | Job posting required certifications |
| `intelligence_verified_state_snapshots` | `credentials` | jsonb (NOT NULL, default `'[]'`) | Intelligence engine credential verification state |

### `teacher_certifications` Table (existing)

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `teacher_id` | uuid FK → `teacher_profiles.id` | NO | — |
| `certification_term_id` | uuid FK → `taxonomy_terms.id` | NO | — |
| `issued_by` | text | YES | — |
| `issue_date` | date | YES | — |
| `expiry_date` | date | YES | — |
| `created_at` | timestamptz | NO | `now()` |
| `updated_at` | timestamptz | NO | `now()` |

**Purpose:** Stores external certifications a teacher already holds (PGCE, QTS, CELTA, etc.). This is a **hiring/profile** table, NOT a training-earned credential table.

### Taxonomy Domains

| Domain Key | Name | Term Count | Terms |
|---|---|---|---|
| `certification` | Certification | 16 | PGCE, Teaching License, QTS, TESOL, CELTA, TEFL, DELTA, IB Training, IB Educator Certificate, Montessori Certification, Safeguarding (with some duplicates across domains) |
| `certifications` | Certifications | — | Appears to be a duplicate/legacy domain |

**Note:** Two taxonomy domains exist (`certification` and `certifications`) — a potential cleanup target.

### Tables That Do NOT Exist

| Expected Table | Status |
|---|---|
| `earned_credentials` / `issued_credentials` | ❌ Does not exist |
| `credential_templates` | ❌ Does not exist |
| `credential_verifications` | ❌ Does not exist |
| `badge_definitions` | ❌ Does not exist |

---

## 2. Conceptual Distinction: External vs. Earned Credentials

The platform currently conflates two fundamentally different concepts:

| Concept | Description | Database Support |
|---|---|---|
| **External Certifications** | Credentials a teacher obtained outside EduLink (PGCE, QTS, CELTA, etc.) | ✅ `teacher_certifications` table + `certifications` taxonomy |
| **Earned Credentials** | Badges/certificates earned by completing EduLink training items | ❌ No table, no issuance logic, no verification |

The `training_items.credential_eligible` boolean and `credential_type_term_id` FK hint at earned credentials, but there is **no table to store issued credentials** and **no issuance workflow**.

---

## 3. UI Layer Inventory

### Components (4)

| Component | Path | Purpose |
|---|---|---|
| `CredentialCertificateRow` | `src/components/training/CredentialCertificateRow.tsx` | Row display for earned certificates (title, issuer, date, ID) |
| `CredentialBadgeCard` | `src/components/training/CredentialBadgeCard.tsx` | Card display for earned badges (title, category, earned date) |
| `CredentialSampleCard` | `src/components/training/CredentialSampleCard.tsx` | Marketing sample card (title, type, description, icon) |
| Various detail components | `TrainingDetailHero`, `TrainingOverviewTab` | Display `credentialEligible` and `credentialType` badges |

### Pages (4 total)

| Page | Route | Role | Data Source |
|---|---|---|---|
| `TrainingCertifications` | `/training/certifications` | **Public** marketing page | `CREDENTIAL_TYPES` (2), `SAMPLE_CREDENTIALS` (4) — hardcoded |
| `Credentials` (teacher) | `/app/teacher/credentials` | **Teacher** dashboard — wallet, certificates, badges, expiring | `certificates` (3), `badges` (4), `walletSummary`, `expiring` (1) — all hardcoded |
| `SchoolCredentials` | `/app/school/training/credentials` | **School** dashboard — team credential management | `mockCredentials` (5) — hardcoded |
| `Overview` (school) | `/app/school/training/overview` | School overview with credentials snapshot widget | `credentialsSnapshot` (3) — hardcoded |

### Cross-References

| Location | Credential Reference |
|---|---|
| `teacher/Training.tsx` | "Recent Credentials" section with 2 mock items |
| `teacher/Pathways.tsx` | `credential` field on pathway cards ("Certificate" / "Badge") |
| `teacher/MyLearning.tsx` | `credential` field on completed learning items |
| `TrainingForTeachers.tsx` | Feature card linking to `/training/certifications` |
| Training detail pages | `credentialEligible` and `credentialType` badges in hero + overview |
| School catalog | "Credential" badge on eligible items |
| Intelligence types | `credentialVerified` in trust signals |
| Recommendation engine | `certification_recommendation` type, `certificationPreparationOffers` |

---

## 4. Mock Data Inventory

| Mock Constant | Location | Records | Fields |
|---|---|---|---|
| `CREDENTIAL_TYPES` | `TrainingCertifications.tsx` | 2 | icon, title, description, examples[] |
| `SAMPLE_CREDENTIALS` | `TrainingCertifications.tsx` | 4 | title, type, color, icon, description |
| `certificates` | `teacher/Credentials.tsx` | 3 | title, issuer, date, id (e.g. "CERT-2026-0412") |
| `badges` | `teacher/Credentials.tsx` | 4 | title, earned, category |
| `walletSummary` | `teacher/Credentials.tsx` | 1 | certificates, badges, pathways, totalHours |
| `expiring` | `teacher/Credentials.tsx` | 1 | title, expires, daysLeft |
| `mockCredentials` | `school/Credentials.tsx` | 5 | id, teacher, credential, type, issued, expires, status |
| `credentialsSnapshot` | `school/Overview.tsx` | 3 | label, count, variant |
| `recentCredentials` | `teacher/Training.tsx` | 2 | title, type, date |

**Total mock objects: 25** across 9 constants in 5 files.

---

## 5. Implicit Entity Model (derived from mock data)

### Earned Credential (does not exist in DB)
- `id` (text — e.g. "CERT-2026-0412")
- `title` (text)
- `type` ("Certificate" | "Badge")
- `issuer` (text — "EduLink Training")
- `issued_date` (date)
- `expiry_date` (date, nullable)
- `category` (text — for badges)
- `status` ("active" | "expiring" | "expired")
- `teacher_id` / `teacher` (reference)
- `training_item_id` (implicit — which item was completed)

### Credential Wallet (aggregation, not a table)
- `certificates` count
- `badges` count
- `pathways_completed` count
- `total_pd_hours` numeric

### Credential Verification (described in UI, not implemented)
- Unique verification hash
- QR code / link-based lookup
- Tamper-proof / cryptographic binding

---

## 6. Two Credential Type Definitions (from UI)

| Type | Trigger | Depth | Stackable |
|---|---|---|---|
| **Badge** | Completing a single course, demonstrating a classroom technique, or finishing a practice cycle | Micro-credential | Yes |
| **Certificate** | Completing a structured pathway, training package, or assessed portfolio | Formal credential | No (one per pathway/package) |

These are defined as marketing content in the public page but have **no corresponding taxonomy terms or database distinction** for earned credentials.

---

## 7. Intelligence Layer Integration

The intelligence/recommendation engine references credentials in several places:

| Component | Reference | Status |
|---|---|---|
| `RecommendationEntry.type` | Includes `"mentor"` but no `"credential"` type | N/A |
| `recommendation-engine.ts` | `certification_recommendation` action type | ✅ Generates recommendations for missing certifications |
| `recommendation-data-loader.ts` | Loads `credential_eligible` from `training_items` | ✅ Reads flag |
| Gap engine | `certification_gap`, `missingCertificationIds` | ✅ Detects gaps in external certifications |
| Verified state snapshots | `credentials` jsonb, `credentialVerified` | ✅ Tracks verification status |

**Important distinction:** The intelligence layer works with **external certifications** (teacher_certifications), not earned EduLink credentials. The `credential_eligible` flag on training items is only used to surface catalog recommendations.

---

## 8. Capability Gap Summary

| Capability | UI Exists | Database Exists | Status |
|---|---|---|---|
| Flag training items as credential-eligible | ✅ | ✅ (`credential_eligible` boolean) | **Functional** |
| Link training item to credential type taxonomy | ✅ (badge display) | ✅ (`credential_type_term_id` FK) | **Functional** (display only) |
| Store external teacher certifications | ✅ (profile) | ✅ (`teacher_certifications` table) | **Functional** |
| Issue earned credentials on completion | ✅ (mock wallet) | ❌ | **Mock only** |
| Credential wallet (teacher view) | ✅ (3 certs, 4 badges, summary) | ❌ | **Mock only** |
| Credential management (school view) | ✅ (table with 5 records) | ❌ | **Mock only** |
| Credential expiry tracking | ✅ (expiring section) | ❌ (for earned credentials) | **Mock only** |
| Credential verification (hash/QR) | ✅ (marketing copy) | ❌ | **Concept only** |
| Badge definitions | ✅ (implicit) | ❌ | **Mock only** |
| Certificate templates | ✅ (implicit) | ❌ | **Mock only** |
| Credential type taxonomy ("Badge"/"Certificate") | ✅ (string labels) | ⚠️ Partial — `credential_type_term_id` exists but terms may not distinguish Badge vs Certificate | **Unclear** |

---

## 9. Naming Convention Status

Per platform standards, "Credentials" is the canonical term:

| Surface | Expected Convention | Actual | Status |
|---|---|---|---|
| Teacher route | `/app/teacher/credentials` | ✅ Correct | ✅ |
| School route | `/app/school/training/credentials` | ✅ Correct | ✅ |
| Public route | `/training/certifications` | ⚠️ Legacy naming | ⚠️ Should be `/training/credentials` |
| Component names | `Credential*` | ✅ `CredentialCertificateRow`, `CredentialBadgeCard`, `CredentialSampleCard` | ✅ |
| Page component | `TrainingCertifications` | ⚠️ Legacy naming | ⚠️ Should be `TrainingCredentials` |
| Taxonomy domain key | `certifications` | ⚠️ Refers to external certifications, appropriate for that context | ✅ (different concept) |

---

## 10. Risk Assessment

| Risk | Severity | Detail |
|---|---|---|
| **No earned credential table** | 🔴 High | The entire teacher and school credential UI is non-functional — no issuance, no storage, no retrieval |
| **External vs. earned conflation** | 🔴 High | `teacher_certifications` stores external certs (PGCE, QTS); there is no equivalent for EduLink-earned credentials. These must remain separate entities. |
| **Duplicate taxonomy domains** | 🟡 Medium | Both `certification` and `certifications` domains exist with overlapping terms |
| **No credential issuance workflow** | 🔴 High | No mechanism to trigger credential creation upon training completion |
| **No verification infrastructure** | 🟡 Medium | UI promises hash-based verification but no implementation exists |
| **Public route uses legacy naming** | 🟢 Low | `/training/certifications` should be `/training/credentials` per naming convention |
| **`credential_type_term_id` semantics unclear** | 🟡 Medium | Unclear if existing taxonomy terms distinguish "Badge" vs "Certificate" for earned credentials |

---

## 11. Final Verdict

| Aspect | Status |
|---|---|
| External certification storage | ✅ **Functional** — `teacher_certifications` table with full CRUD and RLS |
| Earned credential storage | ❌ **Not ready** — no table, no issuance, no retrieval |
| Credential UI scaffolding | ✅ **Complete** — 4 pages, 3 reusable components, clear Badge/Certificate distinction |
| Mock data coverage | ✅ **Comprehensive** — 25 mock objects model the implicit entity structure |
| Intelligence layer integration | ⚠️ **Partial** — works with external certifications only; no earned credential signals |
| Verification system | ❌ **Not started** — marketing copy exists, no infrastructure |
| Schema work required | 🔴 **Substantial** — earned credential table, issuance triggers, verification hashes, Badge/Certificate type taxonomy |

### Bottom Line

The credential capability has **two distinct layers** that must not be conflated:

1. **External Certifications** (PGCE, QTS, CELTA, etc.) — **fully functional** via `teacher_certifications` + taxonomy.
2. **Earned Credentials** (EduLink-issued Badges and Certificates) — **entirely mock**. Requires a new `earned_credentials` table, issuance workflow, completion triggers, and verification infrastructure. This is a standalone workstream separate from both the catalog schema and the external certification system.
