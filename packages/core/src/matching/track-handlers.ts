// 실종 신고에 이어 붙는 목격 경로와 다음 목격 예측, 예측 원 안의 제보 밀도 조회

import "server-only";

import { findManagedReport, findTrackSightings } from "@rebirth/db";

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
import { distanceKm } from "../location/geo.ts";
import { searchSpots, type Spot } from "./search-spots.ts";
import {
  confidenceWithPhotos,
  reviewTrack,
  type TrackReview,
} from "./track-review.ts";
import {
  MIN_LEG_SCORE,
  buildTrack,
  predictNext,
  type Prediction,
  type Track,
  type TrackNode,
} from "./track.ts";

// 외형 벡터만으로 경로에 들일 하한, 유사도 분위수 기준
export const MIN_LEG_SIMILARITY = 0.82;

const NOT_FOUND = "찾는 신고가 없습니다. 관리 주소를 다시 확인해 주십시오";
const NEED_AUTH = "관리 주소로 다시 들어와 주십시오";

/** 예측 원 안에 든 제보 수와 그중 가장 최근 제보의 경과 시간 */
function densityAround(
  nodes: TrackNode[],
  prediction: Prediction,
  now: Date,
): { count: number; radiusKm: number; newestHoursAgo: number } {
  const inside = nodes.filter(
    (node) => distanceKm(prediction.center, node.point) <= prediction.radiusKm,
  );
  const newest = inside.reduce<Date | null>(
    (latest, node) =>
      !latest || node.occurredAt > latest ? node.occurredAt : latest,
    null,
  );
  return {
    count: inside.length,
    radiusKm: prediction.radiusKm,
    // 원 안이 비면 마지막 목격 경과 시간으로 대신함
    newestHoursAgo: newest
      ? (now.getTime() - newest.getTime()) / 3_600_000
      : prediction.hoursSinceLast,
  };
}

/**
 * 탐색 지점 조회와 모델 해석을 나란히 돌림
 * 둘 다 외부 호출이라 한쪽이 실패해도 경로·예측·밀도 응답을 막지 않음
 * 모델 입력 타입에 지점 이름 자리가 없어 경로와 예측만 넘김
 */
async function loadAssist(
  track: Track,
  prediction: Prediction | null,
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
    }),
  ]);

  return {
    spots: spots.status === "fulfilled" ? spots.value : [],
    interpretation: review.status === "fulfilled" ? review.value.review : null,
  };
}

/* GET /api/lost/[id]/track  공개된 찾는 중 신고의 목격 경로와 다음 목격 예측 */

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

    const rows = await findTrackSightings(
      lost.id,
      MIN_LEG_SCORE,
      MIN_LEG_SIMILARITY,
    );
    // 배점 하한을 못 넘고 외형 유사도로만 들어온 제보
    const promoted = new Set(
      rows.filter((row) => row.score < MIN_LEG_SCORE).map((row) => row.id),
    );
    // 격자 좌표가 없는 제보는 경로에 얹을 자리가 없음
    const nodes: TrackNode[] = rows.flatMap((row) =>
      row.coarsePoint
        ? [
            {
              id: row.id,
              point: { lat: row.coarsePoint.y, lng: row.coarsePoint.x },
              occurredAt: row.occurredAt,
              // ponytail: 유사도 승격은 최저 점수 대입으로 둠, 경로 소속 배점이 따로 생기면 걷어냄
              score: row.score >= MIN_LEG_SCORE ? row.score : MIN_LEG_SCORE,
              areaName: row.areaName,
            },
          ]
        : [],
    );

    const track = buildTrack({ nodes, size });
    if (!track) {
      return okPrivate({
        track: null,
        prediction: null,
        density: null,
        spots: [],
        interpretation: null,
        promotedCount: 0,
        gridMeters,
      });
    }

    const now = new Date();
    const prediction = predictNext({ track, size, now });
    const density = prediction ? densityAround(nodes, prediction, now) : null;
    const { spots, interpretation } = await loadAssist(track, prediction);

    return okPrivate({
      // 사진 특징이 어긋난 경로는 결정식 신뢰도를 그대로 내보내지 않음
      track: {
        ...track,
        confidence: confidenceWithPhotos(
          track.confidence,
          interpretation?.photoConsistency ?? null,
        ),
      },
      prediction,
      density,
      spots,
      interpretation,
      promotedCount: track.nodes.filter((node) => promoted.has(node.id)).length,
      gridMeters,
    });
  } catch (error) {
    return serverError("lost.track", error);
  }
}
