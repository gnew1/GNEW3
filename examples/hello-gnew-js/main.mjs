
import { Gnew } from '../../packages/sdk/dist/index.js';
const api = new Gnew({ baseUrl: process.env.GNEW_API ?? 'https://sandbox.api.gnew.local' });
const h = await api.health();
console.log('health:', h.status);
const e = await api.echo('pong');
console.log('echo:', e.echo);


