import { useLocation } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import {
  GraduationCap, BookOpen, Route, FlaskConical,
  FileCheck, Award, Users, Library, Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRef, useState, useEffect, useCallback } from "react";

const navItems = [
  { label: "Overview", to: "/app/teacher/training", icon: GraduationCap },
  { label: "My Learning", to: "/app/teacher/my-learning", icon: BookOpen },
  { label: "Pathways", to: "/app/teacher/pathways", icon: Route },
  { label: "Practice", to: "/app/teacher/practice", icon: FlaskConical },
  { label: "Evidence", to: "/app/teacher/evidence", icon: FileCheck },
  { label: "Credentials", to: "/app/teacher/credentials", icon: Award },
  { label: "Mentors", to: "/app/teacher/mentors", icon: Users },
  { label: "Library", to: "/app/teacher/library", icon: Library },
  { label: "Skills", to: "/app/teacher/skills", icon: Target },
];

const TrainingSubNav = () => {
  const { pathname } = useLocation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

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
              </NavLink>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default TrainingSubNav;
