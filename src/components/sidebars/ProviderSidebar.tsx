import { LayoutDashboard, Building2, BookOpen, Users, DollarSign } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useProviderOnboardingStatus } from "@/hooks/useProviderOnboardingStatus";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

type ProviderNavItem = {
  title: string;
  url: string;
  icon: typeof LayoutDashboard;
  /** Roles that can see this item. Empty = all roles. */
  allowedRoles?: string[];
};

const providerItems: ProviderNavItem[] = [
  { title: "Dashboard", url: "/app/provider/dashboard", icon: LayoutDashboard },
  { title: "Organization", url: "/app/provider/organization", icon: Building2 },
  { title: "Catalog", url: "/app/provider/catalog", icon: BookOpen, allowedRoles: ["owner", "admin", "editor"] },
  { title: "Team", url: "/app/provider/team", icon: Users, allowedRoles: ["owner", "admin"] },
];

export const ProviderSidebar = () => {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const { memberRole, providerStatus } = useProviderOnboardingStatus();

  // Filter items by member role
  const visibleItems = providerItems.filter((item) => {
    if (!item.allowedRoles || item.allowedRoles.length === 0) return true;
    return memberRole && item.allowedRoles.includes(memberRole);
  });

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Provider</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url || pathname.startsWith(item.url + "/")}>
                    <NavLink to={item.url} end={item.url === "/app/provider/dashboard"}>
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
};
