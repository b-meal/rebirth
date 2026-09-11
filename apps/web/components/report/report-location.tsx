"use client";

import { COARSE_GRID_METERS, snapToGrid } from "@rebirth/core/location/geo";
import { useEffect, useState } from "react";
import { Icon, Skeleton, Text, VStack } from "@seed-design/react";
import { IconLocationpinLine } from "@karrotmarket/react-monochrome-icon";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "seed-design/ui/accordion";
import { ActionButton } from "seed-design/ui/action-button";
import { Callout } from "seed-design/ui/callout";
import { TextField, TextFieldInput } from "seed-design/ui/text-field";

import { useCurrentPosition } from "@/hooks/use-current-position";
import { useLocationToken } from "@/hooks/use-location-token";
import { useReverseGeocode } from "@/hooks/use-reverse-geocode";
import { Section } from "@/components/ui/screen";
import { ReportLocationMap } from "./report-location-map";

// 목격 위치를 화면에 들어온 즉시 자동으로 잡는 자리. 사용자가 고르는 입력을 두지 않음
// 좌표는 브라우저에만 남고 서버로 나가는 것은 발급받은 참조뿐임. POL-08

const ITEM = "location";

const BLOCKED_MESSAGE =
  "위치를 알아야 제보할 수 있어요. 설정에서 위치 권한을 켜 주세요";

export type LocationValue = {
  areaName: string | null;
  locationToken: string | null;
  /** 거리 근거로 쓸 수 있는 위치인지. false 면 후보 화면이 정보 부족으로 표시 */
  usableForDistance: boolean;
  /** 찾아갈 단서. 좌표보다 정밀도가 낮아 오히려 안전하고 상세 화면이 그대로 보여줌 */
  landmark: string;
};

export type ReportLocationProps = {
  value: LocationValue;
  onChange: (next: Partial<LocationValue>) => void;
};

export function ReportLocation({ value, onChange }: ReportLocationProps) {
  const position = useCurrentPosition({ immediate: true });
  const geocode = useReverseGeocode(position.point);
  const locationToken = useLocationToken();
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
    <VStack align="stretch" gap="x5">
      <Accordion onValuesChange={(values) => setOpen(values.includes(ITEM))}>
        <AccordionItem value={ITEM}>
          <AccordionTrigger
            title={value.areaName}
            description="지금 있는 위치예요. 눌러서 지도로 확인해요"
            prefix={<Icon svg={<IconLocationpinLine />} />}
          />
          <AccordionContent>
            {/* 상세 화면과 같은 미리보기를 씀. 정확 좌표가 아니라 격자로 스냅한 지점만 넘김 */}
            {open && position.point ? (
              <ReportLocationMap
                point={snapToGrid(position.point, COARSE_GRID_METERS.default)}
                gridMeters={COARSE_GRID_METERS.default}
              />
            ) : null}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <TextField
        label="찾아갈 단서"
        description="사람이 찾아갈 수 있는 단서를 적어 주세요. 정확한 주소는 받지 않아요"
        value={value.landmark}
        maxGraphemeCount={100}
        onValueChange={(next) => onChange({ landmark: next.value })}
      >
        <TextFieldInput placeholder="새터산 12길 CU 근처" />
      </TextField>
    </VStack>
  );
}
