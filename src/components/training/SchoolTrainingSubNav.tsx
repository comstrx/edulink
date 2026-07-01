import { useLocation } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import {
  LayoutDashboard, BookOpen, UserPlus, TrendingUp, Award,
  ShieldCheck, Library, Users, UsersRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRef, useState, useEffect, useCallback } from "react";
import { useSchoolAssignments } from "@/hooks/useTrainingAssignments";
import { Badge } from "@/components/ui/badge";

const navItems = [
  { label: "Overview", to: "/app/school/training/overview", icon: LayoutDashboard },
  { label: "Catalog", to: "/app/school/training/catalog", icon: BookOpen },
  { label: "Assign", to: "/app/school/training/assign", icon: UserPlus, showCount: true },
  { label: "Progress", to: "/app/school/training/team-progress", icon: TrendingUp },
  { label: "Credentials", to: "/app/school/training/credentials", icon: Award },
  { label: "Compliance", to: "/app/school/training/compliance", icon: ShieldCheck },
  { label: "Library", to: "/app/school/training/library", icon: Library },
  { label: "Mentors", to: "/app/school/training/mentors", icon: Users },
  { label: "Cohorts", to: "/app/school/training/cohorts", icon: UsersRound },
];

const SchoolTrainingSubNav = () => {
  const { pathname } = useLocation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const { data: assignments } = useSchoolAssignments();

  const activeCount = assignments?.filter((a) => a.status !== "cancelled" && a.status !== "completed" && a.status !== "certified").length ?? 0;

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      ro.disconnect();
    };
  }, [checkScroll]);

  return (
    <nav className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative">
        {canScrollLeft && (
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background/90 to-transparent z-10 pointer-events-none" />
        )}
        {canScrollRight && (
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background/90 to-transparent z-10 pointer-events-none" />
        )}

        <div
          ref={scrollRef}
          className="flex items-center gap-1 overflow-x-auto scrollbar-hide -mb-px"
        >
          {navItems.map((item) => {
            const isActive = pathname === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={cn(
                  "inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-3 text-sm font-medium border-b-2 transition-colors",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                )}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
                {item.showCount && activeCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5 text-[10px] font-semibold rounded-full">
                    {activeCount}
                  </Badge>
                )}
              </NavLink>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default SchoolTrainingSubNav;
