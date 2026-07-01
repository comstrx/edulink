import { NavLink } from "@/components/NavLink";
import { useLanguage } from "@/contexts/LanguageContext";

const JobsSubnav = () => {
  const { t } = useLanguage();

  const subnavItems = [
    { title: t("jobs.subnav.all"), url: "/jobs" },
    { title: t("jobs.subnav.schools"), url: "/schools" },
    { title: t("jobs.subnav.regions"), url: "/jobs/regions" },
    { title: t("jobs.subnav.esl"), url: "/jobs/esl" },
  ];

  return (
    <nav className="border-b border-border bg-muted/40">
      <div className="max-w-6xl mx-auto px-6 flex items-center gap-6 h-10">
        {subnavItems.map((item) => (
          <NavLink
            key={item.url}
            to={item.url}
            end={item.url !== "/schools"}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors py-2 border-b-2 border-transparent"
            activeClassName="text-foreground font-medium border-primary"
          >
            {item.title}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default JobsSubnav;
