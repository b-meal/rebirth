"use client";

import { useEffect, useState } from "react";
import { Button, Flex, Heading, Input, Skeleton, Text } from "@chakra-ui/react";

import { useCurrentPosition } from "@/hooks/use-current-position";
import { useLocationToken } from "@/hooks/use-location-token";
import { usePlaceSearch } from "@/hooks/use-place-search";
import { useReverseGeocode } from "@/hooks/use-reverse-geocode";
import { Chip } from "@/components/ui/chip";
import { PlaceSearchField } from "@/components/ui/place-search-field";
import { SectionMessage } from "@/components/ui/section-message";

// 2단계 위치. 지도 핀과 좌표 표시, 정확 주소 입력란을 만들지 않음
// 좌표는 서버 참조로 바로 바꿔 폼 상태에 숫자를 남기지 않음. POL-08

export type LocationValue = {
  areaName: string | null;
  locationToken: string | null;
  usableForDistance: boolean;
  landmark: string;
};

export type StepLocationProps = {
  value: LocationValue;
  onChange: (next: Partial<LocationValue>) => void;
};

export function StepLocation({ value, onChange }: StepLocationProps) {
  const position = useCurrentPosition();
  const [manual, setManual] = useState(false);
  const search = usePlaceSearch({ mode: "address" });
  const locationToken = useLocationToken();

  const geocode = useReverseGeocode(position.point);

  // 현재 위치로 확인된 지역을 서버 참조로 바꿈. 좌표는 여기서 서버로만 나감
  useEffect(() => {
    if (!geocode.result || !position.point) return;
    if (locationToken.status !== "idle") return;

    const areaName = geocode.result.fullName || geocode.result.areaName;
    void locationToken
      .resolve({
        source: "gps",
        lat: position.point.lat,
        lng: position.point.lng,
        ...(position.accuracyMeters !== null && { accuracyM: Math.round(position.accuracyMeters) }),
        // 현재 위치를 목격 위치로 쓰겠다는 확인. 화면이 이 단계를 거쳐야만 값이 참
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

  const positionFailed = position.status === "denied" || position.status === "unavailable";
  const resolveFailed = locationToken.status === "failed";
  const showManual =
    manual || positionFailed || geocode.error !== null || resolveFailed;
  const requesting = position.status === "requesting";

  return (
    <Flex direction="column" gap="4">
      <Heading size="lg">어디에서 봤습니까</Heading>

      {/* 권한 거부는 정상 경로라 경고 색과 경고 톤을 쓰지 않음 */}
      {positionFailed ? (
        <SectionMessage variant="info">{position.error}</SectionMessage>
      ) : null}
      {!positionFailed && geocode.error ? (
        <SectionMessage variant="info">{geocode.error}</SectionMessage>
      ) : null}

      {value.areaName ? (
        <Flex direction="column" gap="2">
          <Text textStyle="bodySm" color="fg.alternative">
            목격 지역
          </Text>
          <Flex gap="2" align="center" wrap="wrap">
            <Chip readOnly>{value.areaName}</Chip>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onChange({
                  areaName: null,
                  locationToken: null,
                  usableForDistance: false,
                });
                locationToken.clear();
                setManual(true);
              }}
            >
              다시 고르기
            </Button>
          </Flex>
        </Flex>
      ) : requesting || geocode.loading ? (
        <Flex direction="column" gap="2">
          <Text textStyle="bodySm" color="fg.alternative">
            {requesting
              ? "권한 팝업에서 위치 사용을 확인해 주십시오"
              : "지역을 확인하고 있습니다"}
          </Text>
          <Skeleton width="60%" height="32px" />
        </Flex>
      ) : showManual ? null : (
        <Flex direction="column" gap="2" align="flex-start">
          <Button colorPalette="brand" onClick={position.request}>
            현재 위치 사용
          </Button>
          <Button variant="outline" size="sm" onClick={() => setManual(true)}>
            직접 선택하기
          </Button>
        </Flex>
      )}

      {showManual && !value.areaName ? (
        <Flex direction="column" gap="2">
          <Heading size="sm">동이나 면을 검색해 주십시오</Heading>
          <PlaceSearchField
            search={search}
            placeholder="동, 면, 도로명으로 검색"
            emptyMessage="검색 결과가 없습니다. 동이나 면 이름으로 찾아 주십시오"
            onPick={(candidate) => {
              const areaName = candidate.areaName || candidate.name;
              // 검색으로 고른 지점도 서버에서 참조로 바꿈. 좌표가 폼에 남지 않음
              void locationToken
                .resolve({
                  source: "place",
                  lat: candidate.point.lat,
                  lng: candidate.point.lng,
                  areaName,
                })
                .then((result) => {
                  if (!result) return;
                  onChange({
                    areaName: result.areaName,
                    locationToken: result.locationToken,
                    usableForDistance: result.usableForDistance,
                  });
                });
              search.clear();
            }}
          />
          {!positionFailed ? (
            <Button variant="outline" size="sm" onClick={position.request}>
              현재 위치로 다시 시도
            </Button>
          ) : null}
        </Flex>
      ) : null}

      <Flex direction="column" gap="2">
        <Heading size="sm">찾아갈 단서 (선택)</Heading>
        <Input
          value={value.landmark}
          placeholder="새터산 12길 CU 근처"
          maxLength={100}
          onChange={(event) => onChange({ landmark: event.target.value })}
        />
        <Text textStyle="bodySm" color="fg.alternative">
          사람이 찾아갈 수 있는 단서를 적어 주십시오. 정확한 주소는 받지 않습니다
        </Text>
      </Flex>
    </Flex>
  );
}
