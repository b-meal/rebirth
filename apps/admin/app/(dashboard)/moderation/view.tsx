"use client";

import { useState } from "react";
import {
  Button,
  Card,
  CardCaption,
  CardContent,
  CardTitle,
  Chip,
  FallbackView,
  FallbackViewContent,
  FallbackViewText,
  FlexBox,
  Typography,
} from "@wanteddev/wds";
import { MODERATION_QUEUE, SIGHTINGS } from "@/lib/mock";

type Decision = "hide" | "keep";

export function ModerationView() {
  // 서버 반영 전 화면 상태. API 연결 시 mutation 결과로 대체
  const [decided, setDecided] = useState<Record<string, Decision>>({});

  const pending = MODERATION_QUEUE.filter((q) => !decided[q.sightingId]);

  return (
    <>
      <FlexBox alignItems="center" gap="8px">
        <Typography variant="title3" weight="bold">
          검수
        </Typography>
        <Typography variant="caption1">
          대기 {pending.length}건 · 전체 {MODERATION_QUEUE.length}건
        </Typography>
      </FlexBox>

      {MODERATION_QUEUE.length === 0 ? (
        <FallbackView>
          <FallbackViewContent>
            <FallbackViewText
              title="검수 대기 없음"
              description="신고가 들어온 제보가 없습니다."
            />
          </FallbackViewContent>
        </FallbackView>
      ) : (
        <FlexBox flexDirection="column" gap="8px">
          {MODERATION_QUEUE.map((q) => {
            const sighting = SIGHTINGS.find((s) => s.id === q.sightingId);
            const decision = decided[q.sightingId];

            return (
              <Card key={q.sightingId}>
                <CardContent>
                  <FlexBox alignItems="center" flexWrap="wrap" gap="6px">
                    <Chip size="xsmall" disableInteraction>
                      신고 {q.reportCount}건
                    </Chip>
                    <Typography variant="caption1">{q.reportedAt}</Typography>
                    {decision ? (
                      <Chip size="xsmall" variant="outlined" disableInteraction>
                        {decision === "hide" ? "숨김 예정" : "유지 예정"}
                      </Chip>
                    ) : null}
                  </FlexBox>
                  <CardTitle variant="headline2">
                    {sighting?.appearance ?? "목데이터에 없는 제보"}
                  </CardTitle>
                  <CardCaption variant="body2">신고 사유 {q.reason}</CardCaption>
                  <CardCaption variant="caption1">
                    {sighting?.areaName ?? "지역 미확인"}
                  </CardCaption>
                  <FlexBox gap="8px">
                    <Button
                      size="small"
                      onClick={() =>
                        setDecided((prev) => ({ ...prev, [q.sightingId]: "hide" }))
                      }
                    >
                      공개 목록에서 빼기
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() =>
                        setDecided((prev) => ({ ...prev, [q.sightingId]: "keep" }))
                      }
                    >
                      유지
                    </Button>
                  </FlexBox>
                </CardContent>
              </Card>
            );
          })}
        </FlexBox>
      )}
      <Typography variant="caption1">
        판정은 화면 상태로만 남습니다. status 를 hidden 으로 바꾸는 mutation 은
        API 연결 시 붙습니다.
      </Typography>
    </>
  );
}
