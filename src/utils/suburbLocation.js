/**
 * Normalize suburb list items (from useAustralianSuburbs / australianSuburbs.json or static list)
 * to the shape we store in Firestore: { suburb, state, region, lat, lng }.
 * JSON has name, lat, lng, state (optional), salCode; static list has name, lat, lng only.
 */
export function normalizeSuburbItem(item) {
  if (!item || typeof item !== "object") return null;
  const raw = item.name ?? item.suburb ?? "";
  const lat = item.lat ?? item.latitude;
  const lng = item.lng ?? item.longitude;
  if (!raw || lat == null || lng == null) return null;
  const name = raw.replace(/\s*\(.*\)$/, "").trim();
  const state = item.state ?? "";
  return {
    suburb: name,
    fullLocation: raw,
    state,
    region: state,
    lat: Number(lat),
    lng: Number(lng),
  };
}

/**
 * Build a list of normalized locations from raw suburb array (e.g. from useAustralianSuburbs).
 */
export function normalizeSuburbList(rawList) {
  if (!Array.isArray(rawList)) return [];
  const seen = new Set();
  return rawList
    .map(normalizeSuburbItem)
    .filter(Boolean)
    .filter((loc) => {
      const key = `${loc.suburb}|${loc.lat}|${loc.lng}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
