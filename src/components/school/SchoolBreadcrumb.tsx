import { ChevronRight, Home } from "lucide-react";
import { Link } from "react-router-dom";

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

interface SchoolBreadcrumbProps {
  items: BreadcrumbItem[];
}

export default function SchoolBreadcrumb({ items }: SchoolBreadcrumbProps) {
  return (
    <nav className="flex items-center gap-1 text-xs text-muted-foreground mb-4">
      <Link to="/app/school/dashboard" className="hover:text-foreground transition-colors flex items-center gap-1">
        <Home className="h-3 w-3" />
        <span>Home</span>
      </Link>
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1">
          <ChevronRight className="h-3 w-3" />
          {item.to ? (
            <Link to={item.to} className="hover:text-foreground transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground font-medium">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
