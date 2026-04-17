/**
 * Geo utilities for suburb data: bounds filtering and GeoJSON centroid extraction.
 */

/**
 * Filter an array of suburb items (with lat/lng or position) to those inside the given map bounds.
 * @param {Array<{ lat?: number, lng?: number, position?: { lat: number, lng: number } }>} suburbs
 * @param {{ ne: { lat: number, lng: number }, sw: { lat: number, lng: number } } | null} bounds - Google Maps LatLngBounds or { ne, sw }
 * @param {number} paddingDeg - Optional padding in degrees so suburbs near the edge are included
 * @returns {Array} Filtered suburbs
 */
export function filterByBounds(suburbs, bounds, paddingDeg = 0.05) {
  if (!suburbs || suburbs.length === 0) return [];
  if (!bounds || !bounds.ne || !bounds.sw) return [];

  const n = bounds.ne.lat + paddingDeg;
  const s = bounds.sw.lat - paddingDeg;
  const e = bounds.ne.lng + paddingDeg;
  const w = bounds.sw.lng - paddingDeg;

  return suburbs.filter((suburb) => {
    const lat = suburb.lat ?? suburb.position?.lat;
    const lng = suburb.lng ?? suburb.position?.lng;
    if (lat == null || lng == null) return false;
    return lat >= s && lat <= n && lng >= w && lng <= e;
  });
}

/**
 * Safe filter for map markers: when bounds are not yet available (e.g. mobile), return a small
 * fallback slice so markers can show instead of deadlocking on [] forever.
 * @param {Array} suburbs - Full suburb list (with lat/lng or position)
 * @param {{ ne, sw } | null} bounds - Current map bounds or null
 * @param {number} paddingDeg - Padding for bounds filter
 * @param {number} maxWhenNoBounds - When bounds is null, return suburbs.slice(0, this) to avoid empty state
 * @returns {Array} Filtered suburbs (or fallback slice when no bounds)
 */
export function getVisibleSuburbsForMap(suburbs, bounds, paddingDeg = 0.1, maxWhenNoBounds = 40) {
  if (!suburbs || suburbs.length === 0) return [];
  if (!bounds || !bounds.ne || !bounds.sw) return suburbs.slice(0, maxWhenNoBounds);
  return filterByBounds(suburbs, bounds, paddingDeg);
}

/**
 * Parse a GeoJSON FeatureCollection of polygons into an array of { name, lat, lng } using polygon centroids.
 * Expects features with properties.SAL_NAME21 or properties.name (or similar) for the name.
 * @param {import('geojson').FeatureCollection} geojson
 * @param {{ nameProperty?: string }} options - nameProperty: key in properties for suburb name (default: SAL_NAME21 or name)
 * @returns {Array<{ name: string, lat: number, lng: number }>}
 */
export function parseGeoJSONToCentroids(geojson, options = {}) {
  const nameKey = options.nameProperty || "SAL_NAME21";
  const fallbackNameKey = "name";
  const out = [];

  if (!geojson || !geojson.features || !Array.isArray(geojson.features)) return out;

  for (const feature of geojson.features) {
    const name =
      feature.properties?.[nameKey] ||
      feature.properties?.[fallbackNameKey] ||
      feature.id ||
      "Unknown";
    const coords = centroidOfGeometry(feature.geometry);
    if (coords) out.push({ name: String(name), lat: coords.lat, lng: coords.lng });
  }

  return out;
}

/**
 * Compute centroid of a GeoJSON geometry (Polygon or MultiPolygon).
 * @param {import('geojson').Geometry} geometry
 * @returns {{ lat: number, lng: number } | null}
 */
function centroidOfGeometry(geometry) {
  if (!geometry) return null;
  if (geometry.type === "Point") {
    const c = geometry.coordinates;
    return { lng: c[0], lat: c[1] };
  }
  if (geometry.type === "Polygon") {
    return centroidFromRing(geometry.coordinates[0]);
  }
  if (geometry.type === "MultiPolygon") {
    const first = geometry.coordinates[0];
    if (first && first[0]) return centroidFromRing(first[0]);
  }
  return null;
}

function centroidFromRing(ring) {
  if (!ring || ring.length < 3) return null;
  let sumLng = 0;
  let sumLat = 0;
  let n = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    sumLng += ring[i][0];
    sumLat += ring[i][1];
    n += 1;
  }
  if (n === 0) return null;
  return { lng: sumLng / n, lat: sumLat / n };
}

/**
 * Approximate state/territory for a point in Australia (for clustering when data has no state field).
 * Order matters: check smaller/overlapping regions first (ACT, TAS, then larger states).
 */
export function getStateFromLatLng(lat, lng) {
  if (lat == null || lng == null) return "Other";
  // ACT (small)
  if (lat >= -35.92 && lat <= -35.1 && lng >= 148.7 && lng <= 149.5) return "Australian Capital Territory";
  // Tasmania
  if (lat >= -43.7 && lat <= -40.2 && lng >= 144.5 && lng <= 148.5) return "Tasmania";
  // Victoria
  if (lat >= -39.2 && lat <= -33.9 && lng >= 140.9 && lng <= 150.2) return "Victoria";
  // NSW (excluding ACT)
  if (lat >= -37.6 && lat <= -28.1 && lng >= 140.9 && lng <= 153.6) return "New South Wales";
  // Queensland
  if (lat >= -29.2 && lat <= -10.1 && lng >= 137.9 && lng <= 153.6) return "Queensland";
  // South Australia
  if (lat >= -38.2 && lat <= -25.9 && lng >= 128.9 && lng <= 141.0) return "South Australia";
  // Northern Territory
  if (lat >= -26.0 && lat <= -10.9 && lng >= 128.9 && lng <= 138.1) return "Northern Territory";
  // Western Australia
  if (lng >= 112.9 && lng <= 129.0 && lat >= -35.2 && lat <= -13.6) return "Western Australia";
  return "Other";
}

/** Fixed map positions per state so state circles don’t jump when panning (use instead of centroid of visible suburbs). */
const STATE_CENTER = {
  "New South Wales": { lat: -32.0, lng: 146.0 },
  Victoria: { lat: -37.0, lng: 144.0 },
  Queensland: { lat: -20.0, lng: 145.5 },
  "South Australia": { lat: -31.0, lng: 136.0 },
  "Western Australia": { lat: -25.0, lng: 122.0 },
  Tasmania: { lat: -42.0, lng: 146.5 },
  "Northern Territory": { lat: -18.5, lng: 133.5 },
  "Australian Capital Territory": { lat: -35.3, lng: 149.1 },
  Other: { lat: -25.0, lng: 135.0 },
};

/**
 * Cluster suburbs: when zoomed right out (all Australia), cluster by state; at medium zoom by grid; when zoomed in, show individuals.
 * @param {Array<{ name: string, lat: number, lng: number, count?: number, state?: string }>} suburbs - Visible suburbs (for counts and which clusters to show).
 * @param {number | null} zoom - Current map zoom (e.g. 3–18).
 * @param {number} zoomThreshold - Show individual suburbs when zoom >= this (e.g. 11).
 * @param {number} stateZoomThreshold - Cluster by state when zoom <= this (e.g. 6 = whole Australia view).
 * @param {Array<{ name: string, lat: number, lng: number }>} [fullSuburbs] - Optional full list; when provided, grid cluster positions use centroid of all suburbs in each cell (stable, natural look).
 * @returns {Array<{ name: string, lat: number, lng: number, count: number, position: { lat, lng }, isCluster?: boolean }>}
 */
export function clusterSuburbsByZoom(suburbs, zoom, zoomThreshold = 11, stateZoomThreshold = 6, fullSuburbs = null) {
  if (!suburbs || suburbs.length === 0) return [];

  const withPosition = suburbs
    .map((s) => ({
      ...s,
      lat: s.lat ?? s.position?.lat ?? 0,
      lng: s.lng ?? s.position?.lng ?? 0,
      count: s.count ?? 0,
      state: s.state ?? getStateFromLatLng(s.lat ?? s.position?.lat, s.lng ?? s.position?.lng),
    }))
    .filter((s) => s.lat !== 0 || s.lng !== 0);

  if (withPosition.length === 0) return [];

  // Zoomed in: show individual suburbs
  if (zoom != null && zoom >= zoomThreshold) {
    return withPosition.map((s) => ({
      ...s,
      position: { lat: s.lat, lng: s.lng },
    }));
  }

  // Very zoomed out (e.g. all of Australia): one circle per state/territory at a fixed position (no jumping when panning)
  if (zoom != null && zoom <= stateZoomThreshold) {
    const byState = new Map();
    for (const s of withPosition) {
      const key = s.state || "Other";
      if (!byState.has(key)) {
        byState.set(key, { totalCount: 0 });
      }
      const g = byState.get(key);
      g.totalCount += s.count;
    }
    return Array.from(byState.entries()).map(([stateName, g]) => {
      const pos = STATE_CENTER[stateName] || STATE_CENTER.Other;
      return {
        name: stateName,
        lat: pos.lat,
        lng: pos.lng,
        count: g.totalCount,
        position: { lat: pos.lat, lng: pos.lng },
        isCluster: true,
      };
    });
  }

  // Medium zoom: group by grid; use fixed cell centers so clusters don’t jump when panning
  const zoomLevel = zoom != null ? Math.max(1, Math.min(18, zoom)) : 8;
  const cellSizeDeg = 1 / Math.pow(2, (zoomLevel - 6) * 0.7);
  const groups = new Map();

  const toPoint = (s) => ({ lat: s.lat ?? s.position?.lat ?? 0, lng: s.lng ?? s.position?.lng ?? 0 });
  const fullPoints = fullSuburbs && fullSuburbs.length > 0
    ? fullSuburbs.map((s) => ({ ...toPoint(s), key: `${Math.floor((s.lat ?? 0) / cellSizeDeg)},${Math.floor((s.lng ?? 0) / cellSizeDeg)}` }))
    : [];

  const cellCentroids = new Map();
  for (const p of fullPoints) {
    if (p.lat === 0 && p.lng === 0) continue;
    const key = p.key;
    if (!cellCentroids.has(key)) cellCentroids.set(key, { sumLat: 0, sumLng: 0, n: 0 });
    const c = cellCentroids.get(key);
    c.sumLat += p.lat;
    c.sumLng += p.lng;
    c.n += 1;
  }
  for (const [key, c] of cellCentroids) {
    if (c.n > 0) {
      cellCentroids.set(key, { lat: c.sumLat / c.n, lng: c.sumLng / c.n });
    }
  }

  for (const s of withPosition) {
    const i = Math.floor(s.lat / cellSizeDeg);
    const j = Math.floor(s.lng / cellSizeDeg);
    const key = `${i},${j}`;
    if (!groups.has(key)) {
      const centroid = cellCentroids.get(key);
      const fallback = { lat: (i + 0.5) * cellSizeDeg, lng: (j + 0.5) * cellSizeDeg };
      groups.set(key, {
        totalCount: 0,
        n: 0,
        names: [],
        cellCenter: centroid ? { lat: centroid.lat, lng: centroid.lng } : fallback,
      });
    }
    const g = groups.get(key);
    g.totalCount += s.count;
    g.n += 1;
    if (g.names.length < 3) g.names.push(s.name);
  }

  return Array.from(groups.entries()).map(([key, g]) => {
    const { lat, lng } = g.cellCenter;
    const name = g.names[0] || "Area";
    const displayName = g.n > 1 ? `${name} +${g.n - 1} more` : name;
    return {
      name: displayName,
      lat,
      lng,
      count: g.totalCount,
      position: { lat, lng },
      isCluster: true,
    };
  });
}
