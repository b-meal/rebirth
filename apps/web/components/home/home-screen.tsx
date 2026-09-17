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
import { Box, HStack, Icon, ImageFrame, Text, VStack } from "@seed-design/react";
import {
  IconBellLine,
  IconChevronUpLine,
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
import { useDeviceHeading } from "@/hooks/use-device-heading";
import { useMap } from "@/hooks/use-map";
import { useReverseGeocode } from "@/hooks/use-reverse-geocode";
import { MapPreviewCard } from "@/components/home/map-preview-card";
import { NearbyList } from "@/components/home/nearby-list";
import type { ReportCardItem } from "@/components/report/report-card";

// 지도가 맨 아래, 그 위에 시트, 맨 위에 떠 있는 내비게이션을 겹치는 첫 화면

export type MapMarker = ReportCardItem & {
  // 격자 스냅한 공개용 좌표, 정확한 목격 지점이 아님
  point: LatLng;
};

// 시트에 셀 반경, 지도 중심에서 이 거리 안의 제보만 셈
const NEARBY_RADIUS_KM = 3;

// 반경 안에 하나도 없을 때 대신 보여 줄 가까운 제보 수
const NEARBY_FALLBACK_COUNT = 12;

// 핀을 고르면 당기는 축척, 주변 골목이 보이는 정도
const PIN_ZOOM = 16;

// 고른 핀을 화면 가운데보다 아래에 두어 위로 열리는 말풍선 자리를 만듦
const PIN_OFFSET: [number, number] = [0, 90];

// 시트 높이는 화면 비율로 다루고 드래그는 min 과 max 사이에서만 움직임
// hidden 은 시트를 걷고 손잡이만 남기는 단계, 지도만 보려는 사람의 자리
const SHEET = { hidden: 0, min: 0.02, collapsed: 0.27, expanded: 0.62, max: 0.72 } as const;
const SHEET_MID = (SHEET.collapsed + SHEET.expanded) / 2;

// 손을 떼면 이 세 단계 중 이웃으로만 붙음
const STOPS: number[] = [SHEET.hidden, SHEET.collapsed, SHEET.expanded];

// 지도 오버레이는 React 밖에서 그려지므로 색은 SEED CSS 변수로만 참조
const MY_LOCATION_DOT = [
  "width:14px",
  "height:14px",
  "border-radius:9999px",
  "background:var(--seed-color-fg-brand)",
  "border:2px solid var(--seed-color-bg-layer-floating)",
  "box-shadow:0 0 0 6px var(--seed-color-bg-brand-weak)",
].join(";");

// 점을 한가운데 둔 정사각, 지도가 이 요소를 돌려 화살이 점을 축으로 돎
const MY_LOCATION_WRAP = [
  "position:relative",
  "width:36px",
  "height:36px",
  "display:flex",
  "align-items:center",
  "justify-content:center",
].join(";");

// 기기가 바라보는 쪽을 가리키는 화살, 나침반을 못 읽으면 감춤
const MY_LOCATION_CONE = [
  "position:absolute",
  "top:0",
  "left:50%",
  "margin-left:-6px",
  "width:0",
  "height:0",
  "border-left:6px solid transparent",
  "border-right:6px solid transparent",
  "border-bottom:9px solid var(--seed-color-fg-brand)",
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
          // 지도에 얹힌 핀 수백 개가 한꺼번에 사진을 받지 않도록 화면에 든 것만 받음
          <ImageFrame
            ratio={1}
            width="full"
            src={item.photoUrl}
            alt=""
            borderRadius="full"
            loading="lazy"
            decoding="async"
          />
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

// 훅의 초기값. 렌더마다 새 배열을 넘기지 않도록 바깥에 둠
const EMPTY_MARKERS: MapMarker[] = [];

// 약속이 풀리기 전에는 빈 값을 돌려줘 지도가 기다리지 않고 먼저 뜨게 함
// use 를 쓰면 화면 전체가 멈춰 덮개 뒤에서 지도가 준비되지 않음
function useStreamed<T>(promise: Promise<T>, initial: T): T {
  const [value, setValue] = useState<T>(initial);
  useEffect(() => {
    let alive = true;
    promise.then((next) => {
      if (alive) setValue(next);
    });
    return () => {
      alive = false;
    };
  }, [promise]);
  return value;
}

export type HomeScreenProps = {
  // 화면을 먼저 띄우고 마커만 나중에 받도록 Promise 로 받음
  // 지도와 시트는 곧바로 그리고, 핀만 도착한 뒤에 얹힘
  markers: Promise<MapMarker[]>;
  /** 구독한 동네의 안 읽은 제보 수. 로그인 전이면 0 */
  unread: Promise<number>;
};

export function HomeScreen({
  markers: markersPromise,
  unread: unreadPromise,
}: HomeScreenProps) {
  // 이 훅은 서버가 마커를 흘려보낼 때까지 기다리지만, 덮개 아래에서 지도는 이미 떠 있음
  const markers = useStreamed(markersPromise, EMPTY_MARKERS);
  const unread = useStreamed(unreadPromise, 0);

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

  // 검색창과 시트가 지도를 덮어 그 사이만 실제로 보이는 구간
  const topBarRef = useRef<HTMLDivElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);

  // 지도 중심을 보이는 구간 한가운데로 옮겨 내 위치가 시트 쪽으로 밀려 내려가지 않게 함
  useEffect(() => {
    if (!map) return;
    const apply = () => {
      const height = window.innerHeight;
      const top = topBarRef.current?.getBoundingClientRect().bottom ?? 0;
      const sheetTop = sheetRef.current?.getBoundingClientRect().top ?? height;
      // 시트를 펼친 채 화면이 바뀌면 여백이 지도보다 커져 남는 구간이 사라지므로 절반으로 묶음
      const bottom = Math.max(Math.min(height - sheetTop, (height - top) / 2), 0);
      map.setPadding({ top, bottom, left: 0, right: 0 });
    };
    apply();
    window.addEventListener("resize", apply);
    return () => {
      window.removeEventListener("resize", apply);
    };
  }, [map]);

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
  // 나침반 값은 초당 수십 번 바뀌어 상태로 들면 핀 수백 개가 같이 다시 그려짐
  const myMarker = useRef<Marker | null>(null);
  const myCone = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!map || !myPoint) return;
    const wrap = document.createElement("div");
    wrap.setAttribute("style", MY_LOCATION_WRAP);
    const cone = document.createElement("div");
    cone.setAttribute("style", MY_LOCATION_CONE);
    cone.hidden = true;
    const dot = document.createElement("div");
    dot.setAttribute("style", MY_LOCATION_DOT);
    wrap.append(cone, dot);

    // 방향은 세상 기준이라 지도를 돌리면 화살도 같이 돌아야 함
    const marker = new Marker({ element: wrap, anchor: "center", rotationAlignment: "map" })
      .setLngLat([myPoint.lng, myPoint.lat])
      .addTo(map);
    myMarker.current = marker;
    myCone.current = cone;

    return () => {
      marker.remove();
      myMarker.current = null;
      myCone.current = null;
    };
  }, [map, myPoint]);

  const showHeading = useCallback((heading: number | null) => {
    const cone = myCone.current;
    if (!cone) return;
    cone.hidden = heading === null;
    if (heading !== null) myMarker.current?.setRotation(heading);
  }, []);

  const compass = useDeviceHeading({ enabled: Boolean(myPoint), onChange: showHeading });

  // 지도를 못 띄우면 거리를 셀 기준이 없어 최근 제보를 그대로 보여줌
  // 반경 안이 비면 가까운 순으로 몇 건 올려 줌, 빈 화면은 둘러볼 거리를 주지 않음
  const { nearby, widened } = useMemo(() => {
    if (!ready) return { nearby: markers, widened: false };
    const inRadius = markers.filter((item) => distanceKm(center, item.point) <= NEARBY_RADIUS_KM);
    if (inRadius.length > 0) return { nearby: inRadius, widened: false };
    const sorted = [...markers]
      .map((item) => ({ item, km: distanceKm(center, item.point) }))
      .sort((a, b) => a.km - b.km)
      .slice(0, NEARBY_FALLBACK_COUNT)
      .map((row) => row.item);
    return { nearby: sorted, widened: sorted.length > 0 };
  }, [ready, center, markers]);

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
    setSheetRatio(SHEET.hidden);
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
  const hidden = sheetRatio === SHEET.hidden;
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
    const at = Math.max(0, STOPS.indexOf(current.startRatio));
    // 움직이지 않았으면 탭으로 보고 한 단 올리되 맨 위에서는 접음
    if (!current.moved) {
      setSheetRatio(at === STOPS.length - 1 ? SHEET.collapsed : STOPS[at + 1]);
      return;
    }
    // 끌어올렸으면 한 단 올리고 내렸으면 한 단 내리고, 거의 안 움직였으면 되돌림
    setSheetRatio((value) => {
      if (value > current.startRatio + 0.03) return STOPS[Math.min(at + 1, STOPS.length - 1)];
      if (value < current.startRatio - 0.03) return STOPS[Math.max(at - 1, 0)];
      return current.startRatio;
    });
  };

  // 손잡이는 걷었을 때와 펼쳤을 때 생김새만 다르고 동작은 하나
  const handleProps = {
    onPointerDown: startDrag,
    onPointerMove: onDrag,
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
    style: { touchAction: "none", cursor: "grab" } as const,
  };

  const recenter = () => {
    // iOS 는 탭 처리 안에서만 나침반을 물어볼 수 있어 이 단추를 계기로 씀
    compass.request();
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
        ref={topBarRef}
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
        {/* SEED notification-badge large 사양. 지도 위라 테두리를 둘러 면을 끊음 */}
        <Box position="relative">
          <ContextualFloatingButton
            variant="layer"
            layout="iconOnly"
            aria-label={unread > 0 ? `알림, 새 소식 ${unread > 99 ? "99개 이상" : `${unread}개`}` : "알림"}
            asChild
          >
            <Link href="/mine/notifications">
              <Icon svg={<IconBellLine />} />
            </Link>
          </ContextualFloatingButton>
          {unread > 0 ? (
            <HStack
              position="absolute"
              align="center"
              justify="center"
              px="x1"
              borderRadius="full"
              bg="bg.brandSolid"
              borderColor="bg.layerDefault"
              // 단추 테두리에 걸치게 빼야 원형 면에 묻히지 않음
              style={{
                top: "-4px",
                right: "-4px",
                minWidth: "18px",
                height: "18px",
                borderWidth: "2px",
                pointerEvents: "none",
              }}
            >
              <Text textStyle="t1Bold" color="palette.staticWhite">
                {unread > 99 ? "99+" : unread}
              </Text>
            </HStack>
          ) : null}
        </Box>
      </HStack>

      {/* 이 묶음은 시트와 떠 있는 버튼의 자리만 잡음
          면이 없는 곳까지 탭을 먹으면 지도 아래 절반에서 확대와 이동이 듣지 않음 */}
      <VStack
        position="absolute"
        bottom="0"
        left="0"
        right="0"
        zIndex={2}
        gap="x3"
        align="stretch"
        style={{ pointerEvents: "none" }}
      >
        {selected ? null : (
        <VStack
          alignSelf="flex-end"
          width="fit-content"
          align="flex-end"
          gap="x2"
          px="spacingX.globalGutter"
          style={{ pointerEvents: "auto" }}
        >
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

        {hidden ? (
          // 시트를 걷으면 지도만 남고 탭바 위에 이 손잡이 하나만 떠 있음
          <VStack align="center" className="rebirth-above-tabs" style={{ pointerEvents: "auto" }}>
            <HStack
              asChild
              align="center"
              gap="x1"
              px="x4"
              py="x2"
              borderRadius="full"
              bg="bg.layerFloating"
              boxShadow="s2"
            >
              <button type="button" aria-expanded={false} aria-label="목록 펼치기" {...handleProps}>
                <Icon svg={<IconChevronUpLine />} size="x4" color="fg.neutralSubtle" />
                <Text textStyle="t2Bold" color="fg.neutral">
                  제보 {nearby.length}건
                </Text>
              </button>
            </HStack>
          </VStack>
        ) : (
        <VStack
          ref={sheetRef}
          as="section"
          align="stretch"
          gap="x2"
          pb="x5"
          bg="bg.layerFloating"
          borderTopLeftRadius="r5"
          borderTopRightRadius="r5"
          boxShadow="s3"
          style={{ pointerEvents: "auto" }}
        >
          <VStack asChild align="center" pt="x2_5" pb="x0_5">
            <button
              type="button"
              aria-expanded={expanded}
              aria-label={expanded ? "목록 접기" : "목록 펼치기"}
              {...handleProps}
            >
              <Box width="x9" height="x1" borderRadius="full" bg="bg.neutralWeak" />
            </button>
          </VStack>

          <HStack px="spacingX.globalGutter" justify="space-between" align="center" gap="x2">
            <Text textStyle="t5Bold" color="fg.neutral" maxLines={1}>
              {!ready
                ? "최근 발견 제보"
                : widened
                  ? "가까운 발견 제보"
                  : `${geocode.result?.areaName ?? "근처"} 반경 ${NEARBY_RADIUS_KM}km`}
            </Text>
            <Text textStyle="t3Regular" color="fg.neutralMuted">
              {nearby.length}건
            </Text>
          </HStack>

          <NearbyList items={nearby} height={`${Math.round(sheetRatio * 100)}dvh`} />
        </VStack>
        )}
      </VStack>
    </Box>
  );
}
