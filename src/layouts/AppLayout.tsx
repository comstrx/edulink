import { Outlet, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { TeacherSidebar } from "@/components/sidebars/TeacherSidebar";
import { SchoolSidebar } from "@/components/sidebars/SchoolSidebar";
import { ProviderSidebar } from "@/components/sidebars/ProviderSidebar";
import { UnresolvedShellFallback } from "@/components/shell/UnresolvedShellFallback";
import { ShellTopbar } from "@/components/shell/ShellTopbar";
import { OnboardingBanner } from "@/components/OnboardingBanner";
import { useShellSnapshot } from "@/hooks/useShellSnapshot";
import type { ComponentType } from "react";

/*
 * ═══════════════════════════════════════════════════════════════════════════
 * SIDEBAR RESOLUTION CONTRACT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Resolution order (deterministic, no hidden defaults):
 *
 *   1. Identity-driven: sidebarType from useShellSnapshot (preferred)
 *      → derived from primaryRole → shellArea → sidebarType
 *
 *   2. Path-namespace fallback: for deep-link edge cases where identity
 *      hasn't resolved yet (e.g. direct URL navigation before auth loads)
 *      → /app/school/* → school, /app/teacher/* → teacher, etc.
 *
 *   3. Unresolved: if neither identity nor path yields a valid key,
 *      render an explicit unresolved-shell state — never wrong-persona nav.
 *
 * Admin note: admin routes use AdminLayout directly and never flow through
 * AppLayout. If an admin user somehow hits AppLayout, they get the
 * unresolved state (safe) rather than teacher/school navigation (wrong).
 * ═══════════════════════════════════════════════════════════════════════════
 */

const SIDEBAR_MAP: Record<string, ComponentType> = {
  teacher: TeacherSidebar,
  school: SchoolSidebar,
  provider: ProviderSidebar,
  // admin uses AdminLayout with AdminSidebar — never routes through AppLayout
};

function resolveSidebarKey(
  identityType: string | null,
  pathname: string
): string | null {
  // Step 1: Identity-driven resolution
  if (identityType && identityType in SIDEBAR_MAP) return identityType;

  // Step 2: Path-namespace fallback (deep links before identity resolves)
  if (pathname.startsWith("/app/provider")) return "provider";
  if (pathname.startsWith("/app/school")) return "school";
  if (pathname.startsWith("/app/teacher") || pathname.startsWith("/app/mentor"))
    return "teacher";

  // Step 3: Unresolved — return null, caller renders explicit fallback
  return null;
}

const AppLayout = () => {
  const { sidebarType, shellArea, loading } = useShellSnapshot();
  const { pathname } = useLocation();

  const resolvedKey = resolveSidebarKey(sidebarType, pathname);
  const SidebarComponent = resolvedKey ? SIDEBAR_MAP[resolvedKey] : null;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background text-foreground">
        {/* Sidebar: resolved component OR explicit unresolved state */}
        {SidebarComponent ? (
          <SidebarComponent />
        ) : (
          !loading && <UnresolvedShellFallback />
        )}

        <div className="flex-1 flex flex-col">
          <header className="h-16 border-b border-border flex items-center px-4">
            {SidebarComponent && <SidebarTrigger className="mr-4" />}
            <ShellTopbar shellArea={shellArea} />
          </header>

          <OnboardingBanner />

          <main className="flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;
