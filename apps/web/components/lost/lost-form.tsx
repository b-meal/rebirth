"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { HStack, Icon, Text, VStack } from "@seed-design/react";
import {
  IconChevronRightLine,
  IconMagnifyingglassLine,
  IconLocationpinLine,
} from "@karrotmarket/react-monochrome-icon";
import { CONSENT_DOCUMENT_VERSION, PHOTO_MAX_COUNT } from "@rebirth/types";
import { ActionButton } from "seed-design/ui/action-button";
import { Callout } from "seed-design/ui/callout";
import { Chip } from "seed-design/ui/chip";
import { SegmentedControl, SegmentedControlItem } from "seed-design/ui/segmented-control";
import { ProgressCircle } from "seed-design/ui/progress-circle";
import { Snackbar, useSnackbarAdapter } from "seed-design/ui/snackbar";
import { TextField, TextFieldInput, TextFieldTextarea } from "seed-design/ui/text-field";

import { useCurrentPosition } from "@/hooks/use-current-position";
import { useLocationToken } from "@/hooks/use-location-token";
import { usePhotoPicker } from "@/hooks/use-photo-picker";
import { usePhotoUploads } from "@/hooks/use-photo-uploads";
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

// 아이는 사람 아이로도 읽혀 무엇을 잃어버렸는지 흐려짐. 반려동물이라고 밝힘
const STEP_HEADING: Record<LostStep, string> = {
  1: "잃어버린 반려동물 사진을 올려 주세요",
  2: "어떻게 생겼나요?",
  3: "어디서 마지막으로 봤나요?",
};

// 머리글만으로 할 일이 분명한 걸음은 설명을 두지 않음
// 마지막 걸음에서만 연락처를 왜 안 받는지 밝힘. 등록을 누르기 직전에 알아야 하는 것
const STEP_HINT: Record<LostStep, string | null> = {
  1: null,
  2: "특징만 적어 주시면 나머지는 기억나는 만큼만 골라도 돼요",
  3: "연락처는 받지 않아요. 신고 뒤에 나오는 주소로만 확인해요",
};

/**
 * 장소를 찾는 두 가지 길
 * 나란한 선택지라 크기를 달리하지 않고 같은 모양의 줄로 둠
 * 큰 버튼과 작은 글씨로 두면 한쪽이 덜 중요한 길처럼 보임
 */
function PickRow({
  icon,
  label,
  hint,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <HStack
      asChild
      align="center"
      gap="x3"
      px="x4"
      py="x4"
      borderRadius="r3"
      borderWidth={1}
      borderColor="stroke.neutralMuted"
    >
      {/* design-system-allow:raw-element 줄 전체를 누르는 자리라 button 이 필요함 */}
      <button type="button" className="rebirth-row" onClick={onClick}>
        <Icon svg={icon} size="x6" color="fg.neutralMuted" />
        {/* button 이 가운데 정렬을 물려줘 줄 안의 글은 왼쪽으로 되돌림 */}
        <VStack align="flex-start" gap="x0_5" grow={1} minWidth="0">
          <Text textStyle="t4Bold" color="fg.neutral">
            {label}
          </Text>
          <Text textStyle="t3Regular" color="fg.neutralMuted">
            {hint}
          </Text>
        </VStack>
        <Icon svg={<IconChevronRightLine />} size="x4" color="fg.neutralSubtle" />
      </button>
    </HStack>
  );
}

/** 한 줄짜리 알림이 머무는 시간. 기본 4초는 읽고 나서도 한참 남아 있음 */
const SNACKBAR_MS = 2000;

/**
 * 위치를 찾는 동안 비워 두는 높이
 * 찾고 나면 그 자리에 동네 한 줄이 들어서므로 그 줄의 높이와 같게 둠
 * 고르는 줄 두 개 높이로 잡으면 결과가 온 순간 화면이 크게 줄어듦
 */
const FINDING_HEIGHT = "54px";

/** 주소가 들고 있는 걸음. 값이 없거나 범위를 벗어나면 첫 걸음 */
function readStep(raw: string | null): LostStep {
  const value = Number(raw);
  return value >= 1 && value <= LAST_STEP ? (value as LostStep) : 1;
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
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
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
  // 잡아 둔 좌표로 동네를 채워도 되는지. 비운 뒤에는 눌러서 다시 켬
  const [wantsGps, setWantsGps] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // 여러 장을 각자 올림. use-photo-upload 는 새로 올릴 때 앞의 것을 끊어 한 장만 남음
  const upload = usePhotoUploads();
  const snackbar = useSnackbarAdapter();
  const picker = usePhotoPicker({
    maxCount: PHOTO_MAX_COUNT,
    onChange: upload.sync,
    // 같은 사진을 또 고르면 아무 일도 안 일어난 것처럼 보여 스낵바로 알림
    // 한 줄 알림이라 기본 4초는 길게 느껴짐. 눌러서 바로 지울 수도 있게 함
    // 글만 있으면 무슨 결의 알림인지 늦게 읽힘. 걸러 냈다는 뜻이라 critical 로 아이콘을 붙임
    onDuplicate: (count) =>
      snackbar.create({
        timeout: SNACKBAR_MS,
        render: () => (
          <Snackbar
            variant="critical"
            onClick={snackbar.dismiss}
            message={
              count === 1 ? "이미 고른 사진이에요" : `이미 고른 사진 ${count}장은 넣지 않았어요`
            }
          />
        ),
      }),
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
    // 비운 뒤에는 다시 채우지 않음. 좌표와 행정동이 그대로 남아 있어
    // 지우자마자 같은 값으로 되살아나 비운 것이 없던 일이 됨
    if (!wantsGps) return;
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
  }, [region, currentPoint, accuracyMeters, location, wantsGps]);

  // 사진은 File 이라 복원되지 않으므로 새로고침은 늘 첫 걸음에서 다시 시작함
  useEffect(() => {
    if (readStep(new URLSearchParams(window.location.search).get("step")) === 1) return;
    router.replace(pathname);
    // 처음 붙을 때 한 번만 봄. 걸음을 옮길 때마다 되돌리면 안 됨
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * 마지막 걸음에 적은 것을 비움
   * 장소는 서버가 발급한 참조라 다시 들어왔을 때 남아 있으면
   * 화면에는 옛 동네가 붙어 있는데 그 사이 자리를 옮겼을 수도 있음
   * 위치를 새로 묻는 편이 잘못된 곳으로 신고되는 것보다 나음
   */
  const resetLastStep = useCallback(
    ({ keepTime = false } = {}) => {
      setAreaName(null);
      setLocationToken(null);
      setUsableForDistance(false);
      setManual(false);
      setWantsGps(false);
      location.clear();
      // 장소만 고쳐 쓰는 자리에서는 적어 둔 시각까지 지우지 않음
      if (!keepTime) setOccurredAt("");
    },
    [location],
  );

  /**
   * 걸음은 주소가 들고 있고 화면은 그것을 따라감
   * history 를 직접 다루면 앱바의 뒤로는 Next 라우터로 움직여 popstate 가 오지 않아
   * 주소만 바뀌고 화면이 그대로 남음. 라우터가 알려 주는 주소만 믿음
   */
  const urlStep = readStep(params.get("step"));

  // 마지막 걸음에서 빠져나오면 거기 적은 것은 지움
  const leaving = useRef(urlStep);
  useEffect(() => {
    if (leaving.current === urlStep) return;
    if (leaving.current === LAST_STEP && urlStep !== LAST_STEP) resetLastStep();
    leaving.current = urlStep;
    window.scrollTo({ top: 0 });
  }, [urlStep, resetLastStep]);

  const goTo = useCallback(
    (next: LostStep) => {
      const query = new URLSearchParams(params.toString());
      query.set("step", String(next));
      router.push(`${pathname}?${query}`);
    },
    [params, pathname, router],
  );

  const positionFailed = position.status === "denied" || position.status === "unavailable";
  const showManual = manual || positionFailed || geocode.error !== null;

  /**
   * 이 걸음에서 다음으로 갈 수 있는지
   * 종류와 크기는 기본값이 있어 막지 않지만 특징은 서버가 반드시 요구함
   * 여기서 막지 않으면 마지막에 등록을 눌러서야 두 걸음 앞의 빈칸을 알게 됨
   */
  const ready =
    urlStep === 1
      ? upload.uploadIds.length > 0
      : urlStep === 2
        ? appearance.trim().length > 0
        : locationToken !== null && !submitting;

  /**
   * 위치를 찾는 중인지. 누른 뒤 결과가 올 때까지 아무 반응이 없으면 멈춘 줄 앎
   * 좌표를 받고 그것을 행정동으로 바꾸고 서버 참조를 받는 세 걸음이라
   * 사이사이 상태가 잠깐 idle 로 비어 한 걸음이라도 진행 중이면 찾는 중으로 봄
   */
  const findingPlace =
    wantsGps &&
    locationToken === null &&
    (position.status === "requesting" ||
      location.status === "resolving" ||
      (position.point !== null && geocode.result === null && geocode.error === null));

  // 재시도에서도 같은 키를 씀, 이중 탭이 신고를 두 건 만들지 않음
  const idempotencyKey = useRef<string | null>(null);

  const submit = useCallback(async () => {
    if (upload.uploadIds.length === 0 || !locationToken) return;
    setSubmitting(true);
    setError(null);

    idempotencyKey.current ??= crypto.randomUUID();

    const payload = {
      animalType,
      appearance,
      colors,
      size,
      collar,
      uploadIds: upload.uploadIds,
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
        fieldErrors?: Record<string, string>;
      };

      if (response.status === 202 || result.pending) {
        setError("저장하고 있어요. 잠시 후 다시 눌러 주세요");
        setSubmitting(false);
        return;
      }

      if (!response.ok || !result.manageToken) {
        // 입력값을 유지하고 재시도만 노출
        // 무엇이 잘못됐는지는 필드별 메시지가 알고 있음
        // 입력값을 확인해 주십시오 만 보여 주면 어느 칸이 문제인지 알 수 없음
        const field = Object.values(result.fieldErrors ?? {})[0];
        setError(field ?? result.message ?? "신고를 저장하지 못했어요. 다시 시도해 주세요");
        setSubmitting(false);
        return;
      }
      setToken(result.manageToken);
    } catch {
      setError("신고를 저장하지 못했어요. 적은 내용은 그대로 있어요");
      setSubmitting(false);
    }
  }, [
    upload.uploadIds,
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
  // 이 화면은 /lost/new 안에서 그려지므로 주소만 바꾸면 폼이 그대로 남음
  // 토큰을 비워 이 덮개를 걷고 같은 자리에서 조회 화면으로 옮김
  if (token) {
    return (
      <TokenNotice
        token={token}
        onLeave={() => {
          setToken(null);
          router.replace(`/lost/${token}`);
        }}
      />
    );
  }

  return (
    <Screen>
      {/* 앱바의 뒤로가 단계를 하나씩 되돌림. 첫 걸음에서는 화면을 벗어남 */}
      <AppHeader title={STEP_TITLE[urlStep]} />

      {/* 지금 어디쯤인지 앱바 밑에 띠로 둠. 세 걸음뿐이라 숫자는 적지 않음 */}
      <HStack gap="x1" px="spacingX.globalGutter" pb="x2">
        {STEPS.map((value) => (
          <VStack
            key={value}
            height="x1"
            grow={1}
            borderRadius="full"
            bg={value <= urlStep ? "bg.brandSolid" : "bg.neutralWeak"}
          />
        ))}
      </HStack>

      <ScreenBody gap="x6">
        {/* 이 걸음에서 무엇을 묻는지 먼저 말함. 화면마다 한 가지만 물음 */}
        <VStack align="stretch" gap="x1">
          <Text as="h1" textStyle="t7Bold" color="fg.neutral">
            {STEP_HEADING[urlStep]}
          </Text>
          {STEP_HINT[urlStep] ? (
            <Text textStyle="t3Regular" color="fg.neutralMuted">
              {STEP_HINT[urlStep]}
            </Text>
          ) : null}
        </VStack>

        {error ? <Callout tone="critical" description={error} /> : null}

        {urlStep === 1 ? (
          <>
            {/* 머리글이 이미 사진을 올려 달라고 해 이름은 장수 세는 자리로만 둠 */}
            <PhotoField
              picker={picker}
              label="사진"
              hint="얼굴이 잘 보이는 사진일수록 찾기 쉬워요"
              cameraAvailable={false}
              uploading={upload.uploading}
              disabled={upload.uploading}
            />
            {upload.message ? <Callout tone="critical" description={upload.message} /> : null}
          </>
        ) : null}

        {urlStep === 2 ? (
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

        {urlStep === 3 ? (
          <>
            {/* 머리글이 이미 어디서 봤는지 묻고 있어 같은 말을 이름표로 또 달지 않음 */}
            <Section gap="x2">
              {/* 위치는 좌표를 받고 행정동으로 바꾸느라 몇 초 걸림
                  고르는 줄을 그대로 두면 안 눌린 줄 알고 다시 누름 */}
              {findingPlace ? (
                // 동네가 들어설 줄을 미리 세워 두고 그 안에서만 돌림
                // 상자째 나타났다 사라지면 자리가 생겼다 없어져 화면이 덜컥임
                <HStack
                  align="center"
                  justify="center"
                  px="x4"
                  height={FINDING_HEIGHT}
                  borderRadius="r3"
                  bg="bg.neutralWeak"
                >
                  <ProgressCircle size="24" tone="neutral" />
                </HStack>
              ) : areaName ? (
                // 고른 뒤에는 줄 전체가 다시 고르는 자리. 값과 바꾸기를 따로 두지 않음
                <HStack
                  asChild
                  justify="space-between"
                  align="center"
                  gap="x3"
                  px="x4"
                  py="x4"
                  borderRadius="r3"
                  bg="bg.neutralWeak"
                >
                  {/* design-system-allow:raw-element 줄 전체를 누르는 자리라 button 이 필요함 */}
                  <button
                    type="button"
                    className="rebirth-row"
                    onClick={() => {
                      // 여기서는 장소만 고쳐 쓰는 것이라 시각은 두고 검색창을 바로 열어 줌
                      resetLastStep({ keepTime: true });
                      setManual(true);
                    }}
                  >
                    <HStack gap="x2" align="center" minWidth="0">
                      <Icon svg={<IconLocationpinLine />} size="x5" color="fg.brand" />
                      <Text textStyle="t5Bold" color="fg.neutral" maxLines={1}>
                        {areaName}
                      </Text>
                    </HStack>
                    <Text textStyle="t3Regular" color="fg.neutralSubtle">
                      바꾸기
                    </Text>
                  </button>
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
                  <PickRow
                    icon={<IconLocationpinLine />}
                    label="현재 위치로 찾기"
                    hint="지금 있는 곳 주변으로 찾아요"
                    onClick={() => {
                      // 이미 잡아 둔 좌표가 있으면 다시 묻지 않고 그것으로 바로 채움
                      setWantsGps(true);
                      position.request();
                    }}
                  />
                  <PickRow
                    icon={<IconMagnifyingglassLine />}
                    label="주소로 직접 찾기"
                    hint="동이나 면 이름으로 찾아요"
                    onClick={() => setManual(true)}
                  />
                </VStack>
              )}
            </Section>

            <TextField label="마지막 목격 시각">
              {/* 기본은 오른쪽 끝 아이콘을 정확히 눌러야 열림
                  칸 아무 데나 눌러도 열리게 해 좁은 화면에서 헛손질하지 않게 함 */}
              <TextFieldInput
                type="datetime-local"
                className="rebirth-datetime"
                value={occurredAt || toLocalInput(new Date())}
                max={toLocalInput(new Date())}
                onChange={(event) => setOccurredAt(event.target.value)}
                onClick={(event) => event.currentTarget.showPicker?.()}
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
        className="rebirth-bottom-bar"
      >
        <ActionButton
          variant="brandSolid"
          size="large"
          loading={submitting}
          disabled={!ready}
          onClick={urlStep === LAST_STEP ? submit : () => goTo((urlStep + 1) as LostStep)}
        >
          {urlStep === LAST_STEP ? "신고 등록하기" : "다음"}
        </ActionButton>
      </VStack>
    </Screen>
  );
}
