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
import { Box, HStack, Icon, ImageFrame, PrefixIcon, Text, VStack } from "@seed-design/react";
import {
  IconBellLine,
  IconChevronUpLine,
  IconCrosshairLine,
  IconHospitalcrossShieldLine,
  IconMagnifyingglassLine,
  IconMegaphoneLine,
  IconPawprintFill,
  IconPlusLine,
} from "@karrotmarket/react-monochrome-icon";
import { Marker, Popup, type GeoJSONSource, type MapMouseEvent } from "maplibre-gl";
import { distanceKm, type LatLng } from "@rebirth/core/location/geo";
import { Callout } from "seed-design/ui/callout";
import { ContextualFloatingButton } from "seed-design/ui/contextual-floating-button";
import { FloatingActionButton } from "seed-design/ui/floating-action-button";
import { Snackbar, useSnackbarAdapter } from "seed-design/ui/snackbar";

import { describeAnimal } from "@/lib/report-label";
import { useCurrentPosition } from "@/hooks/use-current-position";
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

// 색은 상황만 알리고 무엇인지는 사진이 알림
// 단색 위 글자와 아이콘은 SEED 가 제 컴포넌트에서 쓰는 대로 흰색, 노랑만 검정
// fg.*Contrast 는 같은 색조의 한 단계 진한 색이라 단색 위에 올리면 묻힘
const PIN_TONE = {
  lost: { bg: "bg.warningSolid", fg: "palette.staticBlackAlpha900" },
  injured: { bg: "bg.criticalSolid", fg: "palette.staticWhite" },
  inCare: { bg: "bg.informativeSolid", fg: "palette.staticWhite" },
  roaming: { bg: "bg.brandSolid", fg: "palette.staticWhite" },
} as const;

function toneOf(item: MapMarker) {
  // 실종이 먼저. 보호자가 찾는 중인 동물은 다른 상황 표시에 묻히면 안 됨
  if (item.kind === "lost") return PIN_TONE.lost;
  if (item.injury === true) return PIN_TONE.injured;
  if (item.careSituation === "in_care") return PIN_TONE.inCare;
  return PIN_TONE.roaming;
}

type PinTone = (typeof PIN_TONE)[keyof typeof PIN_TONE];

// ImageFrame 은 사진이 닿기 전과 실패했을 때 img 를 지워 자리가 비므로 그동안 세울 것
function PawFallback({ tone }: { tone: PinTone }) {
  return (
    <VStack align="center" justify="center" height="full" borderRadius="full">
      <Icon svg={<IconPawprintFill />} size="x4" color={tone.fg} />
    </VStack>
  );
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
        aria-label={`${item.petName || describeAnimal(item)} ${item.kind === "lost" ? "실종 신고" : "제보"} 미리 보기`}
        aria-pressed={selected}
        onClick={() => onSelect(item)}
      >
        {item.photoUrl ? (
          // 지도는 화면에 든 것만 핀으로 만들어 이미 걸러져 있음
          // lazy 를 걸면 마커가 transform 으로 얹혀 있어 브라우저가 화면에 든 줄 모르고 사진을 안 받음
          <ImageFrame
            ratio={1}
            width="full"
            src={item.photoUrl}
            alt=""
            borderRadius="full"
            decoding="async"
            fallback={<PawFallback tone={tone} />}
          />
        ) : (
          <PawFallback tone={tone} />
        )}
      </button>
    </Box>
  );
}

// 클러스터 묶기는 지도에 맡기고 그리기는 SEED 로 함, 레이어 paint 는 토큰을 읽지 못함
const PIN_SOURCE = "report-pins";

// 타일이 만들어져야 화면에 보이는 것을 물어볼 수 있어 두는 보이지 않는 한 장
const PIN_PROBE_LAYER = "report-pins-probe";

// 이 축척을 넘으면 묶지 않고 낱개로 보여 줌, 골목 단위에서는 사진이 더 빨리 읽힘
const CLUSTER_MAX_ZOOM = 15;

// 묶는 반경(px). 핀 지름의 두 배쯤이라 겹쳐 보이는 것만 묶임
const CLUSTER_RADIUS_PX = 56;

type ClusterPinProps = {
  count: number;
  /** 묶음을 대표할 제보. 지도에서 사진이 사라지지 않게 한 장을 세움 */
  item: MapMarker | null;
  onClick: () => void;
};

function ClusterPin({ count, item, onClick }: ClusterPinProps) {
  // 묶인 수가 많을수록 크게 그려 어디에 몰려 있는지 축척을 바꾸기 전에 보이게 함
  const size = count >= 100 ? "x14" : count >= 10 ? "x12" : "x10";
  const tone = item ? toneOf(item) : PIN_TONE.roaming;
  return (
    <Box position="relative" width={size} height={size}>
      <Box
        asChild
        width="full"
        height="full"
        p="x0_5"
        borderRadius="full"
        borderWidth="2px"
        borderColor="bg.layerFloating"
        bg={tone.bg}
        boxShadow="s2"
      >
        <button type="button" aria-label={`제보 ${count}건 묶음, 눌러서 확대`} onClick={onClick}>
          {item?.photoUrl ? (
            <ImageFrame
              ratio={1}
              width="full"
              src={item.photoUrl}
              alt=""
              borderRadius="full"
              decoding="async"
              fallback={<PawFallback tone={tone} />}
            />
          ) : (
            <PawFallback tone={tone} />
          )}
        </button>
      </Box>
      {/* 겹쳐 있는 수는 사진을 가리지 않게 모서리에 작게 붙임 */}
      <HStack
        position="absolute"
        align="center"
        justify="center"
        px="x1"
        borderRadius="full"
        bg="bg.brandSolid"
        borderColor="bg.layerFloating"
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
          {count > 99 ? "99+" : count}
        </Text>
      </HStack>
    </Box>
  );
}

// 화면에 실제로 그릴 것. 낱개도 묶음도 사진 핀, 묶음에만 수 배지가 붙음
type Pin =
  | { kind: "report"; key: string; el: HTMLElement; item: MapMarker }
  | {
      kind: "cluster";
      key: string;
      el: HTMLElement;
      id: number;
      count: number;
      at: LatLng;
      // 대표 제보는 지도에 물어봐야 알 수 있어 그린 뒤에 채움
      item: MapMarker | null;
    };

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
  const { containerRef, status, error, center, radiusKm, moveTo, map } = useMap();

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
  // 천 건이 넘어 낱개로 다 그리면 폰에서 버벅여 지도에 묶게 하고 보이는 것만 그림
  const [pins, setPins] = useState<Pin[]>([]);
  useEffect(() => {
    if (!map) return;
    const byId = new Map(markers.map((item) => [item.id, item]));
    const data = {
      type: "FeatureCollection" as const,
      features: markers.map((item) => ({
        type: "Feature" as const,
        properties: { id: item.id },
        geometry: { type: "Point" as const, coordinates: [item.point.lng, item.point.lat] },
      })),
    };

    const source = map.getSource(PIN_SOURCE) as GeoJSONSource | undefined;
    if (source) source.setData(data);
    else {
      map.addSource(PIN_SOURCE, {
        type: "geojson",
        data,
        cluster: true,
        clusterRadius: CLUSTER_RADIUS_PX,
        clusterMaxZoom: CLUSTER_MAX_ZOOM,
      });
      map.addLayer({
        id: PIN_PROBE_LAYER,
        type: "circle",
        source: PIN_SOURCE,
        paint: { "circle-radius": 1, "circle-opacity": 0 },
      });
    }

    let drawn: Marker[] = [];
    const redraw = () => {
      if (!map.getLayer(PIN_PROBE_LAYER)) return;
      const features = map.queryRenderedFeatures({ layers: [PIN_PROBE_LAYER] });
      for (const marker of drawn) marker.remove();
      drawn = [];

      const next: Pin[] = [];
      const seen = new Set<string>();
      for (const feature of features) {
        if (feature.geometry.type !== "Point") continue;
        const props = feature.properties ?? {};
        const key = props.cluster ? `c${props.cluster_id}` : `r${props.id}`;
        // 타일 경계에 걸친 것은 두 번 올라옴
        if (seen.has(key)) continue;
        seen.add(key);

        const [lng, lat] = feature.geometry.coordinates as [number, number];
        const el = document.createElement("div");
        el.dataset.reportPin = "";
        drawn.push(new Marker({ element: el, anchor: "center" }).setLngLat([lng, lat]).addTo(map));

        if (props.cluster) {
          next.push({
            kind: "cluster",
            key,
            el,
            id: props.cluster_id as number,
            count: props.point_count as number,
            at: { lat, lng },
            item: null,
          });
          continue;
        }
        const item = byId.get(props.id as string);
        if (item) next.push({ kind: "report", key, el, item });
      }
      // 마커 요소는 지도가 만든 뒤에야 존재해 포털 대상은 마운트 후 넣음
      setPins(next);
      void fillClusterPhotos(next);
    };

    // 묶음에 세울 사진은 지도에게 물어봐야 알 수 있어 핀을 그린 뒤에 채움
    let turn = 0;
    const fillClusterPhotos = async (pins: Pin[]) => {
      const clusters = pins.filter((pin) => pin.kind === "cluster");
      if (clusters.length === 0) return;
      const clustered = map.getSource(PIN_SOURCE) as GeoJSONSource | undefined;
      if (!clustered) return;

      const mine = ++turn;
      await Promise.all(
        clusters.map(async (pin) => {
          // 사진 없는 제보가 앞에 설 수 있어 몇 장 받아 첫 사진을 고름
          const leaves = await clustered.getClusterLeaves(pin.id, 4, 0).catch(() => []);
          const items = leaves
            .map((leaf) => byId.get(leaf.properties?.id as string))
            .filter((item): item is MapMarker => Boolean(item));
          pin.item = items.find((item) => item.photoUrl) ?? items[0] ?? null;
        }),
      );
      // 그사이 지도가 움직였으면 이미 다른 핀이 올라와 있음
      if (mine === turn) setPins([...pins]);
    };

    // 묶음은 축척과 위치에 따라 다시 계산돼 화면이 멈출 때마다 새로 읽음
    const onSourceData = (event: { sourceId?: string; isSourceLoaded?: boolean }) => {
      if (event.sourceId === PIN_SOURCE && event.isSourceLoaded) redraw();
    };
    map.on("moveend", redraw);
    map.on("sourcedata", onSourceData);
    redraw();

    return () => {
      map.off("moveend", redraw);
      map.off("sourcedata", onSourceData);
      for (const marker of drawn) marker.remove();
      setPins([]);
    };
  }, [map, markers]);

  // 묶음을 누르면 그 묶음이 풀리는 축척까지 당김
  const expandCluster = useCallback(
    (id: number, at: LatLng) => {
      const source = map?.getSource(PIN_SOURCE) as GeoJSONSource | undefined;
      if (!source) return;
      source
        .getClusterExpansionZoom(id)
        .then((zoom) => moveTo(at, { animate: true, zoom }))
        .catch(() => undefined);
    },
    [map, moveTo],
  );

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
  // 반경 안이 비면 가까운 순으로 몇 건 올려 줌, 빈 화면은 둘러볼 거리를 주지 않음
  const { nearby, widened } = useMemo(() => {
    if (!ready) return { nearby: markers, widened: false };
    const inRadius = markers.filter((item) => distanceKm(center, item.point) <= radiusKm);
    if (inRadius.length > 0) return { nearby: inRadius, widened: false };
    const sorted = [...markers]
      .map((item) => ({ item, km: distanceKm(center, item.point) }))
      .sort((a, b) => a.km - b.km)
      .slice(0, NEARBY_FALLBACK_COUNT)
      .map((row) => row.item);
    return { nearby: sorted, widened: sorted.length > 0 };
  }, [ready, center, radiusKm, markers]);

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

      {pins.map((pin) =>
        createPortal(
          pin.kind === "cluster" ? (
            <ClusterPin
              count={pin.count}
              item={pin.item}
              onClick={() => expandCluster(pin.id, pin.at)}
            />
          ) : (
            <ReportPin
              item={pin.item}
              selected={pin.item.id === selectedId}
              onSelect={selectPin}
            />
          ),
          pin.el,
          pin.key,
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

      <VStack
        ref={topBarRef}
        position="absolute"
        top="0"
        left="0"
        right="0"
        zIndex={3}
        px="spacingX.globalGutter"
        pt="x3"
        gap="x2"
        align="stretch"
        // 면이 없는 자리까지 탭을 먹으면 지도 위쪽에서 확대와 이동이 듣지 않음
        style={{ pointerEvents: "none" }}
      >
      <HStack gap="x2" align="center" style={{ pointerEvents: "auto" }}>
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

      {/* 첫 화면에서 무엇을 하는 곳인지 읽히도록 급한 일 둘을 지도 위에 올림
          제보하기는 아래 떠 있는 단추가 이미 가지고 있어 여기서 빼둠 */}
      <HStack gap="x2" align="center" width="fit-content" style={{ pointerEvents: "auto" }}>
        <ContextualFloatingButton variant="layer" asChild>
          <Link href="/lost/new">
            <PrefixIcon svg={<IconMegaphoneLine />} />
            우리 아이 찾기
          </Link>
        </ContextualFloatingButton>
        <ContextualFloatingButton variant="layer" asChild>
          <Link href="/guide/injured">
            <PrefixIcon svg={<IconHospitalcrossShieldLine />} />
            다친 동물
          </Link>
        </ContextualFloatingButton>
      </HStack>
      </VStack>

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
                ? "최근 제보"
                : widened
                  ? "가까운 제보"
                  : `${geocode.result?.areaName ?? "근처"} 반경 ${Math.max(1, Math.round(radiusKm))}km`}
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
