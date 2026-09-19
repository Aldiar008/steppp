/**
 * Where each university physically stands.
 *
 * The catalogue knows a city as a string — "Cambridge, MA" — and a string
 * cannot be put on a map. This table is the missing half: one coordinate per
 * programme in `data/catalog.generated.ts`, in degrees, pointing at the main
 * campus rather than at the middle of the city, because the map draws markers
 * and two universities in one city have to sit apart rather than on top of each
 * other.
 *
 * It is written by hand, like `PLACES` was before it, and for the same reason:
 * latitude is not something a university publishes on its admissions page, so
 * it cannot be imported from the raw file with everything else. It is also the
 * only table here that carries no provenance, and that is fine — it decides
 * where a dot is drawn and never what a date says. Nothing downstream may read
 * a coordinate into a deadline, a distance into a ranking, or this file into
 * anything an applicant is asked to act on.
 *
 * `data/world-map.generated.ts` projects these. The keys are programme ids, and
 * `tests/data-integrity.test.ts` fails if a programme ever appears without one.
 */

export interface Campus {
  lat: number;
  lon: number;
}

export const CAMPUSES: Readonly<Record<string, Campus>> = {
  /* --- США ---------------------------------------------------------------- */
  mit: { lat: 42.36, lon: -71.09 },
  harvard: { lat: 42.377, lon: -71.117 },
  stanford: { lat: 37.428, lon: -122.169 },
  caltech: { lat: 34.138, lon: -118.125 },
  princeton: { lat: 40.344, lon: -74.657 },
  cornell: { lat: 42.448, lon: -76.482 },
  jhu: { lat: 39.329, lon: -76.62 },
  berkeley: { lat: 37.872, lon: -122.259 },
  cmu: { lat: 40.443, lon: -79.943 },
  umich: { lat: 42.278, lon: -83.738 },
  purdue: { lat: 40.424, lon: -86.912 },

  /* --- Великобритания ----------------------------------------------------- */
  oxford: { lat: 51.754, lon: -1.254 },
  cambridge: { lat: 52.205, lon: 0.117 },
  icl: { lat: 51.499, lon: -0.175 },
  ucl: { lat: 51.524, lon: -0.134 },
  lse: { lat: 51.514, lon: -0.117 },
  kcl: { lat: 51.512, lon: -0.116 },
  edinburgh: { lat: 55.944, lon: -3.189 },
  warwick: { lat: 52.383, lon: -1.562 },
  glasgow: { lat: 55.872, lon: -4.288 },
  manchester: { lat: 53.467, lon: -2.234 },
  bristol: { lat: 51.458, lon: -2.603 },

  /* --- Европа ------------------------------------------------------------- */
  eth: { lat: 47.376, lon: 8.548 },
  epfl: { lat: 46.519, lon: 6.566 },
  tum: { lat: 48.149, lon: 11.568 },
  lmu: { lat: 48.151, lon: 11.581 },
  heidelberg: { lat: 49.411, lon: 8.707 },
  rwth: { lat: 50.778, lon: 6.078 },
  tudelft: { lat: 51.999, lon: 4.373 },
  uva: { lat: 52.356, lon: 4.956 },
  karolinska: { lat: 59.35, lon: 18.028 },
  sorbonne: { lat: 48.847, lon: 2.356 },
  bocconi: { lat: 45.45, lon: 9.188 },
  polimi: { lat: 45.478, lon: 9.227 },
  tuwien: { lat: 48.199, lon: 16.37 },
  charles: { lat: 50.089, lon: 14.414 },
  semmelweis: { lat: 47.486, lon: 19.068 },
  bme: { lat: 47.481, lon: 19.055 },
  uj: { lat: 50.061, lon: 19.933 },

  /* --- Азия --------------------------------------------------------------- */
  nus: { lat: 1.297, lon: 103.776 },
  ntu: { lat: 1.348, lon: 103.683 },
  hku: { lat: 22.284, lon: 114.137 },
  hkust: { lat: 22.337, lon: 114.264 },
  utokyo: { lat: 35.713, lon: 139.762 },
  kyoto: { lat: 35.026, lon: 135.781 },
  snu: { lat: 37.46, lon: 126.951 },

  /* --- Турция ------------------------------------------------------------- */
  bogazici: { lat: 41.085, lon: 29.051 },
  koc: { lat: 41.205, lon: 29.06 },
  metu: { lat: 39.891, lon: 32.783 },
  hacettepe: { lat: 39.937, lon: 32.861 },

  /* --- Канада ------------------------------------------------------------- */
  utoronto: { lat: 43.663, lon: -79.396 },
  ubc: { lat: 49.261, lon: -123.246 },
  mcgill: { lat: 45.505, lon: -73.577 },
  mcmaster: { lat: 43.261, lon: -79.919 },
  waterloo: { lat: 43.472, lon: -80.545 },

  /* --- Казахстан ---------------------------------------------------------- */
  nu: { lat: 51.09, lon: 71.398 },
  enu: { lat: 51.171, lon: 71.411 },
  aitu: { lat: 51.09, lon: 71.412 },
  kazatu: { lat: 51.181, lon: 71.451 },
  amu: { lat: 51.163, lon: 71.43 },
  kaznu: { lat: 43.222, lon: 76.895 },
  satbayev: { lat: 43.24, lon: 76.928 },
  kbtu: { lat: 43.256, lon: 76.928 },
  kimep: { lat: 43.238, lon: 76.955 },
  narxoz: { lat: 43.213, lon: 76.882 },
  almau: { lat: 43.201, lon: 76.906 },
  kaznmu: { lat: 43.245, lon: 76.919 },
  abaiuniver: { lat: 43.254, lon: 76.943 },
  ablaikhan: { lat: 43.253, lon: 76.945 },
  aues: { lat: 43.23, lon: 76.951 },
  sdu: { lat: 43.198, lon: 76.62 },
  kmu: { lat: 49.807, lon: 73.087 },
  ktu: { lat: 49.796, lon: 73.128 },
  wkmu: { lat: 50.283, lon: 57.166 },
  auezov: { lat: 42.316, lon: 69.587 },
};

/** The coordinate for a programme, or `undefined` when nobody wrote one down. */
export function campusOf(programId: string): Campus | undefined {
  return CAMPUSES[programId];
}
