export {
  SHELTER_ENDPOINTS,
  cleanClosedDay,
  cleanTel,
  extractRows,
  extractTotalCount,
  normalizeCareCenter,
  normalizeTime,
  normalizeWildlifeCenter,
  readResultCode,
  type NormalizedShelter,
  type ShelterSourceKind,
} from "./public-data.ts";

export {
  ShelterSyncError,
  syncAllShelters,
  syncShelterSource,
  type SyncOutcome,
} from "./sync";

export {
  RescueDataError,
  UP_KINDS,
  collectRescueStats,
  fetchKinds,
  fetchRegions,
  type KindRow,
  type RegionRow,
  type StatRow,
} from "./rescue-data";
