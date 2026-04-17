/**
 * Suburb name → Australian postcode lookup for map grouping.
 * One postcode can cover multiple suburbs (e.g. 4217 = Surfers Paradise, Main Beach, Bundall, Benowa).
 * Keys are normalized: lowercase, trimmed. Add more entries as needed.
 * Sources: Australia Post postcode lists, local knowledge.
 */
const SUBURB_TO_POSTCODE = {
  // 4217 – Gold Coast (Surfers Paradise, Main Beach, Bundall, Benowa, etc.)
  "surfers paradise": "4217",
  "main beach": "4217",
  "bundall": "4217",
  "benowa": "4217",
  "broadbeach": "4218",
  "broadbeach waters": "4218",
  "mermaid beach": "4218",
  "robina": "4226",
  "burleigh heads": "4220",
  "burleigh waters": "4220",
  "southport": "4215",
  "coolangatta": "4225",
  "tugun": "4224",
  "bilinga": "4225",
  "kirra": "4225",
  // 5092 – Adelaide (Modbury, Modbury North, Modbury Heights)
  "modbury": "5092",
  "modbury north": "5092",
  "modbury heights": "5092",
  "tea tree gully": "5091",
  "st agnes": "5097",
  "hope valley": "5090",
  "golden grove": "5125",
  "surrey downs": "5126",
  "paradise": "5075",
  "arundel": "4214",
  "ashmore": "4214",
  "carrara": "4211",
  "nerang": "4211",
  "coomera": "4209",
  "helensvale": "4212",
  "oxenford": "4210",
  "runaway bay": "4216",
  "biggera waters": "4216",
  "coombabah": "4216",
  // Sydney area samples
  "bondi": "2026",
  "bondi junction": "2022",
  "coogee": "2034",
  "randwick": "2031",
  "maroubra": "2035",
  "manly": "2095",
  "dee why": "2099",
  "chatswood": "2067",
  "north sydney": "2060",
  "parramatta": "2150",
  "hurstville": "2220",
  "burwood": "2134",
  "strathfield": "2135",
  "auburn": "2144",
  "lidcombe": "2141",
  // Melbourne area samples
  "melbourne cbd": "3000",
  "south yarra": "3141",
  "fitzroy": "3065",
  "carlton": "3053",
  "st kilda": "3182",
  "richmond": "3121",
  "prahran": "3181",
  "brunswick": "3056",
  "footscray": "3011",
  "box hill": "3128",
  "ringwood": "3134",
  "doncaster": "3108",
  "hawthorn": "3122",
  // Brisbane
  "brisbane cbd": "4000",
  "fortitude valley": "4006",
  "south brisbane": "4101",
  "west end": "4101",
  "new farm": "4005",
  "paddington": "4064",
  "toowong": "4066",
  "indooroopilly": "4068",
  "sunnybank": "4109",
  "chermside": "4032",
  "redcliffe": "4020",
  "ipswich": "4305",
  // Perth
  "perth cbd": "6000",
  "northbridge": "6003",
  "subiaco": "6008",
  "fremantle": "6160",
  "scarborough": "6019",
  "joondalup": "6027",
};

/**
 * Normalize suburb name for lookup: lowercase, trim, collapse multiple spaces.
 * @param {string} suburb
 * @returns {string}
 */
export function normalizeSuburb(suburb) {
  if (!suburb || typeof suburb !== "string") return "";
  return suburb.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Get postcode for a suburb name (e.g. "Surfers Paradise" → "4217").
 * Returns null if not in lookup; caller can fall back to using suburb name as key.
 * @param {string} suburbName
 * @returns {string | null}
 */
export function getPostcodeForSuburb(suburbName) {
  const key = normalizeSuburb(suburbName);
  return key ? SUBURB_TO_POSTCODE[key] ?? null : null;
}

export { SUBURB_TO_POSTCODE };
