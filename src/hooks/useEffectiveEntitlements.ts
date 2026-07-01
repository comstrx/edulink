import { useAccountEntitlements } from "./useAccountEntitlements";
import { useOrganizationEntitlements } from "./useOrganizationEntitlements";
import { useShellSnapshot } from "./useShellSnapshot";

/*
 * ═══════════════════════════════════════════════════════════════════════════
 * ENTITLEMENT CONTRACT — useEffectiveEntitlements
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * This hook is the SOLE source of truth for CAPABILITY / MODULE state:
 *
 *   ✅ Account-level enabled modules (mentor_workspace, admin_console, etc.)
 *   ✅ Organization-level enabled modules (hiring, training, etc.)
 *   ✅ Resolved capability booleans (canUseHiring, canUseTraining, etc.)
 *
 * It composes identity context (from useShellSnapshot) with entitlement
 * queries to produce capability decisions.
 *
 * This hook does NOT own:
 *
 *   ❌ Identity / role / membership state (owned by useShellSnapshot)
 *   ❌ Navigation item definitions (owned by sidebar components)
 *   ❌ Onboarding readiness (owned by useOnboardingSnapshot)
 *
 * Dependency direction:
 *   useEffectiveEntitlements → useShellSnapshot (reads identity context)
 *   useEffectiveEntitlements → useAccountEntitlements (reads account modules)
 *   useEffectiveEntitlements → useOrganizationEntitlements (reads org modules)
 *
 * Sidebar components should use this hook for module-gated visibility.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export function useEffectiveEntitlements() {
  const snapshot = useShellSnapshot();
  const account = useAccountEntitlements();
  const org = useOrganizationEntitlements();

  const loading = snapshot.loading || account.isLoading || org.isLoading;

  return {
    loading,

    // Module arrays — for iteration / inspection
    enabledAccountModules: account.enabledModules,
    enabledOrganizationModules: org.enabledModules,

    // Resolved capability booleans — intersection of identity + entitlement
    canUseHiring: snapshot.isSchoolUser && snapshot.hasSchoolMembership && org.hasModule("hiring"),
    canUseTraining: snapshot.isSchoolUser && snapshot.hasSchoolMembership && org.hasModule("training"),
    canUseMentorWorkspace: snapshot.canAccessMentorWorkspace && account.hasModule("mentor_workspace"),
    canUseProviderPortal: snapshot.isProvider && snapshot.hasProviderMembership && account.hasModule("provider_portal"),
    canUseAdminConsole: snapshot.isAdmin && account.hasModule("admin_console"),
  };
}
