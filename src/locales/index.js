import en from "./en";
import hi from "./hi";

const translations = { en, hi };

/**
 * Get translations for a language code. Falls back to English if locale not found.
 * @param {string} lang - Language code (e.g. 'en', 'hi')
 * @returns {object} Translation strings for that language
 */
export const getTranslations = (lang) => translations.en;

export { en, hi };
