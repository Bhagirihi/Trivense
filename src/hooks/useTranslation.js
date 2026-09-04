import { useAppSettings } from "../context/AppSettingsContext";
import { getTranslations } from "../locales";

/**
 * Hook to get translated strings based on current app language.
 * @returns {{ t: (key: string) => string, language: string }}
 */
export const useTranslation = () => {
  const { language } = useAppSettings();
  const strings = getTranslations(language);

  const t = (key) => {
    return strings[key] ?? key;
  };

  return { t, language };
};
