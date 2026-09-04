/**
 * Load TurboModule-backed packages only after the native runtime is ready.
 * Top-level imports of these modules cause "Runtime not ready" / TurboModuleRegistry errors.
 */
export async function loadNativeModule(importFn, label) {
  try {
    return await importFn();
  } catch (error) {
    if (__DEV__) {
      console.warn(`[native] ${label} unavailable:`, error?.message || error);
    }
    return null;
  }
}
