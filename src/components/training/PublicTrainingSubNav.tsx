import { NavLink } from "@/components/NavLink";
import { GraduationCap, Package, Route, Award, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Courses", to: "/training/courses", icon: GraduationCap },
  { label: "Packages", to: "/training/packages", icon: Package },
  { label: "Pathways", to: "/training/pathways", icon: Route },
  { label: "Credentials", to: "/training/credentials", icon: Award },
  { label: "Mentors", to: "/training/mentors", icon: Users },
];

const PublicTrainingSubNav = () => {
  return (
    <nav className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-6">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide -mb-px">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                "inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-3 text-sm font-medium border-b-2 transition-colors",
                "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}
              activeClassName="border-primary text-primary"
            >
              <item.icon className="h-3.5 w-3.5" />
              {item.label}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default PublicTrainingSubNav;
