import { ListTree, Building2, BookOpen, GraduationCap, Users, BrainCircuit } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useEffectiveEntitlements } from "@/hooks/useEffectiveEntitlements";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const items = [
  { title: "Taxonomy", url: "/admin/taxonomy", icon: ListTree },
  { title: "Training", url: "/admin/training", icon: GraduationCap },
  { title: "Providers", url: "/admin/providers", icon: Building2 },
  { title: "Provider Content", url: "/admin/provider-content", icon: BookOpen },
  { title: "Mentor Reviews", url: "/admin/mentor-reviews", icon: Users },
  { title: "Intelligence Backfill", url: "/admin/intelligence-backfill", icon: BrainCircuit },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const { canUseAdminConsole } = useEffectiveEntitlements();

  if (!canUseAdminConsole) return null;

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Admin</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <NavLink to={item.url} end>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
