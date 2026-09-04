/**
 * Dev-only logger. In production (release build) __DEV__ is false and these no-op.
 * Use for debug logs; for real errors consider keeping or using an error reporting service.
 */
const noop = () => {};
export const devLog = __DEV__ ? (...args) => console.log(...args) : noop;
export const devWarn = __DEV__ ? (...args) => console.warn(...args) : noop;
export const devError = __DEV__ ? (...args) => console.error(...args) : noop;
