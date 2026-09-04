import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DEFAULT_CURRENCY } from "../config/currencyByCountry";
import { resolveCurrencyFromDevice } from "../services/locationCurrencyService";
import { setFormatterSettings } from "../utils/formatters";

const AppSettingsContext = createContext(null);

const LANGUAGE = "en";
const CURRENCY_KEY = "app_currency";
const CURRENCY_FROM_LOCATION_KEY = "app_currency_from_location";

export const AppSettingsProvider = ({ children }) => {
  const [language] = useState(LANGUAGE);
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
  const [currencyFromLocation, setCurrencyFromLocation] = useState(false);
  const [settingsReady, setSettingsReady] = useState(false);

  const applyFormatterState = useCallback((nextCurrency, hideSymbols) => {
    setFormatterSettings({
      language: LANGUAGE,
      currency: nextCurrency,
      hideCurrencySymbols: hideSymbols,
    });
  }, []);

  const detectAndApplyCurrency = useCallback(async () => {
    const detected = await resolveCurrencyFromDevice();

    if (detected?.currency) {
      await AsyncStorage.setItem(CURRENCY_KEY, detected.currency);
      await AsyncStorage.setItem(CURRENCY_FROM_LOCATION_KEY, "true");
      setCurrency(detected.currency);
      setCurrencyFromLocation(true);
      applyFormatterState(detected.currency, true);
      return detected;
    }

    const savedCurrency =
      (await AsyncStorage.getItem(CURRENCY_KEY)) || DEFAULT_CURRENCY;
    const fromLocation =
      (await AsyncStorage.getItem(CURRENCY_FROM_LOCATION_KEY)) === "true";

    setCurrency(savedCurrency);
    setCurrencyFromLocation(fromLocation);
    applyFormatterState(savedCurrency, fromLocation);
    return null;
  }, [applyFormatterState]);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedCurrency = await AsyncStorage.getItem(CURRENCY_KEY);
        const fromLocation =
          (await AsyncStorage.getItem(CURRENCY_FROM_LOCATION_KEY)) === "true";

        if (savedCurrency && fromLocation) {
          setCurrency(savedCurrency);
          setCurrencyFromLocation(true);
          applyFormatterState(savedCurrency, true);
        } else {
          await detectAndApplyCurrency();
        }
      } catch (error) {
        console.error("Error loading app settings:", error);
        applyFormatterState(DEFAULT_CURRENCY, false);
      } finally {
        setSettingsReady(true);
      }
    };

    loadSettings();
  }, [applyFormatterState, detectAndApplyCurrency]);

  const updateLanguage = async () => {
    // English only for now.
  };

  const updateCurrency = async () => {
    // Currency is auto-detected from location; manual override disabled.
  };

  return (
    <AppSettingsContext.Provider
      value={{
        language,
        currency,
        currencyFromLocation,
        settingsReady,
        updateLanguage,
        updateCurrency,
        detectAndApplyCurrency,
      }}
    >
      {children}
    </AppSettingsContext.Provider>
  );
};

export const useAppSettings = () => {
  const context = useContext(AppSettingsContext);
  if (!context) {
    throw new Error(
      "useAppSettings must be used within an AppSettingsProvider"
    );
  }
  return context;
};
