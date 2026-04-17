/**
 * Build public/australianSuburbs.json from ABS Suburbs and Localities (SAL) shapefile.
 *
 * Usage:
 *   node scripts/buildSuburbsFromShapefile.cjs [path-to-.shp]
 *
 * Example (SAL 2021 in Downloads):
 *   node scripts/buildSuburbsFromShapefile.cjs "$HOME/Downloads/SAL_2021_AUST_GDA2020_SHP/SAL_2021_AUST_GDA2020.shp"
 *
 * Or set SAL_SHP env var:
 *   SAL_SHP=/path/to/SAL_2021_AUST_GDA2020.shp node scripts/buildSuburbsFromShapefile.cjs
 *
 * Output: public/australianSuburbs.json (array of { name, lat, lng, count: 0 })
 */

const shapefile = require("shapefile");
const fs = require("fs");
const path = require("path");

const shpPath =
  process.env.SAL_SHP ||
  process.argv[2] ||
  path.join(
    process.env.HOME || process.env.USERPROFILE,
    "Downloads",
    "SAL_2021_AUST_GDA2020_SHP",
    "SAL_2021_AUST_GDA2020.shp"
  );

function centroidFromGeoJSON(geometry) {
  if (!geometry || !geometry.coordinates) return null;
  const c = geometry.coordinates;

  if (geometry.type === "Point") return { lng: c[0], lat: c[1] };

  let ring;
  if (geometry.type === "Polygon") ring = c[0];
  else if (geometry.type === "MultiPolygon") ring = c[0]?.[0];
  else return null;

  if (!ring || ring.length < 3) return null;
  let sumLng = 0,
    sumLat = 0,
    n = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    sumLng += ring[i][0];
    sumLat += ring[i][1];
    n++;
  }
  if (n === 0) return null;
  return { lng: sumLng / n, lat: sumLat / n };
}

function getName(props) {
  if (!props) return "Unknown";
  return (
    props.SAL_NAME21 ??
    props.SAL_NAM21 ??
    props.SAL_NAME ??
    props.name ??
    props.NAME ??
    "Unknown"
  );
}

function getState(props) {
  if (!props) return "";
  return (
    props.STE_NAME21 ??
    props.STE_NAM21 ??
    props.STE_NAME ??
    props.state ??
    ""
  );
}

function getCode(props) {
  if (!props) return "";
  return String(
    props.SAL_CODE21 ??
    props.SAL_CODE ??
    props.code ??
    ""
  ).trim();
}

/** Simplify ring to at most maxPoints by taking every Nth point. */
function simplifyRing(ring, maxPoints = 120) {
  if (!ring || ring.length <= maxPoints) return ring;
  const step = Math.max(1, Math.floor(ring.length / maxPoints));
  const out = [];
  for (let i = 0; i < ring.length - 1; i += step) out.push(ring[i]);
  out.push(ring[ring.length - 1]);
  return out;
}

function ringsFromGeometry(geometry) {
  if (!geometry || !geometry.coordinates) return null;
  const c = geometry.coordinates;
  if (geometry.type === "Polygon" && c[0] && c[0].length >= 3) {
    return [simplifyRing(c[0])];
  }
  if (geometry.type === "MultiPolygon" && c[0]) {
    return c.slice(0, 3).map((poly) => (poly[0] && poly[0].length >= 3 ? simplifyRing(poly[0]) : null)).filter(Boolean);
  }
  return null;
}

async function main() {
  const publicDir = path.join(__dirname, "..", "public");
  const outPath = path.join(publicDir, "australianSuburbs.json");
  const boundariesPath = path.join(publicDir, "suburbBoundaries.json");

  if (!fs.existsSync(shpPath)) {
    console.error("Shapefile not found:", shpPath);
    console.error("Usage: node scripts/buildSuburbsFromShapefile.cjs [path-to-SAL.shp]");
    process.exit(1);
  }

  console.log("Reading:", shpPath);
  const suburbs = [];
  const boundaries = {};

  try {
    const source = await shapefile.open(shpPath);
    let result = await source.read();
    while (!result.done) {
      const f = result.value;
      const name = getName(f.properties);
      const cent = centroidFromGeoJSON(f.geometry);
      const state = getState(f.properties);
      const code = getCode(f.properties);
      if (cent && name && name !== "Unknown") {
        const stateStr = state ? String(state).trim() : "";
        const salCode = code || `sal-${name.replace(/\s+/g, "-")}-${stateStr || suburbs.length}`;
        suburbs.push({
          name: String(name).trim(),
          lat: cent.lat,
          lng: cent.lng,
          count: 0,
          salCode,
          ...(state ? { state: String(state).trim() } : {}),
        });
        const rings = ringsFromGeometry(f.geometry);
        if (rings && rings.length > 0) boundaries[salCode] = rings;
      }
      result = await source.read();
    }
  } catch (err) {
    console.error("Error reading shapefile:", err.message);
    process.exit(1);
  }

  fs.mkdirSync(publicDir, { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(suburbs, null, 0), "utf8");
  fs.writeFileSync(boundariesPath, JSON.stringify(boundaries, null, 0), "utf8");
  console.log("Wrote", suburbs.length, "suburbs to", outPath);
  console.log("Wrote", Object.keys(boundaries).length, "boundaries to", boundariesPath);
}

main();
