"use client";

import type { LocationCandidate } from "@rebirth/core/location/candidate";
import {
  COARSE_GRID_METERS,
  coarseRadiusMeters,
  type CoarseGridMeters,
  type LatLng,
} from "@rebirth/core/location/geo";
import { useEffect, useRef, useState } from "react";
import {
  Button,
  FlexBox,
  IconButton,
  Loading,
  SectionMessage,
  Typography,
  useTheme,
} from "@wanteddev/wds";
import {
  IconLocationFill,
  IconMinus,
  IconPinFill,
  IconPlus,
} from "@wanteddev/wds-icon";
import { useCurrentPosition } from "../../hooks/use-current-position";
import { useKakaoMap } from "../../hooks/use-kakao-map";
import { usePlaceSearch } from "../../hooks/use-place-search";
import { useReverseGeocode } from "../../hooks/use-reverse-geocode";
import { PlaceSearchField } from "./place-search-field";

// 목격 위치 입력. 지도는 고르는 도구일 뿐이고 좌표 숫자는 화면에 쓰지 않음

export type LocationSelection = {
  // 정확 좌표. 서버로만 보내고 공개 응답에는 담지 않음
  point: LatLng;
  areaName: string;
  fullName: string;
  // 검색으로 고른 경우의 장소명
  placeName: string | null;
};

export type LocationPickerProps = {
  onSelect: (selection: LocationSelection) => void;
  initialCenter?: LatLng;
  mapHeight?: number | string;
  confirmLabel?: string;
  // 공개 격자 크기. 부상·어린 개체 제보는 1km 로 넓힘
  coarseGridMeters?: CoarseGridMeters;
};

const MAP_HEIGHT = 260;

// 반경 원이 지도 안에 들어오는 배율. 1km 격자는 반경 707m 라 한 단계 넓게 시작함
const LEVEL_BY_GRID: Record<number, number> = {
  [COARSE_GRID_METERS.default]: 4,
  [COARSE_GRID_METERS.wide]: 5,
};

export function LocationPicker({
  onSelect,
  initialCenter,
  mapHeight = MAP_HEIGHT,
  confirmLabel = "이 위치로 선택",
  coarseGridMeters = COARSE_GRID_METERS.default,
}: LocationPickerProps) {
  const [placeName, setPlaceName] = useState<string | null>(null);
  const theme = useTheme();

  const position = useCurrentPosition({ immediate: true });

  // containerRef 를 품은 객체는 그대로 읽으면 ref 접근으로 잡혀 구조분해로 받음
  const {
    containerRef,
    status: mapStatus,
    error: mapError,
    center,
    moveTo,
    zoomIn,
    zoomOut,
  } = useKakaoMap({
    initialCenter,
    initialLevel: LEVEL_BY_GRID[coarseGridMeters],
    // 사용자가 지도를 끌면 검색으로 고른 장소명은 더 이상 맞지 않음
    onUserMove: () => setPlaceName(null),
    // 원은 항상 핀이 있는 지도 중앙. 반경은 공개될 때 좌표가 벗어날 수 있는 거리
    circle: {
      radiusMeters: coarseRadiusMeters(coarseGridMeters),
      color: theme.semantic.primary.normal,
    },
  });
  const region = useReverseGeocode(center);
  // 반경을 걸지 않음. 집에 와서 등록하면 목격 장소가 현재 위치에서 멀 수 있음
  const search = usePlaceSearch({ center });

  // 권한을 받으면 지도를 그 위치로 한 번만 옮김
  const followed = useRef(false);
  useEffect(() => {
    if (!position.point || followed.current) return;
    followed.current = true;
    moveTo(position.point);
  }, [position.point, moveTo]);

  const pickCandidate = (candidate: LocationCandidate) => {
    setPlaceName(candidate.name);
    moveTo(candidate.point, { animate: true });
    search.clear();
  };

  const mapBroken = mapStatus === "error";
  const areaName = region.result?.areaName ?? "";
  const canConfirm = Boolean(region.result) && !region.loading;

  return (
    <FlexBox flexDirection="column" gap="12px">
      <FlexBox flexDirection="column" gap="4px">
        <Typography variant="label1" weight="bold" color="semantic.label.normal">
          목격한 위치
        </Typography>
        <Typography variant="caption1" color="semantic.label.alternative">
          지도를 움직여 핀을 목격한 자리에 맞추거나 장소를 검색하세요
        </Typography>
      </FlexBox>

      <PlaceSearchField search={search} onPick={pickCandidate} />

      {!mapBroken && (
        <FlexBox
          sx={(theme) => ({
            position: "relative",
            height: mapHeight,
            borderRadius: 12,
            overflow: "hidden",
            border: `1px solid ${theme.semantic.line.normal.normal}`,
            backgroundColor: theme.semantic.background.normal.alternative,
          })}
        >
          <div
            ref={containerRef}
            style={{ width: "100%", height: "100%" }}
            aria-label="목격 위치 지도"
            role="application"
          />

          {mapStatus === "loading" && (
            <FlexBox
              alignItems="center"
              justifyContent="center"
              sx={{ position: "absolute", inset: 0, zIndex: 2 }}
            >
              <Loading size={28} />
            </FlexBox>
          )}

          {mapStatus === "ready" && (
            <>
              {/* 핀 끝이 지도 중심을 가리키도록 아이콘 높이만큼 올림 */}
              <FlexBox
                alignItems="center"
                justifyContent="center"
                sx={{
                  position: "absolute",
                  inset: 0,
                  pointerEvents: "none",
                  paddingBottom: 30,
                  // 카카오 지도가 컨테이너 안에 자체 레이어를 쌓아 위로 올려야 보임
                  zIndex: 2,
                }}
              >
                <IconPinFill width={30} height={30} aria-hidden="true" />
              </FlexBox>

              <FlexBox
                flexDirection="column"
                gap="6px"
                sx={{ position: "absolute", right: 8, bottom: 8, zIndex: 2 }}
              >
                <IconButton
                  variant="background"
                  size={28}
                  aria-label="확대"
                  onClick={zoomIn}
                >
                  <IconPlus />
                </IconButton>
                <IconButton
                  variant="background"
                  size={28}
                  aria-label="축소"
                  onClick={zoomOut}
                >
                  <IconMinus />
                </IconButton>
                <IconButton
                  variant="background"
                  size={28}
                  aria-label="현재 위치로"
                  disabled={position.status === "requesting"}
                  onClick={() => {
                    if (position.point) moveTo(position.point, { animate: true });
                    else position.request();
                  }}
                >
                  <IconLocationFill />
                </IconButton>
              </FlexBox>
            </>
          )}
        </FlexBox>
      )}

      {mapBroken && mapError && (
        <SectionMessage variant="info" open>
          {mapError}
        </SectionMessage>
      )}

      {position.error && position.status !== "granted" && (
        <SectionMessage variant="info" open>
          {position.error}
        </SectionMessage>
      )}

      <FlexBox
        flexDirection="column"
        gap="2px"
        sx={(theme) => ({
          padding: "12px",
          borderRadius: 12,
          backgroundColor: theme.semantic.background.normal.alternative,
        })}
      >
        <Typography variant="caption1" color="semantic.label.alternative">
          선택한 위치
        </Typography>
        {region.loading && (
          <Typography variant="body2" color="semantic.label.alternative">
            위치를 확인하고 있습니다
          </Typography>
        )}
        {!region.loading && areaName && (
          <Typography variant="body1" weight="bold">
            {placeName ? `${placeName} · ${areaName}` : region.result?.fullName}
          </Typography>
        )}
        {!region.loading && !areaName && (
          <Typography variant="body2" color="semantic.label.alternative">
            {region.error ?? "지도를 움직여 위치를 골라 주십시오"}
          </Typography>
        )}
        <Typography variant="caption1" color="semantic.label.assistive">
          정확한 좌표는 공개하지 않습니다. 공개될 때는 점선 범위 안의 한 지점으로
          바뀌고 위치는 행정동까지만 적힙니다
        </Typography>
      </FlexBox>

      <Button
        size="large"
        fullWidth
        disabled={!canConfirm}
        onClick={() => {
          if (!region.result) return;
          onSelect({
            point: center,
            areaName: region.result.areaName,
            fullName: region.result.fullName,
            placeName,
          });
        }}
      >
        {confirmLabel}
      </Button>
    </FlexBox>
  );
}
