import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = { vus: 5, duration: '10s' };

const BASE = __ENV.BASE_URL || 'http://localhost:8000';

export default function () {
  const r = http.get(`${BASE}/healthz`);
  check(r, { '200 ok': (res) => res.status === 200 });
  sleep(1);
}

