
import { sigmoid } from "./utils.js";
import { Features } from "./features.js";

/** Modelo logístico sencillo con coeficientes entrenados (mock) */
export const modelInfo = {
  id: "logreg_v1",
  bias: -3.0,
  weights: <Record<keyof Features, number>>{
    f_amount_log: 0.30,
    f_email_free: 0.45,
    f_email_domain_len: -0.02,
    f_country_mismatch: 0.55,
    f_geo_km: 0.001,
    f_ip_velocity_1h: 0.04,
    f_device_velocity_1h: 0.02,
    f_user_chargebacks_90d: 0.60,
    f_bin_risk: 0.80,
    f_hour_local: 0.01,
    f_is_night: 0.25
  }
};

export function score(features: Features) {
  let z = modelInfo.bias;
  const contribs: Array<{ feature: keyof Features; weight: number; value: number; contrib: number }> = [];
  for (const k of Object.keys(modelInfo.weights) as (keyof Features)[]) {
    const w = modelInfo.weights[k];
    const v = (features as any)[k] ?? 0;
    const c = w * v;
    contribs.push({ feature: k, weight: w, value: v, contrib: c });
    z += c;
  }
  const p = sigmoid(z);
  contribs.sort((a,b)=>Math.abs(b.contrib) - Math.abs(a.contrib));
  return { p, z, contribs };
}


