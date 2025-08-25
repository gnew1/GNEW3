/* eslint-env node */
import { connect, StringCodec } from 'nats';

export async function connectNats(opts = {}) {
  const servers = opts.servers || process.env.NATS_URL || 'nats://localhost:4222';
  const nc = await connect({ servers });
  return nc;
}

export async function publishWithTrace(js, subject, data) {
  // Optionally add trace headers if OTEL in place; no-op here
  const sc = StringCodec();
  return js.publish(subject, data instanceof Uint8Array ? data : sc.encode(String(data)));
}
