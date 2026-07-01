import PlaceholderPage from "@/components/PlaceholderPage";
import { useLanguage } from "@/contexts/LanguageContext";

const Terms = () => {
  const { t } = useLanguage();
  return <PlaceholderPage title={t("terms.title")} subtitle={t("terms.subtitle")} />;
};

export default Terms;
