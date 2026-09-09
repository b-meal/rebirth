"use client";

import {
  FlexBox,
  RadioGroup,
  RadioGroupItem,
  SectionMessage,
  TextArea,
  Typography,
} from "@wanteddev/wds";
import type { CareSituation } from "@rebirth/types";
import { LocationPicker } from "../ui/location-picker";
import { PhotoPicker } from "../ui/photo-picker";
import { useReportDraft } from "./draft";

// unknown 은 제보 폼에서 고르지 않음. 미선택은 다음 단계를 막아 임의 저장을 피함
const CARE_OPTIONS: { value: CareSituation; label: string; hint: string }[] = [
  { value: "roaming", label: "배회 중이에요", hint: "동물을 데리고 있지 않아요" },
  { value: "in_care", label: "제가 보호 중이에요", hint: "이미 안전한 곳에서 보호 중이에요" },
];

// createReport 의 appearance 상한과 맞춤
const APPEARANCE_MAX = 300;

function StepHeading({ title, description }: { title: string; description?: string }) {
  return (
    <FlexBox flexDirection="column" gap="4px">
      <Typography variant="title3" weight="bold">
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" color="semantic.label.alternative">
          {description}
        </Typography>
      )}
    </FlexBox>
  );
}

export function StepPhoto() {
  const { draft, update, picker } = useReportDraft();

  return (
    <>
      <StepHeading
        title="어떤 동물을 발견했나요?"
        description="사진 한 장과 지금 상황만 알려 주세요"
      />

      <PhotoPicker
        picker={picker}
        label="사진 1장을 골라주세요"
        hint="JPG·PNG·HEIC · 최대 8MB"
      />

      <SectionMessage variant="info" open>
        얼굴과 연락처가 보이지 않는 사진을 골라 주세요
      </SectionMessage>

      <FlexBox flexDirection="column" gap="12px">
        <Typography variant="label1" weight="bold" color="semantic.label.normal">
          현재 보호 상황
        </Typography>
        <RadioGroup
          // 미선택도 빈 문자열로 넘겨 제어 상태를 유지함
          value={draft.careSituation ?? ""}
          onValueChange={(value) => update({ careSituation: value as CareSituation })}
        >
          <FlexBox flexDirection="column" gap="8px">
            {CARE_OPTIONS.map((option) => (
              // Radio 는 라벨을 받지 않아 label 로 감싸 클릭과 읽기 순서를 잇음
              <label
                key={option.value}
                style={{ display: "flex", gap: 8, alignItems: "flex-start", cursor: "pointer" }}
              >
                <RadioGroupItem value={option.value} />
                <FlexBox flexDirection="column">
                  <Typography variant="body1">{option.label}</Typography>
                  <Typography variant="caption1" color="semantic.label.alternative">
                    {option.hint}
                  </Typography>
                </FlexBox>
              </label>
            ))}
          </FlexBox>
        </RadioGroup>
      </FlexBox>
    </>
  );
}

export function StepLocation() {
  const { draft, update } = useReportDraft();

  return (
    <>
      <StepHeading
        title="어디에서 만났나요?"
        description="현장을 떠났어도 직접 입력할 수 있어요"
      />

      <LocationPicker
        initialCenter={draft.point ?? undefined}
        onSelect={({ point, areaName, fullName, placeName }) =>
          update({ point, area: { areaName, fullName, placeName } })
        }
      />

      {draft.area && (
        <SectionMessage variant="positive" open>
          {draft.area.placeName
            ? `${draft.area.placeName} · ${draft.area.areaName}`
            : draft.area.fullName}
        </SectionMessage>
      )}
    </>
  );
}

export function StepAppearance() {
  const { draft, update } = useReportDraft();

  return (
    <>
      <StepHeading
        title="특징이 맞는지 확인해 주세요"
        description="AI 초안 · 수정 가능"
      />

      <SectionMessage variant="info" open>
        AI 초안은 아직 연결 전이라 직접 입력해 주세요
      </SectionMessage>

      <FlexBox flexDirection="column" gap="8px">
        <Typography variant="label1" weight="bold" color="semantic.label.normal">
          외형 설명
        </Typography>
        <TextArea
          value={draft.appearance}
          maxLength={APPEARANCE_MAX}
          minRows={4}
          placeholder="흰색 소형견이며 털이 긴 편이에요"
          onChange={(event) => update({ appearance: event.target.value })}
        />
        <Typography variant="caption1" color="semantic.label.assistive">
          품종은 단정하지 않고 추정으로 적어 주세요
        </Typography>
      </FlexBox>
    </>
  );
}

export function StepConfirm() {
  const { draft, picker } = useReportDraft();
  const photo = picker.photos[0];
  const care = CARE_OPTIONS.find((option) => option.value === draft.careSituation);

  return (
    <>
      <StepHeading
        title="이 내용으로 공개됩니다"
        description="정확한 위치와 집 주소는 공개하지 않아요"
      />

      {photo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photo.previewUrl}
          alt="선택한 사진"
          style={{ width: "100%", borderRadius: 12 }}
        />
      )}

      <FlexBox flexDirection="column" gap="12px">
        <SummaryRow label="보호 상황" value={care?.label ?? "-"} />
        <SummaryRow label="목격 장소" value={draft.area?.areaName ?? "-"} />
        <SummaryRow label="외형" value={draft.appearance || "-"} />
      </FlexBox>

      <SectionMessage variant="info" open>
        저장 API 연결 전이라 아직 제보를 보낼 수 없어요. 다시집 저장은 공식 신고 접수와
        별개예요
      </SectionMessage>
    </>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <FlexBox flexDirection="column" gap="2px">
      <Typography variant="caption1" color="semantic.label.alternative">
        {label}
      </Typography>
      <Typography variant="body1">{value}</Typography>
    </FlexBox>
  );
}
