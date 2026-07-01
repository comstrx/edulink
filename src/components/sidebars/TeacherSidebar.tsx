import {
  LayoutDashboard, FileText, User, Sparkles,
  GraduationCap, BookOpen, Route, FlaskConical,
  FileCheck, Award, Users, Library, Target,
  ChevronDown, Clock, Lightbulb, Bookmark,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useEffectiveEntitlements } from "@/hooks/useEffectiveEntitlements";
import { useMentorOnboardingStatus } from "@/hooks/useMentorOnboardingStatus";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton,
  useSidebar,
} from "@/components/ui/sidebar";

const coreItems = [
  { title: "Dashboard", url: "/app/teacher/dashboard", icon: LayoutDashboard },
  { title: "Applications", url: "/app/teacher/applications", icon: FileText },
  { title: "Saved Jobs", url: "/app/teacher/saved-jobs", icon: Bookmark },
  { title: "Recommendations", url: "/app/teacher/recommendations", icon: Lightbulb },
  { title: "Profile", url: "/app/teacher/profile", icon: User },
  { title: "Professional Intelligence", url: "/app/teacher/talent-profile", icon: Sparkles },
];

const trainingItems = [
  { title: "Overview", url: "/app/teacher/training", icon: GraduationCap },
  { title: "My Learning", url: "/app/teacher/my-learning", icon: BookOpen },
  { title: "Pathways", url: "/app/teacher/pathways", icon: Route },
  { title: "Practice", url: "/app/teacher/practice", icon: FlaskConical },
  { title: "Evidence", url: "/app/teacher/evidence", icon: FileCheck },
  { title: "Credentials", url: "/app/teacher/credentials", icon: Award },
  { title: "Mentors", url: "/app/teacher/mentors", icon: Users },
  { title: "Library", url: "/app/teacher/library", icon: Library },
  { title: "Skills", url: "/app/teacher/skills", icon: Target },
];

export function TeacherSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const { canUseMentorWorkspace } = useEffectiveEntitlements();
  const { mentorStatus, onboardingCompleted } = useMentorOnboardingStatus();

  const isTrainingActive = trainingItems.some((i) => pathname === i.url);

  // Determine mentor sidebar state based on lifecycle, not entitlement
  const isMentorActive = mentorStatus === "active" && onboardingCompleted;
  const isMentorInProgress = mentorStatus === "draft" || mentorStatus === "pending_review" || mentorStatus === "rejected";

  // Resolve mentor link destination
  let mentorUrl = "/app/mentor/start";
  let mentorLabel = "Become a Mentor";
  let MentorIcon = Sparkles;

  if (isMentorActive && canUseMentorWorkspace) {
    mentorUrl = "/app/mentor/sessions";
    mentorLabel = "Mentor Workspace";
    MentorIcon = Users;
  } else if (isMentorActive && !canUseMentorWorkspace) {
    mentorUrl = "/app/mentor/onboarding";
    mentorLabel = "Mentor Status";
    MentorIcon = Clock;
  } else if (mentorStatus === "paused") {
    mentorUrl = "/app/mentor/onboarding";
    mentorLabel = "Mentor (Paused)";
    MentorIcon = Clock;
  } else if (isMentorInProgress) {
    mentorUrl = "/app/mentor/onboarding";
    mentorLabel = mentorStatus === "pending_review" ? "Mentor Application" : "Complete Mentor Setup";
    MentorIcon = Clock;
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        {/* Core */}
        <SidebarGroup>
          <SidebarGroupLabel>Teacher</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {coreItems.map((item) => (
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

        {/* Training — collapsible */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <Collapsible defaultOpen={isTrainingActive} className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton isActive={isTrainingActive}>
                      <GraduationCap className="h-4 w-4" />
                      {!collapsed && (
                        <>
                          <span className="flex-1">Training</span>
                          <ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                        </>
                      )}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  {!collapsed && (
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {trainingItems.map((item) => (
                          <SidebarMenuSubItem key={item.title}>
                            <SidebarMenuSubButton asChild isActive={pathname === item.url}>
                              <NavLink to={item.url} end>
                                <item.icon className="h-3.5 w-3.5" />
                                <span>{item.title}</span>
                              </NavLink>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  )}
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Mentoring section — lifecycle-aware, entitlement only gates workspace */}
        <SidebarGroup>
          <SidebarGroupLabel>Mentoring</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname.startsWith("/app/mentor")}>
                  <NavLink to={mentorUrl}>
                    <MentorIcon className="h-4 w-4" />
                    {!collapsed && <span>{mentorLabel}</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
