import PlaceholderPage from "@/components/PlaceholderPage";
import { useLanguage } from "@/contexts/LanguageContext";

const Privacy = () => {
  const { t } = useLanguage();
  return <PlaceholderPage title={t("privacy.title")} subtitle={t("privacy.subtitle")} />;
};

export default Privacy;
