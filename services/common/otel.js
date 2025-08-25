/* eslint-env node */
export function startOtel(serviceName = 'app') {
  if (process.env.OTEL_SDK_DISABLED === 'true') return;
  // Placeholder: integrate OpenTelemetry SDK here if needed.
  if (process.env.DEBUG) {
    console.log(JSON.stringify({ level: 'info', service: serviceName, msg: 'otel init (noop)' }));
  }
}
