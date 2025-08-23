import http from 'k6/http';
import { check, sleep } from 'k6';
import { randomSeed, randomItem } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

export const options = {
  thresholds: {
    http_req_failed: ['rate<0.05'], // <5% fallos
    http_req_duration: ['p(95)<800'],
  },
};

const BASE = __ENV.BASE_URL || 'http://localhost:8000';
const paths = ['/healthz', '/metrics', '/unknown', '/evaluate', '/feedback'];

randomSeed(63);

export default function () {
  const path = randomItem(paths);
  // payloads válidos / inválidos para provocar validaciones, timeouts cortos
  const payload = Math.random() < 0.5 ? JSON.stringify({}) : '{"incomplete":';
  const params = { headers: { 'Content-Type': 'application/json' }, timeout: '2s' };
  const url = path === '/evaluate' ? `${BASE}${path}` : `${BASE}${path}`;

  const res = path === '/evaluate'
    ? http.post(url, payload, params)
    : http.get(url, params);

  check(res, {
    'status acceptable': (r) => [200, 400, 401, 404].includes(r.status),
  });

  sleep(Math.random() * 0.2);
}

