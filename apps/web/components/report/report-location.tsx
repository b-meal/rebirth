"use client";

import { COARSE_GRID_METERS, coarseRadiusMeters } from "@rebirth/core/location/geo";
import { Marker } from "maplibre-gl";
import { useEffect, useState } from "react";
import { AspectRatio, Icon, Skeleton, Text, VStack } from "@seed-design/react";
import { IconLocationpinLine } from "@karrotmarket/react-monochrome-icon";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "seed-design/ui/accordion";
import { ActionButton } from "seed-design/ui/action-button";
import { Callout } from "seed-design/ui/callout";

import { useCurrentPosition } from "@/hooks/use-current-position";
import { useLocationToken } from "@/hooks/use-location-token";
import { useMap } from "@/hooks/use-map";
import { useReverseGeocode } from "@/hooks/use-reverse-geocode";
import { Section } from "@/components/ui/screen";

// 목격 위치를 화면에 들어온 즉시 자동으로 잡는 자리. 사용자가 고르는 입력을 두지 않음
// 좌표는 브라우저에만 남고 서버로 나가는 것은 발급받은 참조뿐임. POL-08

// 반경 원이 화면 폭 안에 읽히는 축척
const MAP_ZOOM = 16;

const ITEM = "location";

const BLOCKED_MESSAGE =
  "위치 권한을 켜야 제보할 수 있어요. 설정에서 위치 접근을 허용한 뒤 다시 시도해 주세요";

// 지도 오버레이는 React 밖에서 그려지므로 색은 SEED CSS 변수로만 참조
function coarseCircleStyle(lat: number): string {
  // 웹 메르카토르 축척, 이 위도에서 픽셀 하나가 덮는 거리
  const metersPerPixel = (156543.03392 * Math.cos((lat * Math.PI) / 180)) / 2 ** MAP_ZOOM;
  const diameter = Math.round(
    (coarseRadiusMeters(COARSE_GRID_METERS.default) * 2) / metersPerPixel,
  );
  return [
    `width:${diameter}px`,
    `height:${diameter}px`,
    "border-radius:9999px",
    "background:var(--seed-color-bg-brand-weak)",
    "border:2px solid var(--seed-color-fg-brand)",
    "opacity:0.75",
  ].join(";");
}

export type LocationValue = {
  areaName: string | null;
  locationToken: string | null;
  /** 거리 근거로 쓸 수 있는 위치인지. false 면 후보 화면이 정보 부족으로 표시 */
  usableForDistance: boolean;
};

export type ReportLocationProps = {
  value: LocationValue;
  onChange: (next: Partial<LocationValue>) => void;
};

export function ReportLocation({ value, onChange }: ReportLocationProps) {
  const position = useCurrentPosition({ immediate: true });
  const geocode = useReverseGeocode(position.point);
  const locationToken = useLocationToken();
  const { containerRef, status, error, map } = useMap();
  const [open, setOpen] = useState(false);

  // 확인된 지역을 서버 참조로 바꿈. 좌표는 여기서 서버로만 나감
  useEffect(() => {
    if (!geocode.result || !position.point) return;
    if (locationToken.status !== "idle") return;

    const areaName = geocode.result.fullName || geocode.result.areaName;
    void locationToken
      .resolve({
        source: "gps",
        lat: position.point.lat,
        lng: position.point.lng,
        ...(position.accuracyMeters !== null && {
          accuracyM: Math.round(position.accuracyMeters),
        }),
        // 현재 위치를 목격 위치로 쓴다는 확인. 이 화면은 그 전제로만 동작함
        confirmedHere: true,
        areaName,
        ...(geocode.result.code && {
          areaCode: geocode.result.code,
          areaCodeSystem: "H" as const,
        }),
      })
      .then((result) => {
        if (!result) return;
        onChange({
          areaName: result.areaName,
          locationToken: result.locationToken,
          usableForDistance: result.usableForDistance,
        });
      });
  }, [geocode.result, position.point, position.accuracyMeters, locationToken, onChange]);

  const point = position.point;
  useEffect(() => {
    if (!map || !point) return;

    map.jumpTo({ center: [point.lng, point.lat], zoom: MAP_ZOOM });
    // 확인 전용 지도. 조작해도 값이 바뀌지 않으므로 조작 자체를 잠금
    map.dragPan.disable();
    map.scrollZoom.disable();
    map.doubleClickZoom.disable();
    map.touchZoomRotate.disable();
    map.keyboard.disable();

    // 정확 지점 대신 공개 격자 반경만 그림
    const circle = document.createElement("div");
    circle.setAttribute("style", coarseCircleStyle(point.lat));
    const marker = new Marker({ element: circle, anchor: "center" })
      .setLngLat([point.lng, point.lat])
      .addTo(map);

    return () => {
      marker.remove();
    };
  }, [map, point]);

  const blocked =
    position.status === "denied" ||
    position.status === "timeout" ||
    position.status === "unavailable" ||
    geocode.error !== null ||
    locationToken.status === "failed";

  if (blocked) {
    return (
      <Section>
        <Callout tone="informative" description={BLOCKED_MESSAGE} />
        <ActionButton
          variant="neutralOutline"
          size="medium"
          onClick={() => {
            locationToken.clear();
            position.request();
          }}
        >
          위치 다시 확인
        </ActionButton>
      </Section>
    );
  }

  if (!value.areaName) {
    return (
      <Section>
        <Text textStyle="t3Regular" color="fg.neutralMuted">
          {position.status === "requesting"
            ? "권한 팝업에서 위치 사용을 확인해 주세요"
            : "목격 위치를 확인하고 있어요"}
        </Text>
        <Skeleton width="60%" height="x8" radius="8" />
      </Section>
    );
  }

  return (
    <Accordion onValuesChange={(values) => setOpen(values.includes(ITEM))}>
      <AccordionItem value={ITEM}>
        <AccordionTrigger
          title={value.areaName}
          description="자동으로 잡은 위치예요. 고칠 수 없어요"
          prefix={<Icon svg={<IconLocationpinLine />} />}
        />
        <AccordionContent>
          <VStack align="stretch" gap="x2">
            {open ? (
              <AspectRatio ratio={4 / 3} borderRadius="r3" bg="bg.neutralWeak">
                {/* MapLibre 가 컨테이너에 position relative 를 걸어 크기 잡는 요소를 따로 둠 */}
                <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
              </AspectRatio>
            ) : null}
            {status === "error" ? (
              <Callout tone="informative" description={error ?? ""} />
            ) : (
              <Text textStyle="t3Regular" color="fg.neutralMuted">
                공개되는 위치는 이 원 안의 한 지점이에요. 정확한 지점은 공개되지 않아요
              </Text>
            )}
          </VStack>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
