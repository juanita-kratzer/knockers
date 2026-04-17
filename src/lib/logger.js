/**
 * Dev-only logger. No console output in production (App Store / build).
 */
const isDev = typeof import.meta !== "undefined" && import.meta.env?.DEV === true;

function noop() {}

export const logger = {
  log: isDev ? (...args) => console.log(...args) : noop,
  warn: isDev ? (...args) => console.warn(...args) : noop,
  error: isDev ? (...args) => console.error(...args) : noop,
  info: isDev ? (...args) => console.info(...args) : noop,
  debug: isDev ? (...args) => console.debug(...args) : noop,
};
