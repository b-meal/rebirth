"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Button,
  Flex,
  Heading,
  Image,
  Input,
  Skeleton,
  Text,
  Textarea,
} from "@chakra-ui/react";

import { useCurrentPosition } from "@/hooks/use-current-position";
import { usePhotoPicker } from "@/hooks/use-photo-picker";
import { usePlaceSearch } from "@/hooks/use-place-search";
import { useReverseGeocode } from "@/hooks/use-reverse-geocode";
import { Chip } from "@/components/ui/chip";
import { PhotoPickerInput } from "@/components/ui/photo-picker-input";
import { PlaceSearchField } from "@/components/ui/place-search-field";
import { SectionMessage } from "@/components/ui/section-message";
import { Segmented } from "@/components/ui/segmented";
import { TokenNotice } from "./token-notice";

// 실종 신고 등록. 보호자가 급한 상태라 필수 입력을 최소로 줄임
// 전화번호와 이메일, 이름 입력란을 만들지 않음

const ANIMAL_OPTIONS = [
  { value: "dog", label: "개" },
  { value: "cat", label: "고양이" },
  { value: "other", label: "그 외" },
] as const;

const SIZE_OPTIONS = [
  { value: "small", label: "소형" },
  { value: "medium", label: "중형" },
  { value: "large", label: "대형" },
] as const;

const COLOR_OPTIONS = [
  "흰색",
  "검정색",
  "갈색",
  "노란색",
  "회색",
  "베이지",
  "얼룩",
  "삼색",
] as const;

function toLocalInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function LostForm() {
  const [animalType, setAnimalType] = useState<"dog" | "cat" | "other">("dog");
  const [size, setSize] = useState<"small" | "medium" | "large">("small");
  const [colors, setColors] = useState<string[]>([]);
  const [appearance, setAppearance] = useState("");
  const [collar, setCollar] = useState(false);
  const [areaName, setAreaName] = useState<string | null>(null);
  const [areaCode, setAreaCode] = useState<string | null>(null);
  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [occurredAt, setOccurredAt] = useState("");
  const [manual, setManual] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const picker = usePhotoPicker({ maxCount: 1 });
  const position = useCurrentPosition();
  const geocode = useReverseGeocode(position.point);
  const search = usePlaceSearch({ mode: "address" });

  const photo = picker.photos[0] ?? null;

  // 좌표에서 행정동을 받으면 반영. 좌표는 서버 전송에만 씀
  // 렌더 중 setState 는 React 오류라 effect 로 옮김
  const region = geocode.result;
  const currentPoint = position.point;
  useEffect(() => {
    if (!region || !currentPoint) return;
    // 커밋 뒤 한 프레임에서 반영해 렌더 연쇄를 만들지 않음
    const frame = requestAnimationFrame(() => {
      setAreaName((prev) => prev ?? region.fullName ?? region.areaName);
      setAreaCode((prev) => prev ?? region.code);
      setPoint((prev) => prev ?? currentPoint);
    });
    return () => cancelAnimationFrame(frame);
  }, [region, currentPoint]);

  const positionFailed =
    position.status === "denied" || position.status === "unavailable";
  const showManual = manual || positionFailed || geocode.error !== null;

  const canSubmit = photo !== null && areaName !== null && !submitting;

  const submit = useCallback(async () => {
    if (!photo || !areaName) return;
    setSubmitting(true);
    setError(null);

    const payload = {
      animalType,
      appearance,
      colors,
      size,
      collar,
      ...(point ? { coordinates: point } : {}),
      ...(areaCode ? { areaCode } : {}),
      areaName,
      occurredAt: occurredAt
        ? new Date(occurredAt).toISOString()
        : new Date().toISOString(),
    };

    const body = new FormData();
    body.append("photo", photo.file);
    body.append("payload", JSON.stringify(payload));

    try {
      const response = await fetch("/api/lost", { method: "POST", body });
      const result = (await response.json()) as {
        token?: string;
        message?: string;
      };
      if (!response.ok || !result.token) {
        // 입력값을 유지하고 재시도만 노출
        setError(result.message ?? "신고가 저장되지 않았습니다. 다시 시도해 주십시오");
        setSubmitting(false);
        return;
      }
      setToken(result.token);
    } catch {
      setError("신고가 저장되지 않았습니다. 입력한 내용은 그대로 있습니다");
      setSubmitting(false);
    }
  }, [photo, areaName, animalType, appearance, colors, size, collar, point, areaCode, occurredAt]);

  // 토큰이 발급되면 화면을 덮어 복사를 유도함
  if (token) return <TokenNotice token={token} />;

  return (
    <Flex direction="column" gap="5" padding="5" paddingBottom="24">
      <Flex direction="column" gap="1">
        <Heading size="xl">반려동물을 잃어버렸어요</Heading>
        <Text textStyle="sm" color="fg.alternative">
          연락처는 받지 않습니다. 신고 뒤에 나오는 조회 주소로만 확인합니다
        </Text>
      </Flex>

      {error ? <SectionMessage variant="negative">{error}</SectionMessage> : null}

      <Flex direction="column" gap="2">
        <Heading size="sm">사진</Heading>
        {photo ? (
          <>
            <Image
              src={photo.previewUrl}
              alt="잃어버린 반려동물 사진"
              width="100%"
              aspectRatio="4 / 3"
              objectFit="cover"
              borderRadius="card"
              display="block"
            />
            <Button variant="outline" size="sm" onClick={() => picker.clear()}>
              다시 고르기
            </Button>
          </>
        ) : picker.processing ? (
          <Skeleton width="100%" height="200px" />
        ) : (
          <LostPhotoPicker onFiles={(files) => void picker.replaceFiles(files)} />
        )}
        {picker.error ? (
          <SectionMessage variant="negative">{picker.error}</SectionMessage>
        ) : null}
      </Flex>

      <Flex direction="column" gap="2">
        <Heading size="sm">동물 종류</Heading>
        <Segmented
          value={animalType}
          options={ANIMAL_OPTIONS}
          onValueChange={(value) => setAnimalType(value as typeof animalType)}
        />
      </Flex>

      <Flex direction="column" gap="2">
        <Heading size="sm">털색</Heading>
        <Flex gap="1.5" wrap="wrap">
          {COLOR_OPTIONS.map((color) => {
            const selected = colors.includes(color);
            return (
              <Chip
                key={color}
                size="small"
                active={selected}
                onClick={() =>
                  setColors((prev) =>
                    selected
                      ? prev.filter((c) => c !== color)
                      : [...prev, color].slice(0, 5),
                  )
                }
              >
                {color}
              </Chip>
            );
          })}
        </Flex>
      </Flex>

      <Flex direction="column" gap="2">
        <Heading size="sm">크기</Heading>
        <Segmented
          value={size}
          options={SIZE_OPTIONS}
          onValueChange={(value) => setSize(value as typeof size)}
        />
      </Flex>

      <Flex direction="column" gap="2">
        <Heading size="sm">특징</Heading>
        <Textarea
          value={appearance}
          maxLength={300}
          rows={3}
          width="100%"
          placeholder="왼쪽 귀에 갈색 반점, 분홍 목줄"
          onChange={(event) => setAppearance(event.target.value)}
        />
        <Flex gap="1.5">
          <Chip size="small" active={collar} onClick={() => setCollar((v) => !v)}>
            목줄이나 인식표 착용
          </Chip>
        </Flex>
      </Flex>

      <Flex direction="column" gap="2">
        <Heading size="sm">마지막 목격 장소</Heading>
        {areaName ? (
          <Flex gap="2" align="center" wrap="wrap">
            <Chip readOnly>{areaName}</Chip>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setAreaName(null);
                setAreaCode(null);
                setPoint(null);
                setManual(true);
              }}
            >
              다시 고르기
            </Button>
          </Flex>
        ) : showManual ? (
          <PlaceSearchField
            search={search}
            placeholder="동, 면, 도로명으로 검색"
            emptyMessage="검색 결과가 없습니다. 동이나 면 이름으로 찾아 주십시오"
            onPick={(candidate) => {
              setAreaName(candidate.areaName || candidate.name);
              setPoint(candidate.point);
              search.clear();
            }}
          />
        ) : (
          <Flex direction="column" gap="2" align="flex-start">
            <Button colorPalette="brand" onClick={position.request}>
              현재 위치 사용
            </Button>
            <Button variant="outline" size="sm" onClick={() => setManual(true)}>
              직접 선택하기
            </Button>
          </Flex>
        )}
      </Flex>

      <Flex direction="column" gap="2">
        <Heading size="sm">마지막 목격 시각</Heading>
        <Input
          type="datetime-local"
          value={occurredAt || toLocalInput(new Date())}
          max={toLocalInput(new Date())}
          onChange={(event) => setOccurredAt(event.target.value)}
        />
      </Flex>

      <Button
        width="100%"
        colorPalette="brand"
        loading={submitting}
        disabled={!canSubmit}
        onClick={submit}
      >
        신고 등록하기
      </Button>
    </Flex>
  );
}

// 사진 선택 버튼. 실종 신고는 촬영보다 앨범에서 고르는 경우가 대부분
function LostPhotoPicker({ onFiles }: { onFiles: (files: File[]) => void }) {
  const [ref, setRef] = useState<{ open: () => void } | null>(null);
  return (
    <Flex
      direction="column"
      gap="2"
      align="center"
      justify="center"
      aspectRatio="4 / 3"
      borderRadius="card"
      borderWidth="1px"
      borderStyle="dashed"
      borderColor="border"
    >
      <Text color="fg.alternative">잃어버린 반려동물의 사진</Text>
      <Button colorPalette="brand" onClick={() => ref?.open()}>
        앨범에서 고르기
      </Button>
      <PhotoPickerInput ref={setRef} mode="library" onFiles={onFiles} />
    </Flex>
  );
}
