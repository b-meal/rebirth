"use client";

// design-system-allow:space 2px 는 stroke 두께라 간격 토큰 단계로 표현할 수 없음

import { Box, HStack, Text, VStack } from "@seed-design/react";
import { distanceKm, type LatLng } from "@rebirth/core/location/geo";

import { formatAbsolute, sinceLabel } from "@/lib/report-label";
import { bearingWord } from "./track-section";
import type { TrackNodeView } from "./use-track";

/**
 * 지도 아래에서 같은 순서를 글로 한 번 더 읽게 하는 타임라인
 * 지도의 주황 신고 점과 초록 번호가 어느 지역 어느 시각인지 여기서만 알 수 있음
 */

// 점 지름, 지도 핀과 같은 색 규칙을 따름
const DOT = "x6";

const RAIL_WIDTH = "2px";

const DEG = 180 / Math.PI;

// 경도 한 도의 실제 폭은 위도에 따라 줄어 방위각을 내기 전에 보정 필요
function legBearing(from: LatLng, to: LatLng): number {
  const east = (to.lng - from.lng) * Math.cos((((from.lat + to.lat) / 2) * Math.PI) / 180);
  const north = to.lat - from.lat;
  return (Math.atan2(east, north) * DEG + 360) % 360;
}

// 구간 하나를 걸린 시간과 거리와 여덟 낱말 방향 한 줄로 옮김
function legSummary(from: TrackNodeView, to: TrackNodeView): string {
  const hours =
    (new Date(to.occurredAt).getTime() - new Date(from.occurredAt).getTime()) / 3_600_000;
  // 한 시간 미만을 반올림하면 0시간 뒤가 떠서 분으로 내림
  const gap = hours < 1 ? `${Math.max(Math.round(hours * 60), 1)}분 뒤` : `${Math.round(hours)}시간 뒤`;
  const km = distanceKm(from.point, to.point);
  const span = km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`;
  return `${gap} ${span} ${bearingWord(legBearing(from.point, to.point))}쪽`;
}

type TimelineRow = {
  key: string;
  label: string;
  areaName: string | null;
  at: Date;
  origin: boolean;
  /** 이 줄에서 다음 줄로 넘어간 구간 요약, 마지막 줄과 신고 줄은 null */
  legAfter: string | null;
};

export type TrackTimelineProps = {
  /** 보호자가 마지막으로 본 곳, 경로의 시작 */
  origin: { areaName: string | null; occurredAt: Date | string };
  /** 뒤따른 목격, 시간순이고 마지막 원소가 가장 최근 */
  nodes: TrackNodeView[];
};

export function TrackTimeline({ origin, nodes }: TrackTimelineProps) {
  if (nodes.length === 0) return null;

  const rows: TimelineRow[] = [
    {
      key: "origin",
      label: "신고",
      areaName: origin.areaName,
      at: new Date(origin.occurredAt),
      origin: true,
      // 신고 지점의 좌표를 받지 않아 첫 목격까지의 구간은 셈이 불가
      legAfter: null,
    },
    ...nodes.map((node, index) => {
      const next = nodes[index + 1];
      return {
        key: node.id,
        label: String(index + 1),
        areaName: node.areaName,
        at: new Date(node.occurredAt),
        origin: false,
        legAfter: next ? legSummary(node, next) : null,
      };
    }),
  ];

  return (
    <VStack align="stretch">
      {rows.map((row, index) => {
        const last = index === rows.length - 1;
        return (
          <HStack key={row.key} align="stretch" gap="x2_5">
            <VStack align="center" width={DOT} flexShrink={0}>
              {/* 점은 모두 같은 지름이라 아래로 내려가는 세로선이 어긋나지 않음 */}
              <HStack
                width={DOT}
                height={DOT}
                align="center"
                justify="center"
                borderRadius="full"
                flexShrink={0}
                bg={row.origin ? "bg.warningSolid" : "bg.brandSolid"}
              >
                {row.origin ? null : (
                  <Text textStyle="t1Bold" color="palette.staticWhite">
                    {row.label}
                  </Text>
                )}
              </HStack>
              {/* 마지막 줄 아래로는 이어질 것이 없어 선을 두지 않음 */}
              {last ? null : (
                <Box
                  minHeight="x3"
                  bg="stroke.neutralMuted"
                  style={{ width: RAIL_WIDTH, flexGrow: 1 }}
                />
              )}
            </VStack>

            <VStack
              align="stretch"
              gap="x0_5"
              minWidth="0"
              {...(last ? {} : { pb: "x3" })}
            >
              {/* 제목 줄 높이를 점 지름에 맞춰 첫 줄과 점의 가운데가 같은 선에 옴 */}
              <HStack minHeight={DOT} align="center">
                <Text textStyle="t3Bold" color="fg.neutral">
                  {row.areaName ?? "지역 미확인"}
                </Text>
              </HStack>
              <Text textStyle="t2Regular" color="fg.neutralMuted">
                {sinceLabel(row.at)} · {formatAbsolute(row.at)}
              </Text>
              {row.origin ? (
                <Text textStyle="t2Regular" color="fg.neutralSubtle">
                  보호자가 마지막으로 본 곳, 지도의 주황 점
                </Text>
              ) : null}
              {/* 다음 줄로 내려가는 세로선 옆에 두어 구간이 어디에서 어디로인지 읽힘 */}
              {row.legAfter ? (
                <Text textStyle="t2Regular" color="fg.neutralSubtle">
                  {row.legAfter}
                </Text>
              ) : null}
            </VStack>
          </HStack>
        );
      })}
    </VStack>
  );
}
