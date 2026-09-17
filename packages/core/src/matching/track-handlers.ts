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
import { reviewTrack, type TrackReview } from "./track-review.ts";
import {
  MIN_LEG_SCORE,
  buildTrack,
  predictNext,
  type Prediction,
  type Track,
  type TrackNode,
} from "./track.ts";

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

/* GET /api/lost/[id]/track  목격 경로와 다음 목격 예측. 작성자만 봄 */

export async function getLostTrackHandler(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;

  try {
    if (!isUuid(id)) return notFound(NOT_FOUND);

    const access = await checkManageAccess(request, id);
    if (!access.ok) {
      // 세션 만료와 권한 부족을 구분해 다음 행동을 안내함
      return access.reason === "no_session"
        ? unauthorized(NEED_AUTH)
        : forbidden("이 신고를 관리할 권한이 없습니다");
    }

    const lost = await findManagedReport(id);
    if (!lost || lost.kind !== "lost") return notFound(NOT_FOUND);

    // 화면이 그릴 격자 원 크기는 신고가 가진 공개 격자 값을 따름
    const gridMeters = lost.coarseGridM;
    const size = lost.size;

    const rows = await findTrackSightings(lost.id, MIN_LEG_SCORE);
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

    const track = buildTrack({ nodes, size });
    if (!track) {
      return okPrivate({
        track: null,
        prediction: null,
        density: null,
        spots: [],
        interpretation: null,
        gridMeters,
      });
    }

    const now = new Date();
    const prediction = predictNext({ track, size, now });
    const density = prediction ? densityAround(nodes, prediction, now) : null;
    const { spots, interpretation } = await loadAssist(track, prediction);

    return okPrivate({
      track,
      prediction,
      density,
      spots,
      interpretation,
      gridMeters,
    });
  } catch (error) {
    return serverError("lost.track", error);
  }
}
