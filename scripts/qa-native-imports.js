#!/usr/bin/env node
/**
 * Fail if TurboModule packages are imported at module top-level in app code.
 * Jest UI tests mock these — real devices need lazy imports instead.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "src");
const BLOCKED = [
  "react-native-google-mobile-ads",
  "react-native-purchases",
  "@react-native-clipboard/clipboard",
  "@sentry/react-native",
  "@react-native-google-signin/google-signin",
];

const ALLOWLIST = new Set([
  path.normalize("src/utils/lazyNativeModule.js"),
  // Lazy require() only after TurboModuleRegistry.get('RNGoogleSignin') soft probe
  path.normalize("src/services/googleAuthService.js"),
]);

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (/\.(js|jsx|ts|tsx)$/.test(entry.name)) files.push(full);
  }
  return files;
}

function checkFile(filePath) {
  const rel = path.relative(path.join(__dirname, ".."), filePath).split(path.sep).join("/");
  if (ALLOWLIST.has(rel)) return [];

  const content = fs.readFileSync(filePath, "utf8");
  const hits = [];

  for (const pkg of BLOCKED) {
    const patterns = [
      new RegExp(`^import\\s.+from\\s+['"]${pkg.replace("/", "\\/")}['"]`, "m"),
      new RegExp(`^import\\s+['"]${pkg.replace("/", "\\/")}['"]`, "m"),
      new RegExp(`require\\(['"]${pkg.replace("/", "\\/")}['"]\\)`, "m"),
    ];
    for (const pattern of patterns) {
      if (pattern.test(content)) {
        hits.push({ pkg, rel });
        break;
      }
    }
  }

  return hits;
}

const violations = [];
for (const file of walk(ROOT)) {
  violations.push(...checkFile(file));
}

console.log("\nNative import guard — TurboModule startup safety\n" + "═".repeat(48));

if (violations.length === 0) {
  console.log("OK: no blocked top-level native imports under src/\n");
  process.exit(0);
}

console.log("FAIL: top-level native imports detected (use lazy import()):\n");
for (const { pkg, rel } of violations) {
  console.log(`  • ${rel}  →  ${pkg}`);
}
console.log(
  "\nThese imports run before the native runtime is ready and cause:\n" +
    '  "[Runtime not ready] Invariant Violation: TurboModuleRegistry.getEnforcing(...)"\n'
);
process.exit(1);
