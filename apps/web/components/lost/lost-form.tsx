"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

import { CONSENT_DOCUMENT_VERSION } from "@rebirth/types";

import { useCurrentPosition } from "@/hooks/use-current-position";
import { useLocationToken } from "@/hooks/use-location-token";
import { usePhotoPicker } from "@/hooks/use-photo-picker";
import { usePhotoUpload } from "@/hooks/use-photo-upload";
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
  // 좌표 대신 서버가 발급한 참조만 들고 있음. POL-08
  const [areaName, setAreaName] = useState<string | null>(null);
  const [locationToken, setLocationToken] = useState<string | null>(null);
  const [usableForDistance, setUsableForDistance] = useState(false);
  const [occurredAt, setOccurredAt] = useState("");
  const [manual, setManual] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const picker = usePhotoPicker({
    maxCount: 1,
    onChange: (photos) => {
      const next = photos[0];
      if (next) void upload.upload(next.file);
    },
  });
  const upload = usePhotoUpload();
  const position = useCurrentPosition();
  const geocode = useReverseGeocode(position.point);
  const search = usePlaceSearch({ mode: "address" });
  const location = useLocationToken();

  const photo = picker.photos[0] ?? null;

  // 현재 위치로 확인된 지역을 서버 참조로 바꿈. 좌표는 여기서 서버로만 나감
  const region = geocode.result;
  const currentPoint = position.point;
  const accuracyMeters = position.accuracyMeters;
  useEffect(() => {
    if (!region || !currentPoint || location.status !== "idle") return;
    void location
      .resolve({
        source: "gps",
        lat: currentPoint.lat,
        lng: currentPoint.lng,
        ...(accuracyMeters !== null && { accuracyM: Math.round(accuracyMeters) }),
        confirmedHere: true,
        areaName: region.fullName || region.areaName,
        ...(region.code && {
          areaCode: region.code,
          areaCodeSystem: "H" as const,
        }),
      })
      .then((result) => {
        if (!result) return;
        setAreaName(result.areaName);
        setLocationToken(result.locationToken);
        setUsableForDistance(result.usableForDistance);
      });
  }, [region, currentPoint, accuracyMeters, location]);

  const positionFailed =
    position.status === "denied" || position.status === "unavailable";
  const showManual = manual || positionFailed || geocode.error !== null;

  // 업로드와 위치 참조가 모두 준비돼야 저장할 수 있음
  const canSubmit =
    upload.uploadId !== null && locationToken !== null && !submitting;

  // 재시도에서도 같은 키를 씀. 이중 탭이 신고를 두 건 만들지 않음
  const idempotencyKey = useRef<string | null>(null);

  const submit = useCallback(async () => {
    if (!upload.uploadId || !locationToken) return;
    setSubmitting(true);
    setError(null);

    idempotencyKey.current ??= crypto.randomUUID();

    const payload = {
      animalType,
      appearance,
      colors,
      size,
      collar,
      uploadIds: [upload.uploadId],
      locationToken,
      occurredAt: occurredAt
        ? new Date(occurredAt).toISOString()
        : new Date().toISOString(),
      idempotencyKey: idempotencyKey.current,
      consents: {
        requiredTerms: true,
        requiredPrivacy: true,
        // 실종 신고는 AI 초안 단계가 없음
        optionalAi: false,
        optionalLocation: usableForDistance,
        documentVersion: CONSENT_DOCUMENT_VERSION,
      },
    };

    try {
      const response = await fetch("/api/lost", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as {
        manageToken?: string;
        pending?: boolean;
        message?: string;
      };

      if (response.status === 202 || result.pending) {
        setError("저장하고 있습니다. 잠시 후 다시 눌러 주십시오");
        setSubmitting(false);
        return;
      }

      if (!response.ok || !result.manageToken) {
        // 입력값을 유지하고 재시도만 노출
        setError(result.message ?? "신고가 저장되지 않았습니다. 다시 시도해 주십시오");
        setSubmitting(false);
        return;
      }
      setToken(result.manageToken);
    } catch {
      setError("신고가 저장되지 않았습니다. 입력한 내용은 그대로 있습니다");
      setSubmitting(false);
    }
  }, [
    upload.uploadId,
    locationToken,
    usableForDistance,
    animalType,
    appearance,
    colors,
    size,
    collar,
    occurredAt,
  ]);

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
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                picker.clear();
                upload.clear();
              }}
            >
              다시 고르기
            </Button>
          </>
        ) : picker.processing || upload.status === "uploading" ? (
          <Skeleton width="100%" height="200px" />
        ) : (
          <LostPhotoPicker onFiles={(files) => void picker.replaceFiles(files)} />
        )}
        {picker.error ?? upload.message ? (
          <SectionMessage variant="negative">
            {picker.error ?? upload.message}
          </SectionMessage>
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
                setLocationToken(null);
                setUsableForDistance(false);
                location.clear();
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
              // 검색으로 고른 지점도 서버에서 참조로 바꿈
              void location
                .resolve({
                  source: "place",
                  lat: candidate.point.lat,
                  lng: candidate.point.lng,
                  areaName: candidate.areaName || candidate.name,
                })
                .then((result) => {
                  if (!result) return;
                  setAreaName(result.areaName);
                  setLocationToken(result.locationToken);
                  setUsableForDistance(result.usableForDistance);
                });
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
