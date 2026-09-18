// 실종 신고에 이어 붙는 목격 경로와 다음 목격 예측, 탐색 단계와 주변 제보 상황 조회

import "server-only";

import {
  countSightingsAround,
  findManagedReport,
  findLostCoarsePoint,
  findTrackSightings,
} from "@rebirth/db";

import {
  checkManageAccess,
  forbidden,
  isUuid,
  notFound,
  okPrivate,
  serverError,
  unauthorized,
  type RouteContext,
} from "../http";
import { distanceKm, type LatLng } from "../location/geo.ts";
import {
  COVERAGE_DAYS,
  COVERAGE_RADIUS_KM,
  buildSearchAdvice,
  densityRadiusKm,
  type SearchAdvice,
  type SearchAround,
} from "./search-advice.ts";
import { searchSpots, type Spot } from "./search-spots.ts";
import { reviewTrack, type TrackReview } from "./track-review.ts";
import {
  MIN_LEG_SCORE,
  buildTrack,
  predictNext,
  searchRadiusKm,
  type Prediction,
  type Track,
  type TrackNode,
} from "./track.ts";

const NOT_FOUND = "찾는 신고가 없습니다. 관리 주소를 다시 확인해 주십시오";
const NEED_AUTH = "관리 주소로 다시 들어와 주십시오";

/**
 * 탐색 조언 입력을 모음. 중심은 예측 원이 있으면 그 중심, 없으면 실종 신고의 격자 좌표
 * 분모는 반경 안 전체 발견 제보, 분자는 그중 이 신고와 닮은 후보
 * 기준 시각은 보호자가 적은 실종 시각이고 후보 시각은 따로 넘김
 */
async function loadAdvice(input: {
  lost: {
    id: string;
    occurredAt: Date;
    animalType: "dog" | "cat" | "other" | "unknown";
    size: "small" | "medium" | "large" | "unknown";
    coarseGridM: number;
  };
  lostPoint: LatLng | null;
  nodes: TrackNode[];
  prediction: Prediction | null;
  now: Date;
}): Promise<SearchAdvice> {
  const { lost, nodes, prediction, now } = input;
  const hoursSinceLost = Math.max(
    (now.getTime() - lost.occurredAt.getTime()) / 3_600_000,
    0,
  );
  const center = prediction?.center ?? input.lostPoint;
  const baseRadiusKm = prediction?.radiusKm ?? searchRadiusKm(lost.size, hoursSinceLost);
  const radiusKm = densityRadiusKm(baseRadiusKm, lost.coarseGridM);

  let around: SearchAround | null = null;
  let areaSightings: number | null = null;
  if (center) {
    // 두 수는 서로 기대지 않아 나란히 셈. 한쪽이 실패해도 다른 줄은 살림
    const [inRadius, inArea] = await Promise.allSettled([
      countSightingsAround({
        center,
        radiusM: Math.round(radiusKm * 1000),
        since: lost.occurredAt,
        excludeId: lost.id,
      }),
      countSightingsAround({
        center: input.lostPoint ?? center,
        radiusM: COVERAGE_RADIUS_KM * 1000,
        since: new Date(now.getTime() - COVERAGE_DAYS * 86_400_000),
        excludeId: lost.id,
      }),
    ]);
    if (inRadius.status === "fulfilled") {
      const candidates = nodes.filter(
        (node) => distanceKm(center, node.point) <= radiusKm,
      ).length;
      // 후보도 발견 제보라 분모가 분자보다 작게 세어지는 일은 막음
      around = { sightings: Math.max(inRadius.value, candidates), candidates };
    }
    if (inArea.status === "fulfilled") areaSightings = inArea.value;
  }

  const latestCandidateAt = nodes.reduce<Date | null>(
    (latest, node) => (!latest || node.occurredAt > latest ? node.occurredAt : latest),
    null,
  );

  return buildSearchAdvice({
    lostOccurredAt: lost.occurredAt,
    now,
    animalType: lost.animalType,
    size: lost.size,
    gridMeters: lost.coarseGridM,
    radiusKm: baseRadiusKm,
    around,
    areaSightings,
    latestCandidateAt,
  });
}

/**
 * 탐색 지점 조회와 모델 해석을 나란히 돌림
 * 둘 다 외부 호출이라 한쪽이 실패해도 경로·예측·조언 응답을 막지 않음
 * 모델에는 규칙이 이미 센 숫자만 넘겨 해석이 같은 사실 위에 서게 함
 */
async function loadAssist(
  track: Track,
  prediction: Prediction | null,
  advice: SearchAdvice,
): Promise<{ spots: Spot[]; interpretation: TrackReview | null }> {
  const [spots, review] = await Promise.allSettled([
    prediction
      ? searchSpots({
          center: prediction.center,
          radiusKm: prediction.radiusKm,
        })
      : Promise.resolve<Spot[]>([]),
    reviewTrack({
      nodes: track.nodes.map((node) => ({
        reportId: node.id,
        areaName: node.areaName,
        occurredAt: node.occurredAt,
      })),
      confidence: track.confidence,
      prediction: prediction
        ? {
            radiusKm: prediction.radiusKm,
            straightness: prediction.straightness,
            hoursSinceLast: prediction.hoursSinceLast,
            bearingDeg: prediction.bearingDeg,
          }
        : null,
      situation: {
        phase: advice.phase,
        hoursSinceLost: advice.hoursSinceLost,
        radiusKm: advice.radiusKm,
        around: advice.around,
        coverage: advice.coverage,
      },
    }),
  ]);

  return {
    spots: spots.status === "fulfilled" ? spots.value : [],
    interpretation: review.status === "fulfilled" ? review.value.review : null,
  };
}

/* GET /api/lost/[id]/track  공개된 찾는 중 신고의 목격 경로와 다음 목격 예측, 탐색 조언 */

export async function getLostTrackHandler(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;

  try {
    if (!isUuid(id)) return notFound(NOT_FOUND);

    const lost = await findManagedReport(id);
    if (!lost || lost.kind !== "lost") return notFound(NOT_FOUND);

    /**
     * 공개된 찾는 중 신고는 이웃도 봄
     * 어디를 찾아봐야 하는지 아는 사람이 많을수록 다시 만날 확률이 올라감
     * 좌표는 격자로 넓힌 값이고 개체 동일성을 확정하지 않아 후보 목록과 다름
     * 숨겼거나 끝난 신고는 남에게 보일 까닭이 없어 작성자에게만 남김
     */
    const open = lost.visibility === "public" && lost.lifecycle === "searching";
    if (!open) {
      const access = await checkManageAccess(request, id);
      if (!access.ok) {
        // 세션 만료와 권한 부족을 구분해 다음 행동을 안내함
        return access.reason === "no_session"
          ? unauthorized(NEED_AUTH)
          : forbidden("이 신고를 관리할 권한이 없습니다");
      }
    }

    // 화면이 그릴 격자 원 크기는 신고가 가진 공개 격자 값을 따름
    const gridMeters = lost.coarseGridM;
    const size = lost.size;

    const [rows, lostCoarse] = await Promise.all([
      findTrackSightings(lost.id, MIN_LEG_SCORE),
      findLostCoarsePoint(lost.id),
    ]);
    const lostPoint: LatLng | null = lostCoarse
      ? { lat: lostCoarse.y, lng: lostCoarse.x }
      : null;
    // 격자 좌표가 없는 제보는 경로에 얹을 자리가 없음
    const nodes: TrackNode[] = rows.flatMap((row) =>
      row.coarsePoint
        ? [
            {
              id: row.id,
              point: { lat: row.coarsePoint.y, lng: row.coarsePoint.x },
              occurredAt: row.occurredAt,
              score: row.score,
              areaName: row.areaName,
            },
          ]
        : [],
    );

    const now = new Date();
    const track = buildTrack({ nodes, size });
    const prediction = track ? predictNext({ track, size, now }) : null;
    // 경로가 없어도 단계와 주변 상황은 말할 수 있어 조언은 항상 냄
    const advice = await loadAdvice({
      lost: {
        id: lost.id,
        occurredAt: lost.occurredAt,
        animalType: lost.animalType,
        size,
        coarseGridM: gridMeters,
      },
      lostPoint,
      nodes,
      prediction,
      now,
    });

    if (!track) {
      return okPrivate({
        track: null,
        prediction: null,
        advice,
        spots: [],
        interpretation: null,
        gridMeters,
      });
    }

    const { spots, interpretation } = await loadAssist(track, prediction, advice);

    return okPrivate({
      track,
      prediction,
      advice,
      spots,
      interpretation,
      gridMeters,
    });
  } catch (error) {
    return serverError("lost.track", error);
  }
}
