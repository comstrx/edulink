import PlaceholderPage from "@/components/PlaceholderPage";
import { useLanguage } from "@/contexts/LanguageContext";

const Help = () => {
  const { t } = useLanguage();
  return <PlaceholderPage title={t("help.title")} subtitle={t("help.subtitle")} />;
};

export default Help;
