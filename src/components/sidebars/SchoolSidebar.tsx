import {
  Briefcase, Users, GitBranch, CalendarCheck,
  BookOpen, UserPlus, TrendingUp, Award,
  CreditCard, Settings, Search, ShieldCheck,
  Library, UsersRound, LayoutDashboard, BarChart3,
  Building, Home, HelpCircle,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffectiveEntitlements } from "@/hooks/useEffectiveEntitlements";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

/** Persistent home link — always visible regardless of entitlements */
const homeItem = { title: "Home", url: "/app/school/dashboard", icon: Home };

const hiringItems = [
  { title: "Overview", url: "/app/school/hiring/overview", icon: LayoutDashboard },
  { title: "Jobs", url: "/app/school/hiring/jobs", icon: Briefcase },
  { title: "Talent Search", url: "/app/school/hiring/talent-search", icon: Search },
  { title: "Applicants", url: "/app/school/hiring/applicants", icon: Users },
  { title: "Pipeline", url: "/app/school/hiring/pipeline", icon: GitBranch },
  { title: "Interviews", url: "/app/school/hiring/interviews", icon: CalendarCheck },
  { title: "Analytics", url: "/app/school/hiring/analytics", icon: BarChart3 },
];

const trainingItems = [
  { title: "Overview", url: "/app/school/training/overview", icon: LayoutDashboard },
  { title: "Catalog", url: "/app/school/training/catalog", icon: BookOpen },
  { title: "Assign", url: "/app/school/training/assign", icon: UserPlus },
  { title: "Team Progress", url: "/app/school/training/team-progress", icon: TrendingUp },
  { title: "Credentials", url: "/app/school/training/credentials", icon: Award },
  { title: "Compliance", url: "/app/school/training/compliance", icon: ShieldCheck },
  { title: "Library", url: "/app/school/training/library", icon: Library },
  { title: "Mentors", url: "/app/school/training/mentors", icon: Users },
  { title: "Cohorts", url: "/app/school/training/cohorts", icon: UsersRound },
];

const adminItems = [
  { title: "Team", url: "/app/school/team", icon: UsersRound },
  { title: "Workforce", url: "/app/school/workforce", icon: Building },
  { title: "Billing", url: "/app/school/billing", icon: CreditCard },
  { title: "Settings", url: "/app/school/settings", icon: Settings },
];

/** Fallback items shown to any school role when no modules are available */
const baseSchoolItems = [
  { title: "Settings", url: "/app/school/settings", icon: Settings },
  { title: "Help", url: "/app/school/start", icon: HelpCircle },
];

export function SchoolSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const { roles } = useAuth();
  const { canUseHiring, canUseTraining, loading: entLoading } = useEffectiveEntitlements();

  // Role checks
  const isAdmin = roles.includes("school_admin");
  const hasHiringRole = isAdmin || roles.includes("school_recruiter");
  const hasTrainingRole = isAdmin || roles.includes("school_academic_lead") || roles.includes("school_training_manager");

  const showHiring = hasHiringRole && canUseHiring;
  const showTraining = hasTrainingRole && canUseTraining;
  const showAdmin = isAdmin;

  // Determine if user has any module-driven nav to show
  const hasModuleNav = showHiring || showTraining || showAdmin;

  const renderItems = (items: typeof hiringItems) =>
    items.map((item) => (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton asChild isActive={pathname === item.url}>
          <NavLink to={item.url} end>
            <item.icon className="h-4 w-4" />
            {!collapsed && <span>{item.title}</span>}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    ));

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        {/* Home — always visible */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === homeItem.url}>
                  <NavLink to={homeItem.url} end>
                    <homeItem.icon className="h-4 w-4" />
                    {!collapsed && <span>{homeItem.title}</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {showHiring && (
          <SidebarGroup>
            <SidebarGroupLabel>Hiring</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>{renderItems(hiringItems)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        {showTraining && (
          <SidebarGroup>
            <SidebarGroupLabel>Training</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>{renderItems(trainingItems)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        {showAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>{renderItems(adminItems)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Fallback: valid school role but no module-driven sections visible */}
        {!hasModuleNav && !entLoading && (
          <SidebarGroup>
            <SidebarGroupLabel>School</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>{renderItems(baseSchoolItems)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
