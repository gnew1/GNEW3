/* eslint-env node */
export function createLogger(service = 'app') {
  const base = { service };
  return {
    info(obj = {}, msg = '') {
      console.log(JSON.stringify({ level: 'info', ...base, ...obj, msg }));
    },
    warn(obj = {}, msg = '') {
      console.warn(JSON.stringify({ level: 'warn', ...base, ...obj, msg }));
    },
    error(obj = {}, msg = '') {
      // include stack if present
      const err = obj.err || obj.error;
      const rest = { ...obj };
      delete rest.err; delete rest.error;
      console.error(JSON.stringify({ level: 'error', ...base, ...rest, msg, stack: err?.stack }));
    },
    debug(obj = {}, msg = '') {
      if (process.env.DEBUG) {
        console.debug(JSON.stringify({ level: 'debug', ...base, ...obj, msg }));
      }
    }
  };
}
