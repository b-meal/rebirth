export {
  MAX_SCORE,
  WEIGHTS,
  isComparable,
  scoreMatch,
  type MatchBreakdown,
  type MatchInput,
  type MatchResult,
} from "./score";

export {
  createLostHandler,
  getLostCandidatesHandler,
  getLostMatchesHandler,
} from "./handlers";

export {
  MATCH_VERDICT_LABEL,
  REVIEW_MODEL,
  REVIEW_PROMPT_VERSION,
  ReviewError,
  matchReview,
  matchVerdict,
  reviewMatch,
  type MatchReview,
  type ReviewInput,
  type ReviewSubject,
} from "./review";

export { runMatchReview, type RunReviewOutcome } from "./run-review";

export { reviewMatchHandler } from "./review-handlers";

export { scoreSightingAgainstLost } from "./alerts";
export {
  listSightingLostMatches,
  type SightingLostMatch,
  type SightingLostMatches,
} from "./sighting-matches";


export {
  buildTrack,
  isFeasibleLeg,
  legFeasibility,
  predictNext,
  searchRadiusKm,
  straightness,
  straightnessEffective,
  type Prediction,
  type Track,
  type TrackLeg,
  type TrackNode,
  type TrackSize,
} from "./track";

export {
  SPOT_KEYWORDS,
  SPOT_LIMIT,
  rankSpots,
  searchSpots,
  type Spot,
  type SpotCandidate,
  type SpotKeyword,
} from "./search-spots";

export {
  TRACK_MODEL,
  TRACK_PROMPT_VERSION,
  TrackReviewError,
  describeTrack,
  reviewTrack,
  trackReview,
  type TrackReview,
  type TrackReviewInput,
  type TrackReviewNode,
  type TrackSituation,
} from "./track-review";

export {
  COVERAGE_DAYS,
  COVERAGE_MIN_REPORTS,
  COVERAGE_RADIUS_KM,
  PHASE_HOURS,
  actionLine,
  buildSearchAdvice,
  coverageLine,
  densityLine,
  densityRadiusKm,
  searchPhase,
  type Coverage,
  type SearchAdvice,
  type SearchAround,
  type SearchPhase,
} from "./search-advice";

export { getLostTrackHandler } from "./track-handlers";
