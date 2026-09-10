"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import { Box, Grid, HStack, Icon, ImageFrame, Text, VStack } from "@seed-design/react";
import {
  IconBellLine,
  IconCrosshairLine,
  IconMagnifyingglassLine,
  IconPawprintFill,
  IconPlusLine,
} from "@karrotmarket/react-monochrome-icon";
import { Marker, Popup, type MapMouseEvent } from "maplibre-gl";
import { distanceKm, type LatLng } from "@rebirth/core/location/geo";
import { Callout } from "seed-design/ui/callout";
import { ContextualFloatingButton } from "seed-design/ui/contextual-floating-button";
import { FloatingActionButton } from "seed-design/ui/floating-action-button";
import { Snackbar, useSnackbarAdapter } from "seed-design/ui/snackbar";

import { describeAnimal } from "@/lib/report-label";
import { useCurrentPosition } from "@/hooks/use-current-position";
import { useMap } from "@/hooks/use-map";
import { useReverseGeocode } from "@/hooks/use-reverse-geocode";
import { BottomNav } from "@/components/ui/bottom-nav";
import { MapPreviewCard } from "@/components/home/map-preview-card";
import { ReportCard, type ReportCardItem } from "@/components/report/report-card";

// 지도가 맨 아래, 그 위에 시트, 맨 위에 떠 있는 내비게이션을 겹치는 첫 화면

export type MapMarker = ReportCardItem & {
  // 격자 스냅한 공개용 좌표, 정확한 목격 지점이 아님
  point: LatLng;
};

// 시트에 셀 반경, 지도 중심에서 이 거리 안의 제보만 셈
const NEARBY_RADIUS_KM = 3;

// 핀을 고르면 당기는 축척, 주변 골목이 보이는 정도
const PIN_ZOOM = 16;

// 고른 핀을 화면 가운데보다 아래에 두어 위로 열리는 말풍선 자리를 만듦
const PIN_OFFSET: [number, number] = [0, 90];

// 시트 높이는 화면 비율로 다루고 드래그는 min 과 max 사이에서만 움직임
const SHEET = { collapsed: 0.27, expanded: 0.62, min: 0.14, max: 0.72 } as const;
const SHEET_MID = (SHEET.collapsed + SHEET.expanded) / 2;

// 지도 오버레이는 React 밖에서 그려지므로 색은 SEED CSS 변수로만 참조
const MY_LOCATION_DOT = [
  "width:14px",
  "height:14px",
  "border-radius:9999px",
  "background:var(--seed-color-fg-brand)",
  "border:2px solid var(--seed-color-bg-layer-floating)",
  "box-shadow:0 0 0 6px var(--seed-color-bg-brand-weak)",
].join(";");

// 색은 상황만 알리고 무엇인지는 사진이 알림
const PIN_TONE = {
  injured: { bg: "bg.criticalSolid", fg: "fg.criticalContrast" },
  inCare: { bg: "bg.informativeSolid", fg: "fg.informativeContrast" },
  roaming: { bg: "bg.brandSolid", fg: "fg.brandContrast" },
} as const;

function toneOf(item: MapMarker) {
  if (item.injury === true) return PIN_TONE.injured;
  if (item.careSituation === "in_care") return PIN_TONE.inCare;
  return PIN_TONE.roaming;
}

type ReportPinProps = {
  item: MapMarker;
  selected: boolean;
  onSelect: (item: MapMarker) => void;
};

function ReportPin({ item, selected, onSelect }: ReportPinProps) {
  const tone = toneOf(item);
  return (
    <Box
      asChild
      width={selected ? "x14" : "x10"}
      height={selected ? "x14" : "x10"}
      p="x0_5"
      borderRadius="full"
      borderWidth="2px"
      borderColor="bg.layerFloating"
      bg={tone.bg}
      boxShadow={selected ? "s3" : "s2"}
    >
      <button
        type="button"
        aria-label={`${describeAnimal(item)} 제보 미리 보기`}
        aria-pressed={selected}
        onClick={() => onSelect(item)}
      >
        {item.photoUrl ? (
          <ImageFrame ratio={1} width="full" src={item.photoUrl} alt="" borderRadius="full" />
        ) : (
          // 사진이 없거나 서명이 만료되면 발자국으로 대체
          <VStack align="center" justify="center" height="full" borderRadius="full">
            <Icon svg={<IconPawprintFill />} size="x4" color={tone.fg} />
          </VStack>
        )}
      </button>
    </Box>
  );
}

export type HomeScreenProps = {
  markers: MapMarker[];
};

export function HomeScreen({ markers }: HomeScreenProps) {
  const router = useRouter();
  const snackbar = useSnackbarAdapter();
  const position = useCurrentPosition({ immediate: true });
  const { containerRef, status, error, center, moveTo, map } = useMap();

  const ready = status === "ready";
  // 지도 중심의 행정동을 카카오 로컬 API 로 확인해 시트 제목에 씀
  const geocode = useReverseGeocode(ready ? center : position.point);

  const notice = (message: string) =>
    snackbar.create({
      onClose: () => {},
      render: () => <Snackbar message={message} />,
    });

  // 권한 응답이 늦게 와도 첫 도착에만 옮겨 사용자가 끌어 둔 화면을 되돌리지 않음
  const centered = useRef(false);
  useEffect(() => {
    if (!position.point || centered.current) return;
    centered.current = true;
    moveTo(position.point);
  }, [position.point, moveTo]);

  // 핀은 SEED 컴포넌트로 그려야 해 오버레이에 빈 요소만 올리고 포털로 채움
  const [pins, setPins] = useState<{ item: MapMarker; el: HTMLElement }[]>([]);
  useEffect(() => {
    if (!map) return;
    const drawn = markers.map((item) => {
      const el = document.createElement("div");
      el.dataset.reportPin = "";
      const marker = new Marker({ element: el, anchor: "center" })
        .setLngLat([item.point.lng, item.point.lat])
        .addTo(map);
      return { item, el, marker };
    });
    // 마커 요소는 지도가 만든 뒤에야 존재해 포털 대상은 마운트 후 한 번 넣음
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPins(drawn.map(({ item, el }) => ({ item, el })));

    return () => {
      for (const { marker } of drawn) marker.remove();
      setPins([]);
    };
  }, [map, markers]);

  const myPoint = position.point;
  useEffect(() => {
    if (!map || !myPoint) return;
    const dot = document.createElement("div");
    dot.setAttribute("style", MY_LOCATION_DOT);
    const marker = new Marker({ element: dot, anchor: "center" })
      .setLngLat([myPoint.lng, myPoint.lat])
      .addTo(map);

    return () => {
      marker.remove();
    };
  }, [map, myPoint]);

  // 지도를 못 띄우면 거리를 셀 기준이 없어 최근 제보를 그대로 보여줌
  const nearby = useMemo(
    () =>
      ready
        ? markers.filter((item) => distanceKm(center, item.point) <= NEARBY_RADIUS_KM)
        : markers,
    [ready, center, markers],
  );

  const [sheetRatio, setSheetRatio] = useState<number>(SHEET.collapsed);

  // 핀을 고르면 지도 위 말풍선으로 요약을 띄움
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(
    () => markers.find((item) => item.id === selectedId) ?? null,
    [markers, selectedId],
  );

  // 말풍선을 닫을 때 돌려놓을 직전 화면, 핀을 옮겨 골라도 처음 값을 지킴
  const beforePreview = useRef<{ point: LatLng; zoom: number } | null>(null);

  const selectPin = (item: MapMarker) => {
    if (map && !beforePreview.current) {
      const at = map.getCenter();
      beforePreview.current = { point: { lat: at.lat, lng: at.lng }, zoom: map.getZoom() };
    }
    setSelectedId(item.id);
    setSheetRatio(SHEET.min);
    moveTo(item.point, { animate: true, zoom: PIN_ZOOM, offset: PIN_OFFSET });
  };

  const closePreview = useCallback(() => {
    setSelectedId(null);
    setSheetRatio(SHEET.collapsed);

    const before = beforePreview.current;
    beforePreview.current = null;
    if (before) moveTo(before.point, { animate: true, zoom: before.zoom });
  }, [moveTo]);

  // 말풍선도 지도가 만든 요소에 포털로 채움, 위치와 방향은 SDK 가 잡음
  const [popupEl, setPopupEl] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!map || !selected) return;

    const element = document.createElement("div");
    element.dataset.reportPopup = "";
    const popup = new Popup({
      closeButton: false,
      closeOnClick: false,
      maxWidth: "none",
      offset: 22,
      className: "rebirth-map-popup",
    })
      .setLngLat([selected.point.lng, selected.point.lat])
      .setDOMContent(element)
      .addTo(map);

    // 말풍선 요소는 지도가 만든 뒤에야 존재해 포털 대상은 마운트 후 한 번 넣음
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPopupEl(element);

    return () => {
      popup.remove();
      setPopupEl(null);
    };
  }, [map, selected]);

  // 지도 빈 곳을 누르면 닫음, 핀 클릭도 지도 클릭으로 올라와 표식으로 걸러냄
  useEffect(() => {
    if (!map) return;
    const close = (event: MapMouseEvent) => {
      const target = event.originalEvent.target;
      if (target instanceof Element && target.closest("[data-report-pin], [data-report-popup]")) {
        return;
      }
      closePreview();
    };
    map.on("click", close);
    return () => {
      map.off("click", close);
    };
  }, [map, closePreview]);

  const expanded = sheetRatio > SHEET_MID;
  const drag = useRef<{ startY: number; startRatio: number; moved: boolean } | null>(null);

  const startDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    drag.current = { startY: event.clientY, startRatio: sheetRatio, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const current = drag.current;
    if (!current) return;
    if (Math.abs(event.clientY - current.startY) > 4) current.moved = true;
    const next = current.startRatio + (current.startY - event.clientY) / window.innerHeight;
    setSheetRatio(Math.min(SHEET.max, Math.max(SHEET.min, next)));
  };

  const endDrag = () => {
    const current = drag.current;
    if (!current) return;
    drag.current = null;
    // 움직이지 않았으면 탭으로 보고 두 단계를 오감
    if (!current.moved) {
      setSheetRatio(current.startRatio > SHEET_MID ? SHEET.collapsed : SHEET.expanded);
      return;
    }
    // 끌어올렸으면 펼치고 내렸으면 접고, 거의 안 움직였으면 원래 높이로 되돌림
    setSheetRatio((value) => {
      if (value > current.startRatio + 0.03) return SHEET.expanded;
      if (value < current.startRatio - 0.03) return SHEET.collapsed;
      return current.startRatio;
    });
  };

  const recenter = () => {
    if (position.point) {
      moveTo(position.point, { animate: true });
      return;
    }
    if (position.error) {
      notice(position.error);
      return;
    }
    position.request();
  };

  return (
    <Box position="relative" height="100dvh" bg="bg.layerDefault">
      {/* zIndex 를 줘서 SDK 가 넣는 내부 레이어가 시트 위로 올라오지 않게 가둠 */}
      {/* MapLibre 가 컨테이너에 position relative 를 걸어 크기 잡는 요소를 따로 둠 */}
      <Box
        position="absolute"
        top="0"
        right="0"
        bottom="0"
        left="0"
        zIndex={0}
        bg="bg.neutralWeak"
      >
        <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      </Box>

      {pins.map(({ item, el }) =>
        createPortal(
          <ReportPin item={item} selected={item.id === selectedId} onSelect={selectPin} />,
          el,
          item.id,
        ),
      )}

      {popupEl && selected
        ? createPortal(
            <MapPreviewCard item={selected} onClose={closePreview} />,
            popupEl,
          )
        : null}

      {status === "error" ? (
        <VStack
          position="absolute"
          top="0"
          right="0"
          bottom="0"
          left="0"
          zIndex={1}
          justify="center"
          px="spacingX.globalGutter"
        >
          <Callout tone="informative" description={error ?? ""} />
        </VStack>
      ) : null}

      <HStack
        position="absolute"
        top="0"
        left="0"
        right="0"
        zIndex={3}
        px="spacingX.globalGutter"
        pt="x3"
        gap="x2"
        align="center"
      >
        {/* 지도 위에서는 입력을 받지 않고 검색 화면으로 넘김 */}
        <VStack
          asChild
          align="stretch"
          grow={1}
          minWidth="0"
          borderRadius="r3"
          bg="bg.layerFloating"
          boxShadow="s2"
        >
          <Link href="/search" aria-label="제보 검색">
            <HStack gap="x2" align="center" px="x4" py="x3">
              <Icon svg={<IconMagnifyingglassLine />} size="x5" color="fg.neutralSubtle" />
              <Text textStyle="t4Regular" color="fg.neutralSubtle">
                동물 특징이나 동네로 검색
              </Text>
            </HStack>
          </Link>
        </VStack>
        <ContextualFloatingButton
          variant="layer"
          layout="iconOnly"
          aria-label="알림"
          onClick={() => notice("알림은 아직 준비 중입니다")}
        >
          <Icon svg={<IconBellLine />} />
        </ContextualFloatingButton>
      </HStack>

      <VStack position="absolute" bottom="0" left="0" right="0" zIndex={2} gap="x3" align="stretch">
        {selected ? null : (
        <VStack align="flex-end" gap="x2" px="spacingX.globalGutter">
          <ContextualFloatingButton
            variant="layer"
            layout="iconOnly"
            aria-label="현재 위치로 이동"
            loading={position.status === "requesting"}
            onClick={recenter}
          >
            <Icon svg={<IconCrosshairLine />} />
          </ContextualFloatingButton>
          <FloatingActionButton
            icon={<IconPlusLine />}
            label="제보하기"
            onClick={() => router.push("/report")}
          />
        </VStack>
        )}

        <VStack
          as="section"
          align="stretch"
          gap="x2"
          pb="x5"
          bg="bg.layerFloating"
          borderTopLeftRadius="r5"
          borderTopRightRadius="r5"
          boxShadow="s3"
        >
          <VStack asChild align="center" pt="x2_5" pb="x0_5">
            <button
              type="button"
              aria-expanded={expanded}
              aria-label={expanded ? "목록 접기" : "목록 펼치기"}
              style={{ touchAction: "none", cursor: "grab" }}
              onPointerDown={startDrag}
              onPointerMove={onDrag}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
            >
              <Box width="x9" height="x1" borderRadius="full" bg="bg.neutralWeak" />
            </button>
          </VStack>

          <HStack px="spacingX.globalGutter" justify="space-between" align="center" gap="x2">
            <Text textStyle="t5Bold" color="fg.neutral" maxLines={1}>
              {ready
                ? `${geocode.result?.areaName ?? "근처"} 반경 ${NEARBY_RADIUS_KM}km`
                : "최근 발견 제보"}
            </Text>
            <Text textStyle="t3Regular" color="fg.neutralMuted">
              {nearby.length}건
            </Text>
          </HStack>

          {/* 아래 여백은 떠 있는 내비게이션이 가리는 만큼 비워 두는 자리 */}
          <Box height={`${Math.round(sheetRatio * 100)}dvh`} pb="x16" overflowY="auto">
            {nearby.length === 0 ? (
              <VStack px="spacingX.globalGutter" py="x2" gap="x1" align="stretch">
                <Text textStyle="t4Regular" color="fg.neutralMuted">
                  이 지역에는 아직 제보가 없습니다
                </Text>
                <Text textStyle="t3Regular" color="fg.neutralSubtle">
                  지도를 옮기면 다른 지역의 제보를 볼 수 있습니다
                </Text>
              </VStack>
            ) : (
              <Grid columns={2} gap="x4" px="spacingX.globalGutter">
                {nearby.map((item) => (
                  <ReportCard key={item.id} item={item} />
                ))}
              </Grid>
            )}
          </Box>
        </VStack>
      </VStack>

      <Box position="absolute" bottom="0" left="0" right="0" zIndex={4} px="x4" pb="x4">
        <BottomNav onUnavailable={(label) => notice(`${label}는 아직 준비 중입니다`)} />
      </Box>
    </Box>
  );
}
