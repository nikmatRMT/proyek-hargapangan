// src/constants/units.ts
function normalize(s: string) {
  return (s || "").toLowerCase().replace(/\s+/g, " ").trim();
}

// komoditas yang pakai Liter
export const LITER_COMMODITIES = new Set([
  "minyak goreng kemasan",
  "minyak goreng curah",
]);

export function unitForCommodity(name?: string) {
  const key = normalize(String(name ?? ""));
  return LITER_COMMODITIES.has(key) ? "(Rp/Liter)" : "(Rp/Kg)";
}
