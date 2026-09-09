"use client";

import { useEffect, useState } from "react";
import { Button, Flex, Heading, Input, Skeleton, Text } from "@chakra-ui/react";

import { useCurrentPosition } from "@/hooks/use-current-position";
import { usePlaceSearch } from "@/hooks/use-place-search";
import { useReverseGeocode } from "@/hooks/use-reverse-geocode";
import { Chip } from "@/components/ui/chip";
import { PlaceSearchField } from "@/components/ui/place-search-field";
import { SectionMessage } from "@/components/ui/section-message";

// 2단계 위치. 지도 핀과 좌표 표시, 정확 주소 입력란을 만들지 않음
// 좌표는 역지오코딩 호출과 서버 전송에만 쓰고 화면에 숫자로 내보내지 않음

export type LocationValue = {
  areaName: string | null;
  areaCode: string | null;
  coordinates: { lat: number; lng: number } | null;
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

  const geocode = useReverseGeocode(position.point);

  // 좌표에서 행정동을 받으면 폼에 반영. 좌표는 상태에만 두고 화면에 쓰지 않음
  useEffect(() => {
    if (!geocode.result || !position.point) return;
    onChange({
      areaName: geocode.result.fullName || geocode.result.areaName,
      areaCode: geocode.result.code,
      coordinates: position.point,
    });
  }, [geocode.result, position.point, onChange]);

  const positionFailed = position.status === "denied" || position.status === "unavailable";
  const showManual = manual || positionFailed || geocode.error !== null;
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
          <Text textStyle="sm" color="fg.alternative">
            목격 지역
          </Text>
          <Flex gap="2" align="center" wrap="wrap">
            <Chip readOnly>{value.areaName}</Chip>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onChange({ areaName: null, areaCode: null, coordinates: null });
                setManual(true);
              }}
            >
              다시 고르기
            </Button>
          </Flex>
        </Flex>
      ) : requesting || geocode.loading ? (
        <Flex direction="column" gap="2">
          <Text textStyle="sm" color="fg.alternative">
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
              onChange({
                areaName: candidate.areaName || candidate.name,
                areaCode: null,
                // 검색으로 고른 지점의 좌표도 함께 보냄. 반경 검색에 쓰임
                coordinates: candidate.point,
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
        <Text textStyle="sm" color="fg.alternative">
          사람이 찾아갈 수 있는 단서를 적어 주십시오. 정확한 주소는 받지 않습니다
        </Text>
      </Flex>
    </Flex>
  );
}
