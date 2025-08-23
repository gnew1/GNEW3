
import { db } from "./db.js";
import { log1p, kmBetween } from "./utils.js";

const FREE_EMAIL = new Set(["gmail.com","yahoo.com","hotmail.com","outlook.com","proton.me","icloud.com","mail.com","yandex.com"]);

export type BaseInput = {
  currency?: string;
  amountMinor?: number;
  userId?: string;
  email?: string;
  ip?: string;
  deviceId?: string;
  cardBin?: string;
  cardCountry?: string;
  billingCountry?: string;
  shippingCountry?: string;
  billingLat?: number; billingLon?: number;
  shippingLat?: number; shippingLon?: number;
};

export type Features = {
  f_amount_log: number;
  f_email_free: number;
  f_email_domain_len: number;
  f_country_mismatch: number;
  f_geo_km: number;
  f_ip_velocity_1h: number;
  f_device_velocity_1h: number;
  f_user_chargebacks_90d: number;
  f_bin_risk: number;
  f_hour_local: number;
  f_is_night: number;
};

export function computeFeatures(input: BaseInput, nowMs = Date.now()): Features {
  const amountMinor = Math.max(0, input.amountMinor ?? 0);
  const emailDomain = (input.email ?? "").split("@")[1]?.toLowerCase() ?? "";
  const emailFree = FREE_EMAIL.has(emailDomain) ? 1 : 0;
  const emailLen = Math.max(0, emailDomain.length);

  const countryMismatch = input.billingCountry && input.cardCountry && input.billingCountry !== input.cardCountry ? 1 : 0;

  let geoKm = 0;
  if (isFiniteNum(input.billingLat) && isFiniteNum(input.billingLon) && isFiniteNum(input.shippingLat) && isFiniteNum(input.shippingLon)) {
    geoKm = kmBetween(input.billingLat!, input.billingLon!, input.shippingLat!, input.shippingLon!);
  }

  const ipVel = getVelocity("ip", input.ip, nowMs, 60*60*1000);
  const deviceVel = getVelocity("device", input.deviceId, nowMs, 60*60*1000);

  const cb90 = getCounter(`user_cb_90d:${input.userId ?? "-"}`) ?? 0;
  const binRisk = getBinRisk(input.cardBin);

  const hour = new Date(nowMs).getUTCHours(); // simplificado UTC
  const isNight = (hour >= 0 && hour <= 6) ? 1 : 0;

  return {
    f_amount_log: log1p(amountMinor / 100),    // € base
    f_email_free: emailFree,
    f_email_domain_len: emailLen,
    f_country_mismatch: countryMismatch,
    f_geo_km: geoKm,
    f_ip_velocity_1h: ipVel,
    f_device_velocity_1h: deviceVel,
    f_user_chargebacks_90d: cb90,
    f_bin_risk: binRisk,
    f_hour_local: hour,
    f_is_night: isNight
  };
}

function isFiniteNum(x: any) { return typeof x === "number" && Number.isFinite(x); }

export function noteAttempt(kind: "ip" | "device", value: string | undefined, nowMs = Date.now()) {
  if (!value) return;
  const key = `vel:${kind}:${value}:${Math.floor(nowMs / (60*60*1000))}`; // bucket por hora
  const row = db.prepare("SELECT value FROM counters WHERE key=?").get(key) as any;
  const v = (row?.value ?? 0) + 1;
  db.prepare(`
    INSERT INTO counters(key,value,updatedAt) VALUES(?,?,?)
    ON CONFLICT(key) DO UPDATE SET value=excluded.value, updatedAt=excluded.updatedAt
  `).run(key, v, nowMs);
}

function getVelocity(kind: "ip" | "device", value: string | undefined, nowMs: number, windowMs: number) {
  if (!value) return 0;
  const startBucket = Math.floor((nowMs - windowMs) / (60*60*1000));
  const endBucket = Math.floor(nowMs / (60*60*1000));
  let sum = 0;
  for (let b = startBucket; b <= endBucket; b++) {
    const key = `vel:${kind}:${value}:${b}`;
    const r = db.prepare("SELECT value FROM counters WHERE key=?").get(key) as any;
    sum += r?.value ?? 0;
  }
  return sum;
}

function getCounter(key: string): number | undefined {
  const r = db.prepare("SELECT value FROM counters WHERE key=?").get(key) as any;
  return r?.value;
}

function getBinRisk(bin?: string): number {
  if (!bin) return 0;
  const r = db.prepare("SELECT note FROM lists WHERE list='deny' AND kind='bin' AND value=?").get(bin) as any;
  if (r) return 1;
  return 0;
}


