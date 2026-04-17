/**
 * Load full Australian suburbs list from public/australianSuburbs.json (generated from ABS SAL shapefile).
 * Falls back to the static list in australianSuburbs.js if the JSON is missing or fetch fails.
 */
import { useState, useEffect } from "react";
import { australianSuburbs as fallbackSuburbs } from "../data/australianSuburbs";

export function useAustralianSuburbs() {
  const [suburbs, setSuburbs] = useState(fallbackSuburbs);

  useEffect(() => {
    let cancelled = false;
    fetch("/australianSuburbs.json")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Not found"))))
      .then((data) => {
        if (!cancelled && Array.isArray(data) && data.length > 0) {
          setSuburbs(data);
        }
      })
      .catch(() => {
        if (!cancelled) setSuburbs(fallbackSuburbs);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return suburbs;
}
