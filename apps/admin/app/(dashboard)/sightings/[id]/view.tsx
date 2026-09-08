"use client";

import {
  Card,
  CardCaption,
  CardContent,
  CardTitle,
  Chip,
  Divider,
  FallbackView,
  FallbackViewContent,
  FallbackViewText,
  FlexBox,
  Typography,
} from "@wanteddev/wds";
import {
  ANIMAL_LABEL,
  CUSTODY_LABEL,
  MATCHES,
  SIGHTINGS,
  SIZE_LABEL,
  STATUS_LABEL,
} from "@/lib/mock";

const BREAKDOWN_LABEL = {
  distance: "거리 35",
  time: "시간 25",
  color: "털색 20",
  size: "크기 10",
  feature: "특징 10",
} as const;

export function SightingDetailView({ id }: { id: string }) {
  const sighting = SIGHTINGS.find((s) => s.id === id);
  const matches = MATCHES.filter((m) => m.sightingId === id);

  if (!sighting) {
    return (
      <>
        <Typography variant="title3" weight="bold">
          제보 상세
        </Typography>
        <FallbackView>
          <FallbackViewContent>
            <FallbackViewText
              title="목데이터에 없는 식별자"
              description="API 연결 전이라 lib/mock 에 담긴 제보만 열립니다."
            />
          </FallbackViewContent>
        </FallbackView>
      </>
    );
  }

  const flags = [
    sighting.collar ? "목줄 또는 하네스" : null,
    sighting.injury ? "눈에 보이는 부상" : null,
    sighting.earTip ? "귀 끝 잘림" : null,
  ].filter((v): v is string => v !== null);

  return (
    <>
      <FlexBox alignItems="center" flexWrap="wrap" gap="8px">
        <Typography variant="title3" weight="bold">
          제보 상세
        </Typography>
        <Chip size="xsmall" variant="outlined" disableInteraction>
          {STATUS_LABEL[sighting.status]}
        </Chip>
        <Chip size="xsmall" variant="outlined" disableInteraction>
          {CUSTODY_LABEL[sighting.custody]}
        </Chip>
      </FlexBox>

      <Card>
        <CardContent>
          <CardCaption variant="caption1">AI 초안, 수정 가능</CardCaption>
          <CardTitle variant="headline1">{sighting.appearance}</CardTitle>
          <Divider />
          <FlexBox flexDirection="column" gap="4px">
            <Typography variant="body2">
              종류 {ANIMAL_LABEL[sighting.animalType]} · 크기{" "}
              {SIZE_LABEL[sighting.size]} · 털색{" "}
              {sighting.colors.join(", ") || "미기재"}
            </Typography>
            <Typography variant="body2">
              목격 시각 {sighting.sightedAt} · 지역 {sighting.areaName}
            </Typography>
            <Typography variant="caption1">
              정확 좌표는 서버에서만 읽습니다. 이 화면에 표시하지 않습니다.
            </Typography>
          </FlexBox>
          <FlexBox flexWrap="wrap" gap="6px">
            {sighting.conditionTags.map((tag) => (
              <Chip key={tag} size="xsmall" disableInteraction>
                {tag}
              </Chip>
            ))}
            {flags.map((flag) => (
              <Chip key={flag} size="xsmall" variant="outlined" disableInteraction>
                {flag}
              </Chip>
            ))}
          </FlexBox>
          <Typography variant="caption1">
            사용자가 고친 필드{" "}
            {sighting.aiEditedFields.length > 0
              ? sighting.aiEditedFields.join(", ")
              : "없음"}
          </Typography>
        </CardContent>
      </Card>

      <Typography variant="headline1" weight="bold">
        확인할 후보 {matches.length}건
      </Typography>
      {matches.length === 0 ? (
        <FallbackView padding="compact">
          <FallbackViewContent>
            <FallbackViewText
              title="후보 없음"
              description="실종 신고와 겹치는 항목이 아직 없습니다."
            />
          </FallbackViewContent>
        </FallbackView>
      ) : (
        <FlexBox flexDirection="column" gap="8px">
          {matches.map((m) => (
            <Card key={m.lostId}>
              <CardContent>
                <FlexBox alignItems="center" gap="8px">
                  <CardTitle variant="headline2">{m.score}점</CardTitle>
                  <CardCaption variant="caption1">
                    유사도이며 동일 개체 확정이 아닙니다
                  </CardCaption>
                </FlexBox>
                <Typography variant="body2">{m.reason}</Typography>
                <FlexBox flexWrap="wrap" gap="6px">
                  {Object.entries(m.breakdown).map(([key, value]) => (
                    <Chip key={key} size="xsmall" variant="outlined" disableInteraction>
                      {BREAKDOWN_LABEL[key as keyof typeof BREAKDOWN_LABEL]} 중{" "}
                      {value}
                    </Chip>
                  ))}
                </FlexBox>
              </CardContent>
            </Card>
          ))}
        </FlexBox>
      )}
    </>
  );
}
