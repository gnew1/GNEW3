
export function sigmoid(z: number) { return 1 / (1 + Math.exp(-z)); }
export function log1p(x: number) { return Math.log(1 + Math.max(0, x)); }
export function safeNum(x: any, def = 0) { const n = Number(x); return Number.isFinite(n) ? n : def; }
export function toMinor(amount: number, decimals = 2) { const m = 10 ** decimals; return Math.round(amount * m); }
export function kmBetween(lat1:number, lon1:number, lat2:number, lon2:number) {
  const toRad = (d:number)=>d*Math.PI/180;
  const R = 6371; // km
  const dLat = toRad(lat2-lat1), dLon = toRad(lon2-lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}


