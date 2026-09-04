let activeCurrency = "USD";
let activeLanguage = "en";
let hideCurrencySymbols = false;

export function setFormatterSettings({
  currency,
  language,
  hideCurrencySymbols: hideSymbols,
} = {}) {
  if (currency) activeCurrency = currency;
  if (language) activeLanguage = language;
  if (hideSymbols !== undefined) hideCurrencySymbols = hideSymbols;
}

export function shouldHideCurrencySymbols() {
  return hideCurrencySymbols;
}

export function getActiveCurrency() {
  return activeCurrency;
}

export const CURRENCY_SYMBOLS = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  INR: "₹",
  AUD: "A$",
  CAD: "C$",
  NZD: "NZ$",
  SGD: "S$",
  HKD: "HK$",
};

const CURRENCY_LOCALES = {
  USD: "en-US",
  EUR: "de-DE",
  GBP: "en-GB",
  INR: "en-IN",
  AUD: "en-AU",
  CAD: "en-CA",
  NZD: "en-NZ",
  SGD: "en-SG",
  HKD: "en-HK",
};

export function getCurrencySymbol(currencyCode) {
  if (hideCurrencySymbols) return "";
  const code = currencyCode || activeCurrency;
  return CURRENCY_SYMBOLS[code] || code;
}

function formatAmountDecimal(num, locale) {
  const fractionDigits =
    activeCurrency === "INR" || activeCurrency === "JPY" ? 0 : 2;
  return new Intl.NumberFormat(locale, {
    style: "decimal",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(num);
}

/**
 * Format a number as currency using the selected app currency.
 */
export const formatCurrency = (amount, currencyCode = null) => {
  const currencyToUse = currencyCode || activeCurrency;
  const num = Number(amount);
  if (Number.isNaN(num)) {
    return hideCurrencySymbols ? "0.00" : `${getCurrencySymbol(currencyToUse)}0.00`;
  }

  const locale = CURRENCY_LOCALES[currencyToUse] || "en-US";

  try {
    if (hideCurrencySymbols) {
      return formatAmountDecimal(num, locale);
    }
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyToUse,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  } catch {
    return hideCurrencySymbols
      ? num.toFixed(2)
      : `${getCurrencySymbol(currencyToUse)}${num.toFixed(2)}`;
  }
};

export const formatCompactCurrency = (amount, currencyCode = null) => {
  const currencyToUse = currencyCode || activeCurrency;
  const num = Number(amount);
  if (Number.isNaN(num)) return hideCurrencySymbols ? "0" : getCurrencySymbol(currencyToUse);

  const locale = CURRENCY_LOCALES[currencyToUse] || "en-US";

  try {
    if (hideCurrencySymbols) {
      return new Intl.NumberFormat(locale, {
        style: "decimal",
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(num);
    }
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyToUse,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(num);
  } catch {
    return hideCurrencySymbols
      ? num.toFixed(1)
      : `${getCurrencySymbol(currencyToUse)}${num.toFixed(1)}`;
  }
};

export const parseCurrency = (currencyString, currencyCode = null) => {
  const cleanString = String(currencyString || "").replace(/[^0-9.-]/g, "");
  return parseFloat(cleanString) || 0;
};

const getLocaleFromLanguage = () => "en-US";

export const formatDate = (date = new Date(), format = "medium") => {
  const locale = getLocaleFromLanguage(activeLanguage);

  const options = {
    short: {
      month: "short",
      day: "numeric",
      year: "numeric",
    },
    medium: {
      month: "long",
      day: "numeric",
      year: "numeric",
    },
    long: {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    },
  };

  return new Intl.DateTimeFormat(locale, options[format]).format(new Date(date));
};

export const formatPercentage = (value) => {
  const locale = getLocaleFromLanguage(activeLanguage);

  return new Intl.NumberFormat(locale, {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100);
};

export const formatNumber = (number) => {
  const locale = getLocaleFromLanguage(activeLanguage);
  return new Intl.NumberFormat(locale).format(number);
};

export const formatDateTime = (date, locale = "en-IN") => {
  try {
    if (!date) return "";

    const dateObj = typeof date === "string" ? new Date(date) : date;

    return dateObj.toLocaleDateString(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch (error) {
    console.error("Error formatting date and time:", error);
    return "";
  }
};

export const formatTime = (date, locale = "en-IN") => {
  try {
    if (!date) return "";

    const dateObj = typeof date === "string" ? new Date(date) : date;

    return dateObj.toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch (error) {
    console.error("Error formatting time:", error);
    return "";
  }
};

export const formatDateRange = (startDate, endDate, locale = "en-IN") => {
  try {
    if (!startDate || !endDate) return "";

    const start =
      typeof startDate === "string" ? new Date(startDate) : startDate;
    const end = typeof endDate === "string" ? new Date(endDate) : endDate;

    const startFormatted = start.toLocaleDateString(locale, {
      month: "short",
      day: "numeric",
    });

    const endFormatted = end.toLocaleDateString(locale, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    return `${startFormatted} - ${endFormatted}`;
  } catch (error) {
    console.error("Error formatting date range:", error);
    return "";
  }
};

export const formatRelativeTime = (date) => {
  try {
    if (!date) return "";

    const dateObj = typeof date === "string" ? new Date(date) : date;
    const now = new Date();
    const diffInSeconds = Math.floor((now - dateObj) / 1000);

    if (diffInSeconds < 60) {
      return "Just now";
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}m ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h ago`;
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days}d ago`;
    } else if (diffInSeconds < 2592000) {
      const weeks = Math.floor(diffInSeconds / 604800);
      return `${weeks}w ago`;
    } else if (diffInSeconds < 31536000) {
      const months = Math.floor(diffInSeconds / 2592000);
      return `${months}mo ago`;
    } else {
      const years = Math.floor(diffInSeconds / 31536000);
      return `${years}y ago`;
    }
  } catch (error) {
    console.error("Error formatting relative time:", error);
    return "";
  }
};

export const capitalizeFirstLetter = (string) => {
  if (!string) return "";
  return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
};
