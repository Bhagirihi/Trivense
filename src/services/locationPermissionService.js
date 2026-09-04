import * as Location from "expo-location";

export async function requestLocationPermissionFromSetup() {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status;
  } catch (error) {
    console.warn("Location permission request failed:", error?.message || error);
    return "denied";
  }
}
