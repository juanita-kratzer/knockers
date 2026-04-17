# Map markers: what we tried + ChatGPT prompt

## Summary of everything we tried

### 1. **Initial problem (mobile)**
- Map on phone flickered between white screen and “Loading map…” and the user couldn’t tap anything.

### 2. **Fix: stop blocking on suburb data + debounce**
- **Change:** Show the map as soon as the Google Maps script is loaded (`isLoaded`), and no longer wait on `loading` from `useEntertainersBySuburb()`. Suburb markers load in the background.
- **Change:** Debounce map `bounds_changed` / `idle` / `zoom_changed` updates (200 ms) to avoid a re-render storm on mobile.
- **Result:** Map loaded but then showed a new bug (see below).

### 3. **Fix: wait for container height (reverted)**
- **Change:** Only mount the map when the map container had non-zero height (ResizeObserver + fallback), to avoid 0-height init on mobile.
- **Result:** Map stayed on “Loading map…” forever (containerReady never became true in their environment). We reverted this and only kept the debounce + not blocking on suburb loading.

### 4. **Fix: too many “0” circles**
- **Change:** When `mapBounds` is null, `filterByBounds` was returning **all** suburbs (design was “no bounds = show everything”). We changed it to return `[]` so we don’t render markers until the map has reported bounds.
- **Change:** Capped markers at 150 (then later 80) so we never render more than that.
- **Result:** Fewer markers, but still “too many” and “blank spots” (see below).

### 5. **Fix: “too many markers” and “blank spots”**
- **Change:** `suburbsForMap` no longer falls back to the full Australian suburbs list (`australianSuburbs`). It only uses `suburbData` from Firestore (suburbs that have at least one entertainer). If there are no entertainers, we use `[]`.
- **Change:** Clustering threshold raised from 11 to 13 so at zoom 12 we show grid clusters (e.g. “Sydney +5 more”) instead of one circle per suburb.
- **Change:** Marker cap reduced from 150 to 80.
- **Result:** No circles on the map at all.

### Current state
- **Web:** Map loads; behaviour may vary.
- **Mobile:** Map loads without the original flicker.
- **Markers:** No suburb circles appear. Possible reasons:
  - `suburbData` is empty (no entertainers in Firestore, or query not returning them).
  - `mapBounds` is null or not updating (bounds never set from the map, or debounce/cleanup issue).
  - Data shape: `suburbData` items might use `location.lat`/`lng` while `filterByBounds` / clustering expect `lat`/`lng` at top level (we do map `e.location` to `lat`/`lng` in the hook, but worth double-checking).
  - Combination of “only show suburbs with entertainers” + “no bounds = no markers” means if bounds are slow to arrive or data is empty, the user sees no circles.

### Files touched
- `src/pages/shared/Home.jsx` – map component, loading condition, suburbsForMap, clustering threshold, marker cap, debounce.
- `src/utils/geoUtils.js` – `filterByBounds` returns `[]` when bounds are null; `clusterSuburbsByZoom` (unchanged logic, different threshold passed from Home).

---

## Prompt to paste into ChatGPT

Copy everything below the line into ChatGPT (and add any extra detail you have, e.g. “we have entertainers in Firestore” or “bounds do update in our logs”).

---

**Context:** We have a React web + mobile (Capacitor) app. The home screen is a Google Map (using `@react-google-maps/api`) showing “suburb” markers: each marker is a circle with the number of entertainers in that suburb. Data comes from Firestore: we have a hook `useEntertainersBySuburb()` that returns `suburbData` (array of `{ name, count, lat, lng }`) and a fallback list of all Australian suburbs (name + lat/lng, no count). We also have `filterByBounds(suburbs, mapBounds)` and `clusterSuburbsByZoom(...)` to filter by viewport and cluster at low zoom.

**What we changed (chronologically):**
1. We stopped blocking the map on “suburb data loading” so the map shows as soon as the Google script loads; we debounce bounds/zoom updates (200 ms) to fix mobile flicker.
2. We made `filterByBounds` return an empty array when `mapBounds` is null (instead of returning all suburbs) so we don’t render thousands of markers before the map has reported bounds.
3. We capped the number of markers (e.g. 80) and we only use suburbs that have entertainers for markers (no fallback to the full Australian list), and we increased the zoom threshold so at zoom 12 we cluster into fewer circles.

**Current problem:** No circles appear on the map at all. The map itself loads (tiles, user location pin if allowed). We need circles to show when there is suburb data and when the map has valid bounds, without bringing back (a) mobile flicker, (b) thousands of “0” markers, or (c) “too many” overlapping circles.

**What we need:** A clear, robust approach that:
- Shows suburb markers when we have data and when the map has reported bounds.
- Handles “no entertainers” (empty data) without showing a sea of zeros.
- Handles “many suburbs in view” with clustering and a reasonable cap so the map isn’t covered.
- Doesn’t depend on container-height checks that can prevent the map from ever showing (we had that and reverted it).
- Optionally: how to debug “no circles” (e.g. log when bounds are set, when suburbData has length, and when the marker list is non-empty after filtering/clustering).

Please suggest a concrete data flow and any code changes (in plain language or pseudocode), and what to log to verify each step. Our stack: React, Google Maps via `@react-google-maps/api`, Firestore for suburb/entertainer data.

---
