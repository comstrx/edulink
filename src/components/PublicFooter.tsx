import React from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { CheckCircle } from "lucide-react";

const PublicFooter = () => {
  const { t } = useLanguage();
  const year = new Date().getFullYear();

  return (
    <div>
      {/* ─── TRUST STRIP ─── */}
      <section className="border-t border-border py-6 px-6">
        <div className="max-w-4xl mx-auto flex flex-wrap justify-center gap-8 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <CheckCircle className="h-4 w-4 text-primary" /> {t("footer.trust1")}
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle className="h-4 w-4 text-primary" /> {t("footer.trust2")}
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle className="h-4 w-4 text-primary" /> {t("footer.trust3")}
          </span>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-border bg-muted/40 pt-12 pb-6 px-6">
        <div className="max-w-5xl mx-auto">
          {/* Brand */}
          <div className="mb-10">
            <span className="font-bold text-lg text-foreground">EduLink</span>
            <p className="mt-1 text-sm text-muted-foreground max-w-xs">
              {t("footer.tagline")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("footer.regions")}
            </p>
          </div>

          {/* Link Columns */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            {/* Platform */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">{t("footer.col.platform")}</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/" className="text-muted-foreground hover:text-foreground hover:underline transition-colors">{t("nav.home")}</Link></li>
                <li><Link to="/jobs" className="text-muted-foreground hover:text-foreground hover:underline transition-colors">{t("nav.jobs")}</Link></li>
                <li><Link to="/hire" className="text-muted-foreground hover:text-foreground hover:underline transition-colors">{t("nav.hire")}</Link></li>
                <li><Link to="/training" className="text-muted-foreground hover:text-foreground hover:underline transition-colors">{t("nav.training")}</Link></li>
                <li><Link to="/pricing" className="text-muted-foreground hover:text-foreground hover:underline transition-colors">{t("nav.pricing")}</Link></li>
              </ul>
            </div>

            {/* For Teachers */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">{t("footer.col.teachers")}</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/for-teachers" className="text-muted-foreground hover:text-foreground hover:underline transition-colors">{t("footer.teacherArea")}</Link></li>
                <li><Link to="/jobs" className="text-muted-foreground hover:text-foreground hover:underline transition-colors">{t("footer.browseJobs")}</Link></li>
                <li><Link to="/training" className="text-muted-foreground hover:text-foreground hover:underline transition-colors">{t("nav.training")}</Link></li>
                <li><Link to="/signup?role=teacher" className="text-muted-foreground hover:text-foreground hover:underline transition-colors">{t("footer.createTeacher")}</Link></li>
              </ul>
            </div>

            {/* For Schools */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">{t("footer.col.schools")}</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/for-schools" className="text-muted-foreground hover:text-foreground hover:underline transition-colors">{t("footer.schoolArea")}</Link></li>
                <li><Link to="/hire" className="text-muted-foreground hover:text-foreground hover:underline transition-colors">{t("footer.talentSearch")}</Link></li>
                <li><Link to="/login" className="text-muted-foreground hover:text-foreground hover:underline transition-colors">{t("footer.postJob")}</Link></li>
                <li><Link to="/training/for-schools" className="text-muted-foreground hover:text-foreground hover:underline transition-colors">{t("footer.schoolTraining")}</Link></li>
                <li><Link to="/signup?role=school" className="text-muted-foreground hover:text-foreground hover:underline transition-colors">{t("footer.createSchool")}</Link></li>
              </ul>
            </div>

            {/* Company */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">{t("footer.col.company")}</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/about" className="text-muted-foreground hover:text-foreground hover:underline transition-colors">{t("footer.about")}</Link></li>
                <li><Link to="/contact" className="text-muted-foreground hover:text-foreground hover:underline transition-colors">{t("footer.contact")}</Link></li>
                <li><Link to="/help" className="text-muted-foreground hover:text-foreground hover:underline transition-colors">{t("footer.help")}</Link></li>
                <li><Link to="/privacy" className="text-muted-foreground hover:text-foreground hover:underline transition-colors">{t("footer.privacy")}</Link></li>
                <li><Link to="/terms" className="text-muted-foreground hover:text-foreground hover:underline transition-colors">{t("footer.terms")}</Link></li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-border pt-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>© {year} EduLink. {t("footer.rights")}</span>
            <div className="flex items-center gap-4">
              <Link to="/privacy" className="hover:text-foreground hover:underline transition-colors">{t("footer.privacy")}</Link>
              <Link to="/terms" className="hover:text-foreground hover:underline transition-colors">{t("footer.terms")}</Link>
              <span>
                {t("footer.loginNote")}{" "}
                <Link to="/login" className="text-primary hover:underline">{t("nav.login")}</Link>
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicFooter;
