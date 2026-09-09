export {
  COARSE_GRID_METERS,
  KOREA_BOUNDS,
  coarseGridMetersFor,
  coarseRadiusMeters,
  distanceKm,
  isInKorea,
  snapToGrid,
  toWkt,
  type CoarseGridMeters,
  type LatLng,
} from "./geo";

export type { LocationCandidate } from "./candidate";

export {
  KakaoLocalError,
  addressToCandidate,
  coord2Address,
  coord2Region,
  searchAddress,
  searchCategory,
  placeToCandidate,
  searchKeyword,
  transcoord,
  type KakaoAddress,
  type KakaoAddressMatch,
  type KakaoCoordSystem,
  type KakaoLocalErrorKind,
  type KakaoPage,
  type KakaoPlace,
  type KakaoRegion,
  type PlaceSearchOptions,
} from "./kakao-local";

export {
  KAKAO_CATEGORY_GROUPS,
  type KakaoCategoryGroupCode,
} from "./kakao-categories";

export {
  fieldErrors,
  geocodeRequestSchema,
  latLngSchema,
  placeSearchSchema,
  type GeocodeRequest,
  type PlaceSearchRequest,
} from "./schema";
