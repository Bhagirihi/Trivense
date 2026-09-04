/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",
  setupFiles: ["<rootDir>/tests/setup-rn-mocks.js"],
  setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],
  testMatch: ["<rootDir>/tests/ui/**/*.test.js"],
  testPathIgnorePatterns: ["/node_modules/", "/android/", "/ios/"],
  collectCoverageFrom: [
    "src/**/*.{js,jsx}",
    "!src/**/*.d.ts",
  ],
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|react-native-svg|react-native-reanimated|react-native-google-mobile-ads|@sentry/react-native|react-native-purchases|react-native-worklets|react-native-ui-datepicker)",
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@expo/vector-icons$": "<rootDir>/tests/mocks/expo-vector-icons.js",
    "^@expo/vector-icons/(.*)$": "<rootDir>/tests/mocks/expo-vector-icons.js",
  },
};
