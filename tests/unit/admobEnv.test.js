/**
 * Regression test for the production test-ads bug (2026-11-05 QA).
 * Metro / babel-preset-expo only inlines STATIC `process.env.EXPO_PUBLIC_X`
 * dot-notation reads into the JS bundle. A dynamic `process.env[key]`
 * helper is NOT inlined: in production Hermes bundles `process.env` is an
 * empty object, so every lookup returned undefined and all ad units fell
 * back to Google test IDs even with the real IDs in EAS env. This test
 * reads the source and locks the static form in place — it does not import
 * the module, because Jest's Node `process.env` would hide the bug.
 */
import fs from "fs";
import path from "path";

const source = fs.readFileSync(
  path.join(__dirname, "..", "..", "src", "config", "admob.js"),
  "utf8",
);

const REQUIRED_VARS = [
  "EXPO_PUBLIC_ADMOB_ANDROID_APP_ID",
  "EXPO_PUBLIC_ADMOB_IOS_APP_ID",
  "EXPO_PUBLIC_ADMOB_ANDROID_BANNER",
  "EXPO_PUBLIC_ADMOB_IOS_BANNER",
  "EXPO_PUBLIC_ADMOB_ANDROID_BANNER_FOOTER",
  "EXPO_PUBLIC_ADMOB_IOS_BANNER_FOOTER",
  "EXPO_PUBLIC_ADMOB_ANDROID_BANNER_INLINE",
  "EXPO_PUBLIC_ADMOB_IOS_BANNER_INLINE",
  "EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL",
  "EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL",
  "EXPO_PUBLIC_ADMOB_ANDROID_APP_OPEN",
  "EXPO_PUBLIC_ADMOB_IOS_APP_OPEN",
  "EXPO_PUBLIC_ADMOB_ANDROID_REWARDED",
  "EXPO_PUBLIC_ADMOB_IOS_REWARDED",
];

describe("admob env inlining", () => {
  it("reads every AdMob env var with static dot notation", () => {
    for (const name of REQUIRED_VARS) {
      expect(source).toMatch(
        new RegExp(`process\\.env\\.${name}(?![A-Z_])`),
      );
    }
  });

  it("never uses dynamic process.env[key] access", () => {
    expect(source).not.toMatch(/process\.env\[/);
  });
});
