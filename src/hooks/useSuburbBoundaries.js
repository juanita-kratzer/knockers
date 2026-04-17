/**
 * Load suburb boundary polygons from public/suburbBoundaries.json (generated from SAL shapefile).
 * Format: { [salCode]: [ ring1, ring2, ... ] } where each ring is [ [lng, lat], ... ].
 */
import { useState, useEffect } from "react";

export function useSuburbBoundaries() {
  const [boundaries, setBoundaries] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/suburbBoundaries.json")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Not found"))))
      .then((data) => {
        if (!cancelled && data && typeof data === "object") setBoundaries(data);
      })
      .catch(() => {
        if (!cancelled) setBoundaries({});
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return boundaries;
}

/**
 * Convert a ring from GeoJSON [lng, lat][] to Google Maps path { lat, lng }[].
 */
export function ringToPath(ring) {
  if (!ring || !Array.isArray(ring)) return [];
  return ring.map(([lng, lat]) => ({ lat, lng }));
}
