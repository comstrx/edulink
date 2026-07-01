import { AlertCircle } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
} from "@/components/ui/sidebar";

/**
 * Explicit fallback rendered when the shell cannot resolve a valid workspace
 * context. This replaces the previous behavior of either showing nothing or
 * silently falling back to the teacher sidebar.
 *
 * Displayed when:
 *  - User is authenticated but has no resolvable persona/role
 *  - Shell area is "unknown" and path doesn't match any app namespace
 *  - Admin user accidentally ends up in AppLayout (structurally prevented
 *    by routing, but defended here as a guardrail)
 */
export function UnresolvedShellFallback() {
  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <div className="px-4 py-6 space-y-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span className="text-sm font-medium">Workspace not resolved</span>
              </div>
              <p className="text-xs text-muted-foreground/70 leading-relaxed">
                Your account is signed in but a workspace context could not be
                determined. This may happen if your account hasn't been assigned
                to a role or organization yet.
              </p>
              <p className="text-xs text-muted-foreground/70">
                If this persists, please contact support.
              </p>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
