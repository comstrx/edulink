import { Outlet } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import LanguageToggle from "@/components/LanguageToggle";
import { useLanguage } from "@/contexts/LanguageContext";
import { Separator } from "@/components/ui/separator";
import PublicFooter from "@/components/PublicFooter";

const PublicLayout = () => {
  const { t } = useLanguage();

  const mainNav = [
    { title: t("nav.home"), url: "/" },
    { title: t("nav.jobs"), url: "/jobs" },
    { title: t("nav.hire"), url: "/hire" },
    { title: t("nav.training"), url: "/training" },
    { title: t("nav.pricing"), url: "/pricing" },
  ];

  const rightNav = [
    { title: t("nav.login"), url: "/login" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="h-16 border-b border-border flex items-center px-6 justify-between">
        <span className="font-bold text-lg text-foreground">EduLink</span>
        <nav className="flex items-center gap-5">
          {mainNav.map((item) => (
            <NavLink
              key={item.url}
              to={item.url}
              end={item.url === "/"}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              activeClassName="text-foreground font-medium"
            >
              {item.title}
            </NavLink>
          ))}
          <Separator orientation="vertical" className="h-4" />
          {rightNav.map((item) => (
            <NavLink
              key={item.title}
              to={item.url}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              activeClassName="text-foreground font-medium"
            >
              {item.title}
            </NavLink>
          ))}
          <LanguageToggle />
        </nav>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <PublicFooter />
    </div>
  );
};

export default PublicLayout;
