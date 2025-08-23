
import { cfg } from "./config.js";
import { health } from "./s3.js";

let active: "primary" | "secondary" = cfg.activeRegion;
let lastHealth = { primary: false, secondary: false };
let primaryFailures = 0;

export function getActive() { return active; }
export function setActive(r: "primary"|"secondary") { active = r; }
export function getHealth() { return { ...lastHealth }; }

export async function tickHealth(autoFailover: boolean) {
  const hp = await health("primary");
  const hs = await health("secondary");
  lastHealth = { primary: hp, secondary: hs };
  if (!autoFailover) return;

  if (!hp) primaryFailures++; else primaryFailures = 0;
  if (active === "primary" && primaryFailures >= 3 && hs) {
    active = "secondary";
  }
}


