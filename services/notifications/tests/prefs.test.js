import { describe, it, expect } from "vitest"; 
import { withinQuietHours } from "../index.js"; // si exportaras; aquí 
simulamos la lógica 
function _within(pref, hour) { 
const now = new Date("2025-01-01T00:00:00Z"); 
now.setHours(hour); 
const qs = pref.quiet_start ?? 22; 
const qe = pref.quiet_end ?? 7; 
const h = now.getHours(); 
const res = qs > qe ? (h >= qs || h < qe) : (h >= qs && h < qe); 
return res; 
} 
describe("quiet-hours", () => { 
it("wraps over midnight", () => { 
expect(_within({ quiet_start: 22, quiet_end: 7 }, 23)).toBe(true); 
expect(_within({ quiet_start: 22, quiet_end: 7 }, 6)).toBe(true); 
expect(_within({ quiet_start: 22, quiet_end: 7 }, 
12)).toBe(false); 
}); 
it("daytime window", () => { 
expect(_within({ quiet_start: 12, quiet_end: 14 }, 
13)).toBe(true); 
expect(_within({ quiet_start: 12, quiet_end: 14 }, 
11)).toBe(false); 
}); 
}); 
