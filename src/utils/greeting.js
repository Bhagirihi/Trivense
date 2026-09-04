/**
 * Time-of-day greeting for the home dashboard (Rasoi-style).
 */
export function getLocalizedGreeting(t) {
  const hour = new Date().getHours();

  if (hour < 12) {
    return {
      greeting: t("greetingMorning"),
      subtitle: t("dashboardSubtitleMorning"),
    };
  }

  if (hour < 17) {
    return {
      greeting: t("greetingAfternoon"),
      subtitle: t("dashboardSubtitleAfternoon"),
    };
  }

  return {
    greeting: t("greetingEvening"),
    subtitle: t("dashboardSubtitleEvening"),
  };
}

export function getFirstName(fullName, fallback) {
  const trimmed = String(fullName || "").trim();
  if (!trimmed) return fallback;
  return trimmed.split(/\s+/)[0];
}
