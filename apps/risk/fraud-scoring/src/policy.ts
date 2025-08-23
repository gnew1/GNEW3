
import { db } from "./db.js";

export type Decision = "allow" | "review" | "block";

export function getPolicy() {
  const r = db.prepare("SELECT * FROM policy WHERE id=1").get() as any;
  return r;
}

export function updatePolicy(p: Partial<ReturnType<typeof getPolicy>>) {
  const cur = getPolicy();
  const next = { ...cur, ...p };
  db.prepare(`UPDATE policy SET
    allowThreshold=?, reviewThreshold=?, hardBlockGeoDistanceKm=?, hardBlockVelocityIp=?, hardBlockVelocityDevice=?
    WHERE id=1
  `).run(next.allowThreshold, next.reviewThreshold, next.hardBlockGeoDistanceKm, next.hardBlockVelocityIp, next.hardBlockVelocityDevice);
  return getPolicy();
}

export function decide(p: number, hard: { geoKm: number; ipVel: number; deviceVel: number }, reasons: string[]) {
  const pol = getPolicy();
  if (hard.geoKm >= pol.hardBlockGeoDistanceKm) {
    reasons.push(`hard:geo_km>=${pol.hardBlockGeoDistanceKm}`);
    return <Decision>"block";
  }
  if (hard.ipVel >= pol.hardBlockVelocityIp) {
    reasons.push(`hard:ip_velocity>=${pol.hardBlockVelocityIp}`);
    return <Decision>"block";
  }
  if (hard.deviceVel >= pol.hardBlockVelocityDevice) {
    reasons.push(`hard:device_velocity>=${pol.hardBlockVelocityDevice}`);
    return <Decision>"block";
  }
  if (p >= pol.reviewThreshold) return <Decision>"block";
  if (p >= pol.allowThreshold) return <Decision>"review";
  return <Decision>"allow";
}


