import PlaceholderPage from "@/components/PlaceholderPage";
import { useLanguage } from "@/contexts/LanguageContext";

const About = () => {
  const { t } = useLanguage();
  return <PlaceholderPage title={t("about.title")} subtitle={t("about.subtitle")} />;
};

export default About;
