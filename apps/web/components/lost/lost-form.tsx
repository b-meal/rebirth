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
// 한 화면에 여덟 덩어리를 세로로 늘어놓으면 어디까지 했는지 알 수 없어 세 걸음으로 나눔
// 제보 폼과 같이 주소의 step 으로 단계를 들고 있어 뒤로가기가 한 걸음만 되돌림

type LostStep = 1 | 2 | 3;

const STEPS: LostStep[] = [1, 2, 3];
const LAST_STEP: LostStep = 3;

/** 앱바에 걸리는 이름. 지금 무엇을 묻는 중인지 제목만 봐도 알게 함 */
const STEP_TITLE: Record<LostStep, string> = {
  1: "실종 신고",
  2: "생김새",
  3: "마지막 흔적",
};

const STEP_HEADING: Record<LostStep, string> = {
  1: "잃어버린 아이 사진을 올려 주세요",
  2: "어떻게 생겼나요?",
  3: "어디서 마지막으로 봤나요?",
};

const STEP_HINT: Record<LostStep, string> = {
  1: "연락처는 받지 않아요. 신고 뒤에 나오는 주소로만 확인해요",
  2: "기억나는 만큼만 골라도 돼요",
  3: "그 주변 이웃들에게 먼저 알려요",
};

function readStepFromUrl(): LostStep {
  if (typeof window === "undefined") return 1;
  const raw = Number(new URLSearchParams(window.location.search).get("step"));
  return raw >= 1 && raw <= LAST_STEP ? (raw as LostStep) : 1;
}

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
  const [step, setStep] = useState<LostStep>(1);
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

  // 사진은 File 이라 복원되지 않으므로 새로고침은 늘 첫 걸음에서 다시 시작함
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has("step")) {
      url.searchParams.delete("step");
      window.history.replaceState({ step: 1 }, "", url);
    }
  }, []);

  // 앱바의 뒤로와 기기 뒤로가 화면을 벗어나지 않고 한 걸음만 되돌림
  useEffect(() => {
    const onPop = () => setStep(readStepFromUrl());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const goTo = useCallback((next: LostStep) => {
    setStep(next);
    const url = new URL(window.location.href);
    url.searchParams.set("step", String(next));
    window.history.pushState({ step: next }, "", url);
    window.scrollTo({ top: 0 });
  }, []);

  const positionFailed = position.status === "denied" || position.status === "unavailable";
  const showManual = manual || positionFailed || geocode.error !== null;

  // 이 걸음에서 무엇이 모자라 다음으로 못 가는지. 없으면 버튼이 켜짐
  // 생김새는 기본값이 이미 있어 막지 않음. 고르지 않아도 넘어갈 수 있음
  const blocked =
    step === 1 && upload.uploadId === null
      ? upload.status === "uploading"
        ? "사진을 올리고 있어요"
        : "사진을 골라 주세요"
      : step === LAST_STEP && locationToken === null
        ? "마지막으로 본 곳을 정해 주세요"
        : submitting
          ? "신고를 저장하고 있어요"
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
      {/* 앱바의 뒤로가 단계를 하나씩 되돌림. 첫 걸음에서는 화면을 벗어남 */}
      <AppHeader title={STEP_TITLE[step]} />

      {/* 지금 어디쯤인지 앱바 밑에 띠로 둠. 세 걸음뿐이라 숫자는 적지 않음 */}
      <HStack gap="x1" px="spacingX.globalGutter" pb="x2">
        {STEPS.map((value) => (
          <VStack
            key={value}
            height="x1"
            grow={1}
            borderRadius="full"
            bg={value <= step ? "bg.brandSolid" : "bg.neutralWeak"}
          />
        ))}
      </HStack>

      <ScreenBody gap="x6">
        {/* 이 걸음에서 무엇을 묻는지 먼저 말함. 화면마다 한 가지만 물음 */}
        <VStack align="stretch" gap="x1">
          <Text as="h1" textStyle="t7Bold" color="fg.neutral">
            {STEP_HEADING[step]}
          </Text>
          <Text textStyle="t3Regular" color="fg.neutralMuted">
            {STEP_HINT[step]}
          </Text>
        </VStack>

        {error ? <Callout tone="critical" description={error} /> : null}

        {step === 1 ? (
          <>
            <PhotoField
              picker={picker}
              label="사진"
              hint="얼굴이 잘 보이는 사진이 찾는 데 도움이 돼요"
              cameraAvailable={false}
              disabled={upload.status === "uploading"}
            />
            {upload.message ? <Callout tone="critical" description={upload.message} /> : null}
          </>
        ) : null}

        {step === 2 ? (
          <>
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
                          selected
                            ? prev.filter((c) => c !== color)
                            : [...prev, color].slice(0, 5),
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
          </>
        ) : null}

        {step === 3 ? (
          <>
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
                  {/* 아래 띠의 버튼만 브랜드 면을 쥠. 초록이 둘이면 어느 쪽이 끝인지 헷갈림 */}
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
          </>
        ) : null}
      </ScreenBody>

      {/* 다음으로 가는 자리는 늘 화면 아래 같은 곳에 있음
          스크롤해 찾지 않아도 되고 무엇이 모자란지도 여기서 알려 줌 */}
      <VStack
        align="stretch"
        gap="x2"
        position="sticky"
        bottom="0"
        px="spacingX.globalGutter"
        pt="x3"
        bg="bg.layerDefault"
        borderTopWidth={1}
        borderColor="stroke.neutralMuted"
        className="rebirth-bottom-bar"
      >
        {blocked ? (
          <HStack justify="center">
            <Text textStyle="t3Regular" color="fg.neutralMuted">
              {blocked}
            </Text>
          </HStack>
        ) : null}
        <ActionButton
          variant="brandSolid"
          size="large"
          loading={submitting}
          disabled={blocked !== null}
          onClick={step === LAST_STEP ? submit : () => goTo((step + 1) as LostStep)}
        >
          {step === LAST_STEP ? "신고 등록하기" : "다음"}
        </ActionButton>
      </VStack>
    </Screen>
  );
}
