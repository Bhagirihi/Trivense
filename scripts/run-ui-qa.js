#!/usr/bin/env node
/**
 * Run each UI QA module 3 times (stability check).
 * NOTE: These are Jest component tests with mocked native modules.
 * They do NOT validate TurboModules on a device. Also run:
 *   npm run qa:native-imports
 *   npx expo start  (dev client build, not Expo Go)
 * Usage: npm run qa:ui
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const REPEAT = 3;
const UI_DIR = path.join(__dirname, "..", "tests", "ui");
const modules = fs
  .readdirSync(UI_DIR)
  .filter((f) => f.endsWith(".test.js"))
  .sort();

console.log("\nTrivense UI QA — 3× stability run per module\n" + "═".repeat(52));
console.log(`Modules: ${modules.length} · Runs each: ${REPEAT}\n`);

const results = [];
let totalFail = 0;

for (const mod of modules) {
  const name = mod.replace(".module.test.js", "").replace(".test.js", "");
  let passed = 0;
  let lastError = null;

  for (let run = 1; run <= REPEAT; run++) {
    try {
      execSync(`npx jest "tests/ui/${mod}" --runInBand --forceExit`, {
        cwd: path.join(__dirname, ".."),
        stdio: "pipe",
        env: { ...process.env, CI: "true" },
      });
      passed += 1;
      process.stdout.write(`  ✓ ${name} run ${run}/${REPEAT}\n`);
    } catch (err) {
      totalFail += 1;
      lastError = err.stderr?.toString() || err.stdout?.toString() || String(err);
      process.stdout.write(`  ✗ ${name} run ${run}/${REPEAT} FAILED\n`);
    }
  }

  const ok = passed === REPEAT;
  results.push({ name, passed, total: REPEAT, ok });
  console.log(
    ok
      ? `→ ${name}: ${passed}/${REPEAT} passed\n`
      : `→ ${name}: ${passed}/${REPEAT} passed (UNSTABLE)\n`
  );
  if (!ok && lastError) {
    const tail = lastError.split("\n").slice(-15).join("\n");
    console.log(tail + "\n");
  }
}

console.log("─".repeat(52));
const stable = results.filter((r) => r.ok).length;
console.log(`Summary: ${stable}/${modules.length} modules stable (3/3 passes)`);

if (totalFail > 0) {
  console.log(`Total failed runs: ${totalFail}\n`);
  process.exit(1);
}

console.log("All UI QA modules passed 3/3 runs.\n");
