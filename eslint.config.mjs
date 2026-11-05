// Flat config — see https://docs.expo.dev/guides/using-eslint/
import expoConfig from "eslint-config-expo/flat.js";

export default [
  ...expoConfig,
  {
    ignores: ["node_modules", "website", "android", "ios", ".expo", "dist"],
  },
];
