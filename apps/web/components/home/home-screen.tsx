"use client";

import Link from "next/link";
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import { Box, Grid, HStack, Icon, ImageFrame, PrefixIcon, Text, VStack } from "@seed-design/react";
import {
  IconBellLine,
  IconCameraLine,
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

import { reconcilePins } from "@/lib/pin-registry";
import { describeAnimal } from "@/lib/report-label";
import { SHORTCUTS } from "@/lib/shortcuts";
import { useCurrentPosition } from "@/hooks/use-current-position";
import { useDeviceHeading } from "@/hooks/use-device-heading";
import { useMap } from "@/hooks/use-map";
import { useMyLocationMarker } from "@/hooks/use-my-location-marker";
import { useReverseGeocode } from "@/hooks/use-reverse-geocode";
import { MapPreviewCard } from "@/components/home/map-preview-card";
import { holdKeyboard } from "@/components/ui/keyboard-bridge";
import { NearbyList } from "@/components/home/nearby-list";
import { WriteActionSheet } from "@/components/home/write-action-sheet";
import type { ReportCardItem } from "@/components/report/report-card";

// 지도가 맨 아래, 그 위에 시트, 맨 위에 떠 있는 내비게이션을 겹치는 첫 화면

export type MapMarker = ReportCardItem & {
  // 격자 스냅한 공개용 좌표, 정확한 목격 지점이 아님
  point: LatLng;
};

// 반경 안에 하나도 없을 때 대신 보여 줄 가까운 제보 수
const NEARBY_FALLBACK_COUNT = 12;

// 훅의 문구는 제보 폼 기준이라 동이나 면을 고르라고 말함
// 홈 지도에는 고를 자리가 없어 이 화면에서 할 수 있는 일로 바꿔 알림
// 첫 줄은 무슨 일인지, 둘째 줄은 지금 할 일 하나. 현재 위치 를 되풀이하지 않고 위치 로 줄임
const POSITION_NOTICE: Record<"denied" | "timeout" | "unavailable", string> = {
  denied: "위치 권한 없이도 둘러볼 수 있어요\n지도를 움직여 동네를 찾아보세요",
  timeout: "위치를 확인하는 데 오래 걸려요\n지도를 움직여 동네를 찾아보세요",
  unavailable: "위치를 확인할 수 없어요\n지도를 움직여 동네를 찾아보세요",
};

// 첫 행동을 마쳤는지 적어 두는 자리, 안내 한 줄과 시트 머리 타일이 같이 접힘
const SEEN_INTRO_KEY = "rebirth:seen-intro";

function readSeenIntro(): boolean {
  try {
    return localStorage.getItem(SEEN_INTRO_KEY) !== null;
  } catch {
    // 저장이 막힌 브라우저는 늘 첫 방문으로 보고 안내만 한 번 더 그림
    return false;
  }
}

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

// 지도가 움직일 때마다 화면이 다시 그려져 값이 같은 핀은 건너뜀. 핀 요소는 장부가 붙들어 마운트가 유지됨
const ReportPin = memo(function ReportPin({ item, selected, onSelect }: ReportPinProps) {
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
});

// 클러스터 묶기는 지도에 맡기고 그리기는 SEED 로 함, 레이어 paint 는 토큰을 읽지 못함
const PIN_SOURCE = "report-pins";

// 타일이 만들어져야 화면에 보이는 것을 물어볼 수 있어 두는 보이지 않는 한 장
const PIN_PROBE_LAYER = "report-pins-probe";

// 이 축척을 넘으면 묶지 않고 낱개로 보여 줌, 골목 단위에서는 사진이 더 빨리 읽힘
const CLUSTER_MAX_ZOOM = 15;

// 묶는 반경(px). 핀 지름의 두 배쯤이라 겹쳐 보이는 것만 묶임
const CLUSTER_RADIUS_PX = 56;

type ClusterPinProps = {
  id: number;
  at: LatLng;
  count: number;
  /** 묶음을 대표할 제보. 지도에서 사진이 사라지지 않게 한 장을 세움 */
  item: MapMarker | null;
  onExpand: (id: number, at: LatLng) => void;
};

const ClusterPin = memo(function ClusterPin({ id, at, count, item, onExpand }: ClusterPinProps) {
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
        <button
          type="button"
          aria-label={`제보 ${count}건 묶음, 눌러서 확대`}
          onClick={() => onExpand(id, at)}
        >
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
});

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

// 장부 한 줄. 지도에 올린 마커와 포털이 그릴 핀을 함께 붙듦
type PinEntry = { pin: Pin; marker: Marker };

// 타일에서 읽은 것을 장부와 맞출 때 넘기는 값
type PinFeature =
  | { kind: "report"; item: MapMarker; at: LatLng }
  | { kind: "cluster"; id: number; count: number; at: LatLng };

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

  const snackbar = useSnackbarAdapter();
  // 첫 자리를 잡은 뒤에도 따라가 걸으면서 보는 지도에서 점이 함께 움직임
  const position = useCurrentPosition({ immediate: true, watch: true });
  // 방향은 GPS 가 아니라 자기 센서, 서 있어도 몸을 돌리면 부채꼴이 따라옴
  const heading = useDeviceHeading();
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
  // 천 건이 넘어 낱개로 다 그리면 폰에서 버벅여 지도에 묶게 하고 타일이 실린 구간만 그림
  const [pins, setPins] = useState<Pin[]>([]);
  // 지도에 올라간 핀 장부. 키가 같은 핀은 요소를 그대로 두어 지도가 움직여도 다시 마운트되지 않음
  // 매번 지우고 새로 만들면 포털 대상이 바뀌어 React 가 핀을 다시 마운트하고 사진이 한 프레임 비어 깜빡임
  const registry = useRef(new Map<string, PinEntry>());
  const byIdRef = useRef(new Map<string, MapMarker>());

  useEffect(() => {
    if (!map) return;
    const book = registry.current;

    // 장부에서 지금 핀 목록을 뽑아 화면에 넘김. 순서는 포털 키가 있어 뜻이 없음
    const publish = () => setPins(Array.from(book.values(), (entry) => entry.pin));

    // 묶음에 세울 사진은 지도에게 물어봐야 알 수 있어 핀을 올린 뒤에 채움
    const fillClusterPhotos = async (keys: string[]) => {
      const source = map.getSource(PIN_SOURCE) as GeoJSONSource | undefined;
      if (!source || keys.length === 0) return;
      let filled = 0;
      await Promise.all(
        keys.map(async (key) => {
          const entry = book.get(key);
          if (!entry || entry.pin.kind !== "cluster") return;
          // 사진 없는 제보가 앞에 설 수 있어 몇 장 받아 첫 사진을 고름
          const leaves = await source.getClusterLeaves(entry.pin.id, 4, 0).catch(() => []);
          const items = leaves
            .map((leaf) => byIdRef.current.get(leaf.properties?.id as string))
            .filter((item): item is MapMarker => Boolean(item));
          const item = items.find((candidate) => candidate.photoUrl) ?? items[0] ?? null;
          // 그사이 지도가 움직여 장부에서 빠졌으면 버림
          const current = book.get(key);
          if (!current || current.pin.kind !== "cluster" || !item) return;
          current.pin = { ...current.pin, item };
          filled += 1;
        }),
      );
      if (filled > 0) publish();
    };

    const redraw = () => {
      if (!map.getLayer(PIN_PROBE_LAYER)) return;
      // 화면에 그려진 것만 물으면 가장자리를 넘는 순간 지워져 되돌아올 때 새로 만듦
      // 실린 타일 전체를 물어 뷰포트 둘레에 여유를 두고 붙들어 둠
      const features = map.querySourceFeatures(PIN_SOURCE);
      const incoming: { key: string; feature: PinFeature }[] = [];
      for (const feature of features) {
        if (feature.geometry.type !== "Point") continue;
        const props = feature.properties ?? {};
        const [lng, lat] = feature.geometry.coordinates as [number, number];
        const at = { lat, lng };
        if (props.cluster) {
          incoming.push({
            key: `c${props.cluster_id}`,
            feature: {
              kind: "cluster",
              id: props.cluster_id as number,
              count: props.point_count as number,
              at,
            },
          });
          continue;
        }
        const item = byIdRef.current.get(props.id as string);
        if (item) incoming.push({ key: `r${item.id}`, feature: { kind: "report", item, at } });
      }

      const result = reconcilePins(book, incoming, {
        create: (feature) => {
          const el = document.createElement("div");
          el.dataset.reportPin = "";
          const marker = new Marker({ element: el, anchor: "center" })
            .setLngLat([feature.at.lng, feature.at.lat])
            .addTo(map);
          const key = feature.kind === "cluster" ? `c${feature.id}` : `r${feature.item.id}`;
          const pin: Pin =
            feature.kind === "cluster"
              ? { kind: "cluster", key, el, id: feature.id, count: feature.count, at: feature.at, item: null }
              : { kind: "report", key, el, item: feature.item };
          return { pin, marker };
        },
        update: (entry, feature) => {
          let changed = false;
          // 같은 묶음도 타일에 따라 좌표가 조금 다를 수 있어 요소는 두고 자리만 옮김
          const here = entry.marker.getLngLat();
          if (here.lng !== feature.at.lng || here.lat !== feature.at.lat) {
            entry.marker.setLngLat([feature.at.lng, feature.at.lat]);
          }
          if (entry.pin.kind === "cluster" && feature.kind === "cluster") {
            if (entry.pin.count !== feature.count || entry.pin.at !== feature.at) {
              entry.pin = { ...entry.pin, count: feature.count, at: feature.at };
              changed = true;
            }
          } else if (entry.pin.kind === "report" && feature.kind === "report") {
            if (entry.pin.item !== feature.item) {
              entry.pin = { ...entry.pin, item: feature.item };
              changed = true;
            }
          }
          return changed;
        },
        remove: (entry) => entry.marker.remove(),
      });

      if (result.created + result.updated + result.removed === 0) return;
      publish();
      void fillClusterPhotos(
        result.entries
          .filter((entry) => entry.pin.kind === "cluster" && entry.pin.item === null)
          .map((entry) => entry.pin.key),
      );
    };

    // sourcedata 는 타일마다 오고 moveend 와 겹치기도 해 한 프레임에 한 번만 맞춤
    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        redraw();
      });
    };
    const onSourceData = (event: { sourceId?: string; isSourceLoaded?: boolean }) => {
      if (event.sourceId === PIN_SOURCE && event.isSourceLoaded) schedule();
    };
    map.on("moveend", schedule);
    map.on("sourcedata", onSourceData);
    schedule();

    return () => {
      if (frame) cancelAnimationFrame(frame);
      map.off("moveend", schedule);
      map.off("sourcedata", onSourceData);
      for (const entry of book.values()) entry.marker.remove();
      book.clear();
    };
  }, [map]);

  // 마커 데이터를 지도 소스에 넣음. 다시 그리는 일은 sourcedata 가 위 effect 를 깨워 맡음
  useEffect(() => {
    if (!map) return;
    byIdRef.current = new Map(markers.map((item) => [item.id, item]));
    const data = {
      type: "FeatureCollection" as const,
      features: markers.map((item) => ({
        type: "Feature" as const,
        properties: { id: item.id },
        geometry: { type: "Point" as const, coordinates: [item.point.lng, item.point.lat] },
      })),
    };

    const source = map.getSource(PIN_SOURCE) as GeoJSONSource | undefined;
    if (source) {
      // 데이터가 바뀌면 묶음 번호가 다시 매겨져 묶음 핀은 장부에서 지움. 낱개는 키가 id 라 그대로 둠
      for (const [key, entry] of registry.current) {
        if (entry.pin.kind !== "cluster") continue;
        entry.marker.remove();
        registry.current.delete(key);
      }
      source.setData(data);
      return;
    }
    map.addSource(PIN_SOURCE, {
      type: "geojson",
      data,
      cluster: true,
      clusterRadius: CLUSTER_RADIUS_PX,
      clusterMaxZoom: CLUSTER_MAX_ZOOM,
    });
    // 소스를 쓰는 레이어가 있어야 타일이 실리고 물어볼 수 있음
    map.addLayer({
      id: PIN_PROBE_LAYER,
      type: "circle",
      source: PIN_SOURCE,
      paint: { "circle-radius": 1, "circle-opacity": 0 },
    });
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

  useMyLocationMarker({
    map,
    point: position.point,
    accuracyMeters: position.accuracyMeters,
    course: position.course,
    heading,
  });

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

  // 떠 있는 단추가 여는 쓰기 시트. 지도 위 알약을 대신함
  const [writeOpen, setWriteOpen] = useState(false);

  const [sheetRatio, setSheetRatio] = useState<number>(SHEET.collapsed);

  // 서버에는 저장소가 없어 첫 그림에서는 판정을 미루고 안내를 그리지 않음
  const [seenIntro, setSeenIntro] = useState<boolean | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSeenIntro(readSeenIntro());
  }, []);

  const markIntroSeen = useCallback(() => {
    setSeenIntro(true);
    try {
      localStorage.setItem(SEEN_INTRO_KEY, "1");
    } catch {
      // 저장이 막혀도 이 세션 동안은 접힌 채로 둠
    }
  }, []);

  // 판정 전에는 null 이라 안내와 타일 둘 다 자리를 잡지 않음
  const firstVisit = seenIntro === false;

  // 핀을 고르면 지도 위 말풍선으로 요약을 띄움
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(
    () => markers.find((item) => item.id === selectedId) ?? null,
    [markers, selectedId],
  );

  // 말풍선을 닫을 때 돌려놓을 직전 화면, 핀을 옮겨 골라도 처음 값을 지킴
  const beforePreview = useRef<{ point: LatLng; zoom: number } | null>(null);

  // 핀이 memo 라 같은 함수를 넘겨야 지도가 움직일 때 핀이 다시 그려지지 않음
  const selectPin = useCallback(
    (item: MapMarker) => {
      if (map && !beforePreview.current) {
        const at = map.getCenter();
        beforePreview.current = { point: { lat: at.lat, lng: at.lng }, zoom: map.getZoom() };
      }
      setSelectedId(item.id);
      setSheetRatio(SHEET.hidden);
      moveTo(item.point, { animate: true, zoom: PIN_ZOOM, offset: PIN_OFFSET });
    },
    [map, moveTo],
  );

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

  // 끄는 동안은 상태를 바꾸지 않고 시트 요소만 transform 으로 옮김
  // 높이를 상태로 갈면 손가락이 움직일 때마다 화면 전체가 다시 그려지고 목록이 레이아웃을 다시 돎
  // transform 은 합성만 하고, 손을 뗄 때 한 번 단계에 붙이며 상태를 바꿈
  const drag = useRef<{
    startY: number;
    startRatio: number;
    moved: boolean;
    /** 위로 끌 수 있는 최대 px, 시트를 이만큼 아래로 늘려 두어 끌어올려도 바닥이 비지 않음 */
    reach: number;
    /** 지금까지 옮긴 px, 아래가 양수 */
    shift: number;
    frame: number;
  } | null>(null);

  const startDrag = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      const height = window.innerHeight;
      const reach = Math.max(0, (SHEET.max - sheetRatio) * height);
      drag.current = { startY: event.clientY, startRatio: sheetRatio, moved: false, reach, shift: 0, frame: 0 };
      event.currentTarget.setPointerCapture(event.pointerId);

      const sheet = sheetRef.current;
      if (!sheet) return;
      // 아래 여백을 늘리고 같은 만큼 음수 마진을 줘 겉모습과 위 단추 자리는 그대로 두고 상자만 아래로 늘림
      const padding = Number.parseFloat(getComputedStyle(sheet).paddingBottom) || 0;
      sheet.style.marginBottom = `${-reach}px`;
      sheet.style.paddingBottom = `${padding + reach}px`;
      sheet.style.willChange = "transform";
    },
    [sheetRatio],
  );

  const onDrag = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    const current = drag.current;
    if (!current) return;
    const dy = event.clientY - current.startY;
    if (Math.abs(dy) > 4) current.moved = true;
    const height = window.innerHeight;
    // 아래로는 min 까지, 위로는 max 까지만
    const floor = (current.startRatio - SHEET.min) * height;
    current.shift = Math.max(-current.reach, Math.min(dy, floor));

    const sheet = sheetRef.current;
    if (!sheet || current.frame) return;
    // 포인터 이벤트는 프레임보다 잦아 한 프레임에 한 번만 씀
    current.frame = requestAnimationFrame(() => {
      current.frame = 0;
      sheet.style.transform = `translateY(${current.shift}px)`;
    });
  }, []);

  const endDrag = useCallback(() => {
    const current = drag.current;
    if (!current) return;
    drag.current = null;
    if (current.frame) cancelAnimationFrame(current.frame);

    const sheet = sheetRef.current;
    if (sheet) {
      sheet.style.transform = "";
      sheet.style.marginBottom = "";
      sheet.style.paddingBottom = "";
      sheet.style.willChange = "";
    }

    const at = Math.max(0, STOPS.indexOf(current.startRatio));
    // 움직이지 않았으면 탭으로 보고 한 단 올리되 맨 위에서는 접음
    if (!current.moved) {
      setSheetRatio(at === STOPS.length - 1 ? SHEET.collapsed : STOPS[at + 1]);
      return;
    }
    // 끌어올렸으면 한 단 올리고 내렸으면 한 단 내리고, 거의 안 움직였으면 되돌림
    const value = current.startRatio - current.shift / window.innerHeight;
    if (value > current.startRatio + 0.03) {
      setSheetRatio(STOPS[Math.min(at + 1, STOPS.length - 1)]);
    } else if (value < current.startRatio - 0.03) {
      setSheetRatio(STOPS[Math.max(at - 1, 0)]);
    } else {
      setSheetRatio(current.startRatio);
    }
  }, []);

  // 손잡이는 걷었을 때와 펼쳤을 때 생김새만 다르고 동작은 하나
  const handleProps = useMemo(
    () => ({
      onPointerDown: startDrag,
      onPointerMove: onDrag,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
      style: { touchAction: "none", cursor: "grab" } as const,
    }),
    [startDrag, onDrag, endDrag],
  );

  const recenter = () => {
    // iOS 는 사용자가 누른 안에서만 자기 센서 권한을 물을 수 있어 이 탭에 얹음
    if (heading.status === "needs-gesture") heading.enable();
    if (position.point) {
      moveTo(position.point, { animate: true });
      return;
    }
    const failed = POSITION_NOTICE[position.status as keyof typeof POSITION_NOTICE];
    if (failed) {
      notice(failed);
      return;
    }
    position.request();
  };

  return (
    // 시트를 끄는 동안 아래로 늘린 상자가 화면 밖으로 나가도 문서가 스크롤되지 않게 가둠
    <Box position="relative" height="100dvh" bg="bg.layerDefault" style={{ overflow: "clip" }}>
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
              id={pin.id}
              at={pin.at}
              count={pin.count}
              item={pin.item}
              onExpand={expandCluster}
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
          {/* 터치 안에서 키보드를 올려 두어야 다음 화면의 autoFocus 가 키보드까지 이어 받음 */}
          <Link href="/search" aria-label="제보 검색" onClick={holdKeyboard}>
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

      {firstVisit ? (
        // 첫 방문에만 뜨는 한 줄, 아래 단추 셋이 무엇을 하는 자리인지 먼저 말함
        <HStack
          align="center"
          width="fit-content"
          px="x3"
          py="x2"
          borderRadius="r3"
          bg="bg.layerFloating"
          boxShadow="s2"
          style={{ pointerEvents: "auto" }}
        >
          <Text textStyle="t3Regular" color="fg.neutral">
            동물을 봤거나 잃어버렸으면 여기서 시작해요
          </Text>
        </HStack>
      ) : null}

      {/* 첫 화면에서 무엇을 하는 곳인지 읽히도록 급한 일 셋을 지도 위에 올림
          좁은 화면에서는 글자를 줄이지 않고 가로로 넘김. 여백을 뚫고 화면 끝까지 나가
          첫 단추는 본문 선에서 시작하고 마지막 단추가 끝에 걸쳐 보여 더 있다는 것이 읽힘
          넘기는 상자에 pointer-events none 을 걸면 iOS 가 스크롤 대상으로 잡지 않아 상자가 탭을 받음
          대신 폭을 내용에 맞추고 화면 폭으로만 제한해, 다 들어오는 화면에서는 오른쪽 빈 띠가 지도에 남음
          위아래 여백은 잘리는 그림자 자리 */}
      <Box
        className="rebirth-scroll-row rebirth-bleed"
        py="x2"
        bleedY="x2"
        style={{
          pointerEvents: "auto",
          whiteSpace: "nowrap",
          width: "fit-content",
          // 폭 제한이 안쪽 여백까지 세어야 상자가 화면 밖으로 나가지 않음
          boxSizing: "border-box",
          maxWidth: "calc(100% + 2 * var(--seed-dimension-spacing-x-global-gutter))",
        }}
      >
        <HStack gap="x2" align="center" width="fit-content">
          <ContextualFloatingButton variant="layer" asChild>
            <Link href="/lost/new" onClick={markIntroSeen}>
              <PrefixIcon svg={<IconMegaphoneLine />} />
              우리 아이 찾기
            </Link>
          </ContextualFloatingButton>
          <ContextualFloatingButton variant="layer" asChild>
            <Link href="/report" onClick={markIntroSeen}>
              <PrefixIcon svg={<IconCameraLine />} />
              발견동물 제보
            </Link>
          </ContextualFloatingButton>
          <ContextualFloatingButton variant="layer" asChild>
            <Link href="/guide/injured" onClick={markIntroSeen}>
              <PrefixIcon svg={<IconHospitalcrossShieldLine />} />
              다친 동물
            </Link>
          </ContextualFloatingButton>
        </HStack>
      </Box>
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
          {/* 글을 남기는 길 셋을 이 단추 하나에 모음
              엄지가 닿는 자리라 급할 때 한 손으로 고를 수 있음
              누르면 고르는 시트가 열리므로 라벨도 제보하기 가 아니라 알리기 로 둠 */}
          <FloatingActionButton
            icon={<IconPlusLine />}
            label="알리기"
            aria-haspopup="dialog"
            aria-expanded={writeOpen}
            onClick={() => setWriteOpen(true)}
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

          {firstVisit && !expanded ? (
            // 첫 행동 전에만 머리에 두는 타일 셋, 누르면 접혀 목록 머리가 올라옴
            <Grid columns={3} gap="x2" px="spacingX.globalGutter">
              {SHORTCUTS.map((item) => (
                <VStack
                  key={item.href}
                  asChild
                  align="center"
                  gap="x2"
                  py="x4"
                  borderRadius="r2"
                  bg="bg.neutralWeak"
                  minWidth="0"
                >
                  <Link href={item.href} className="rebirth-tile" onClick={markIntroSeen}>
                    <Icon svg={item.icon} size="x6" color="fg.brand" />
                    <Text textStyle="t3Bold" color="fg.neutral" maxLines={1}>
                      {item.label}
                    </Text>
                  </Link>
                </VStack>
              ))}
            </Grid>
          ) : null}

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

      <WriteActionSheet open={writeOpen} onOpenChange={setWriteOpen} />
    </Box>
  );
}
