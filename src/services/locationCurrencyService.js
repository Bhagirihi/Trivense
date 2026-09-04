import * as Location from "expo-location";
import { currencyForCountry } from "../config/currencyByCountry";

function getRegionFromDeviceLocale() {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    const parts = String(locale || "").split(/[-_]/);
    if (parts.length >= 2) {
      return parts[parts.length - 1].toUpperCase();
    }
  } catch {
    // ignore
  }
  return null;
}

async function getCountryFromLocation() {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== "granted") return null;

    const position =
      (await Location.getLastKnownPositionAsync()) ||
      (await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Low,
      }));

    if (!position?.coords) return null;

    const [place] = await Location.reverseGeocodeAsync(position.coords);
    return place?.isoCountryCode?.toUpperCase() ?? null;
  } catch {
    return null;
  }
}

/**
 * Resolve currency from device location (GPS) or locale region.
 * @returns {Promise<{ countryCode: string, currency: string } | null>}
 */
export async function resolveCurrencyFromDevice() {
  const countryCode =
    (await getCountryFromLocation()) || getRegionFromDeviceLocale();

  if (!countryCode) return null;

  const currency = currencyForCountry(countryCode);
  if (!currency) return null;

  return { countryCode, currency };
}
