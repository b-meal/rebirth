"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { HStack, Text, VStack } from "@seed-design/react";
import { CONSENT_DOCUMENT_VERSION } from "@rebirth/types";
import { ActionButton } from "seed-design/ui/action-button";
import { Callout } from "seed-design/ui/callout";
import { Chip } from "seed-design/ui/chip";
import { SegmentedControl, SegmentedControlItem } from "seed-design/ui/segmented-control";
import { TagGroupItem, TagGroupRoot } from "seed-design/ui/tag-group";
import { TextField, TextFieldInput, TextFieldTextarea } from "seed-design/ui/text-field";

import { useCurrentPosition } from "@/hooks/use-current-position";
import { useLocationToken } from "@/hooks/use-location-token";
import { usePhotoPicker } from "@/hooks/use-photo-picker";
import { usePhotoUpload } from "@/hooks/use-photo-upload";
import { usePlaceSearch } from "@/hooks/use-place-search";
import { useReverseGeocode } from "@/hooks/use-reverse-geocode";
import { PhotoField } from "@/components/ui/photo-field";
import { PlaceSearchField } from "@/components/ui/place-search-field";
import { Screen, ScreenBody, Section } from "@/components/ui/screen";
import { AppHeader } from "@/components/ui/app-header";
import { TokenNotice } from "./token-notice";

// 실종 신고 등록, 보호자가 급한 상태라 전화번호와 이름 입력란을 만들지 않음

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
  // 좌표 대신 서버가 발급한 참조만 들고 있는 POL-08
  const [areaName, setAreaName] = useState<string | null>(null);
  const [locationToken, setLocationToken] = useState<string | null>(null);
  const [usableForDistance, setUsableForDistance] = useState(false);
  const [occurredAt, setOccurredAt] = useState("");
  const [manual, setManual] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const upload = usePhotoUpload();
  const picker = usePhotoPicker({
    maxCount: 1,
    onChange: (photos) => {
      const next = photos[0];
      if (next) void upload.upload(next.file);
    },
  });
  const position = useCurrentPosition();
  const geocode = useReverseGeocode(position.point);
  const search = usePlaceSearch({ mode: "address" });
  const location = useLocationToken();

  // 현재 위치로 확인된 지역을 서버 참조로 바꿈, 좌표는 여기서 서버로만 나감
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

  const positionFailed = position.status === "denied" || position.status === "unavailable";
  const showManual = manual || positionFailed || geocode.error !== null;

  // 업로드와 위치 참조가 모두 준비돼야 저장할 수 있음
  const canSubmit = upload.uploadId !== null && locationToken !== null && !submitting;

  // 무엇이 모자라 버튼이 꺼져 있는지. 둘 다 없으면 위쪽 칸부터 짚어 줌
  const missing =
    upload.uploadId === null
      ? "사진을 골라 주세요"
      : locationToken === null
        ? "마지막으로 본 곳을 정해 주세요"
        : null;

  // 재시도에서도 같은 키를 씀, 이중 탭이 신고를 두 건 만들지 않음
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
      occurredAt: occurredAt ? new Date(occurredAt).toISOString() : new Date().toISOString(),
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
        setError("저장하고 있어요. 잠시 후 다시 눌러 주세요");
        setSubmitting(false);
        return;
      }

      if (!response.ok || !result.manageToken) {
        // 입력값을 유지하고 재시도만 노출
        setError(result.message ?? "신고를 저장하지 못했어요. 다시 시도해 주세요");
        setSubmitting(false);
        return;
      }
      setToken(result.manageToken);
    } catch {
      setError("신고를 저장하지 못했어요. 적은 내용은 그대로 있어요");
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
    <Screen>
      <AppHeader title="실종 신고" />
      <ScreenBody gap="x6">
        {/* 앱바가 이미 실종 신고라 제목을 되풀이하지 않음
            대신 연락처를 왜 안 받는지만 한 줄로 밝힘. 급한 사람이 가장 먼저 궁금해하는 것 */}
        <Text textStyle="t3Regular" color="fg.neutralMuted">
          연락처는 받지 않아요. 신고 뒤에 나오는 주소로만 확인해요
        </Text>

        {error ? <Callout tone="critical" description={error} /> : null}

        <PhotoField
          picker={picker}
          label="사진"
          hint="얼굴이 잘 보이는 사진이 찾는 데 도움이 돼요"
          cameraAvailable={false}
          disabled={upload.status === "uploading"}
        />
        {upload.message ? <Callout tone="critical" description={upload.message} /> : null}

        <Section>
          <Text as="h2" textStyle="t5Bold" color="fg.neutral">
            동물 종류
          </Text>
          <SegmentedControl
            value={animalType}
            onValueChange={(value) => setAnimalType(value as typeof animalType)}
            aria-label="동물 종류"
          >
            {ANIMAL_OPTIONS.map((option) => (
              <SegmentedControlItem key={option.value} value={option.value}>
                {option.label}
              </SegmentedControlItem>
            ))}
          </SegmentedControl>
        </Section>

        <Section>
          <Text as="h2" textStyle="t5Bold" color="fg.neutral">
            털색
          </Text>
          <HStack gap="spacingX.betweenChips" wrap>
            {COLOR_OPTIONS.map((color) => {
              const selected = colors.includes(color);
              return (
                <Chip.Toggle
                  key={color}
                  size="small"
                  checked={selected}
                  onCheckedChange={() =>
                    setColors((prev) =>
                      selected ? prev.filter((c) => c !== color) : [...prev, color].slice(0, 5),
                    )
                  }
                >
                  <Chip.Label>{color}</Chip.Label>
                </Chip.Toggle>
              );
            })}
          </HStack>
        </Section>

        <Section>
          <Text as="h2" textStyle="t5Bold" color="fg.neutral">
            크기
          </Text>
          <SegmentedControl
            value={size}
            onValueChange={(value) => setSize(value as typeof size)}
            aria-label="크기"
          >
            {SIZE_OPTIONS.map((option) => (
              <SegmentedControlItem key={option.value} value={option.value}>
                {option.label}
              </SegmentedControlItem>
            ))}
          </SegmentedControl>
        </Section>

        <Section>
          <TextField
            label="특징"
            value={appearance}
            maxGraphemeCount={300}
            onValueChange={(next) => setAppearance(next.value)}
          >
            <TextFieldTextarea placeholder="왼쪽 귀에 갈색 반점, 분홍 목줄" />
          </TextField>
          <HStack gap="spacingX.betweenChips">
            <Chip.Toggle
              size="small"
              checked={collar}
              onCheckedChange={(next) => setCollar(next)}
            >
              <Chip.Label>목줄이나 인식표 착용</Chip.Label>
            </Chip.Toggle>
          </HStack>
        </Section>

        {/* 현재 위치 버튼에 브랜드 면을 쓰면 초록 버튼이 둘이라 어느 쪽이 끝인지 헷갈림
            신고 등록만 브랜드 면을 쥐고 여기는 물러난 면으로 둠 */}
        <Section>
          <Text as="h2" textStyle="t5Bold" color="fg.neutral">
            마지막으로 본 곳
          </Text>
          {areaName ? (
            <HStack gap="x2" align="center" wrap>
              <TagGroupRoot>
                <TagGroupItem label={areaName} tone="brand" />
              </TagGroupRoot>
              <ActionButton
                variant="neutralOutline"
                size="xsmall"
                onClick={() => {
                  setAreaName(null);
                  setLocationToken(null);
                  setUsableForDistance(false);
                  location.clear();
                  setManual(true);
                }}
              >
                다시 고르기
              </ActionButton>
            </HStack>
          ) : showManual ? (
            <PlaceSearchField
              search={search}
              placeholder="동, 면, 도로명으로 검색"
              emptyMessage="찾는 곳이 없어요. 동이나 면 이름으로 찾아 주세요"
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
            <VStack align="stretch" gap="x2">
              <ActionButton variant="neutralWeak" size="large" onClick={position.request}>
                현재 위치로 찾기
              </ActionButton>
              <ActionButton variant="ghost" size="small" onClick={() => setManual(true)}>
                주소로 직접 찾기
              </ActionButton>
            </VStack>
          )}
        </Section>

        <TextField label="마지막 목격 시각">
          <TextFieldInput
            type="datetime-local"
            value={occurredAt || toLocalInput(new Date())}
            max={toLocalInput(new Date())}
            onChange={(event) => setOccurredAt(event.target.value)}
          />
        </TextField>

        {/* 버튼이 왜 꺼져 있는지 밝힘. 회색 버튼만 두면 무엇이 모자란지 알 수 없음 */}
        <VStack align="stretch" gap="x2">
          {missing ? (
            <HStack justify="center">
              <Text textStyle="t3Regular" color="fg.neutralMuted">
                {missing}
              </Text>
            </HStack>
          ) : null}
          <ActionButton
            variant="brandSolid"
            size="large"
            loading={submitting}
            disabled={!canSubmit}
            onClick={submit}
          >
            신고 등록하기
          </ActionButton>
        </VStack>
      </ScreenBody>
    </Screen>
  );
}
