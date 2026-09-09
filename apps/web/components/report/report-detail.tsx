"use client";

import { FLAG_REASON_LABEL, type FlagReason } from "@rebirth/types";
import { useCallback, useEffect, useState } from "react";
import {
  Button,
  Dialog,
  Flex,
  Heading,
  Image,
  Portal,
  Separator,
  Skeleton,
  Text,
} from "@chakra-ui/react";

import { Chip } from "@/components/ui/chip";
import { SectionMessage } from "@/components/ui/section-message";

// 제보 상세. 사진은 비공개 버킷에 있어 서명 URL 로만 노출
// 목격 시각은 절대 시각. 상대 시간은 목록에서만 씀

type PublicReport = {
  id: string;
  careSituation: "roaming" | "in_care" | "unknown";
  animalType: "dog" | "cat" | "other" | "unknown";
  appearance: string | null;
  colors: string[];
  size: "small" | "medium" | "large" | "unknown";
  conditionTags: string[];
  collar: boolean | null;
  injury: boolean | null;
  earTip: boolean | null;
  areaName: string | null;
  occurredAt: Date | string;
  shareCount: number;
};

const CARE_LABEL: Record<PublicReport["careSituation"], string> = {
  roaming: "배회 중",
  in_care: "제보자 보호 중",
  unknown: "확인 중",
};

const ANIMAL_LABEL: Record<PublicReport["animalType"], string> = {
  dog: "개",
  cat: "고양이",
  other: "그 외",
  unknown: "확인 어려움",
};

const SIZE_LABEL: Record<PublicReport["size"], string> = {
  small: "소형",
  medium: "중형",
  large: "대형",
  unknown: "크기 미확인",
};

function formatAbsolute(value: Date | string): string {
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export type ReportDetailProps = {
  report: PublicReport;
  shareUrl: string;
};

export function ReportDetail({ report, shareUrl }: ReportDetailProps) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoState, setPhotoState] = useState<"loading" | "ready" | "expired">(
    "loading",
  );
  const [copied, setCopied] = useState(false);
  const [flagOpen, setFlagOpen] = useState(false);
  const [flagSent, setFlagSent] = useState(false);

  // 서명 URL 을 받아옴. 상태 갱신은 응답이 온 뒤에만 해 렌더 연쇄를 만들지 않음
  const loadPhoto = useCallback(async () => {
    try {
      const response = await fetch(`/api/reports/${report.id}/photo`);
      if (!response.ok) return { state: "expired" as const, url: null };

      const body = (await response.json()) as { photos?: { url: string }[] };
      const first = body.photos?.[0]?.url;
      if (!first) return { state: "expired" as const, url: null };

      return { state: "ready" as const, url: first };
    } catch {
      return { state: "expired" as const, url: null };
    }
  }, [report.id]);

  const apply = useCallback(
    (outcome: { state: "ready" | "expired"; url: string | null }) => {
      setPhotoUrl(outcome.url);
      setPhotoState(outcome.state);
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    void loadPhoto().then((outcome) => {
      if (!cancelled) apply(outcome);
    });
    return () => {
      cancelled = true;
    };
  }, [loadPhoto, apply]);

  const share = useCallback(async () => {
    const text = `${report.areaName ?? "위치 미확인"}에서 목격된 발견동물 제보입니다`;
    // 공유 횟수는 지표용이라 실패해도 화면을 막지 않음
    void fetch(`/api/reports/${report.id}/share`, { method: "POST" });

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "다시집 제보", text, url: shareUrl });
        return;
      } catch {
        // 사용자가 취소하면 아무것도 하지 않음
        return;
      }
    }
    // 미지원 브라우저는 링크 복사로 대체
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 클립보드도 막히면 사용자가 주소창에서 복사
    }
  }, [report.id, report.areaName, shareUrl]);

  const sendFlag = useCallback(
    async (reason: FlagReason) => {
      try {
        await fetch(`/api/reports/${report.id}/flag`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ reason }),
        });
      } catch {
        // 접수 실패도 사용자에게는 같은 안내로 닫음
      }
      setFlagSent(true);
    },
    [report.id],
  );

  const features = [
    ANIMAL_LABEL[report.animalType],
    SIZE_LABEL[report.size],
    ...report.colors,
    ...report.conditionTags,
    report.collar === true ? "목줄 있음" : null,
    report.injury === true ? "부상 있음" : null,
    report.earTip === true ? "귀 끝 절단" : null,
  ].filter((v): v is string => Boolean(v));

  return (
    <Flex direction="column" gap="4" padding="4" paddingBottom="24">
      {photoState === "loading" ? (
        <Skeleton width="100%" height="280px" />
      ) : photoState === "ready" && photoUrl ? (
        <Image
          src={photoUrl}
          alt="제보된 동물 사진"
          width="100%"
          aspectRatio="4 / 3"
          objectFit="cover"
          borderRadius="card"
          display="block"
        />
      ) : (
        <Flex direction="column" gap="2">
          <SectionMessage variant="info">사진 주소가 만료됐습니다</SectionMessage>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setPhotoState("loading");
              void loadPhoto().then(apply);
            }}
          >
            사진 다시 불러오기
          </Button>
        </Flex>
      )}

      <Flex gap="1.5" align="center" wrap="wrap">
        <Chip
          size="small"
          readOnly
          outlined={report.careSituation === "in_care"}
          active={report.careSituation !== "in_care"}
        >
          {CARE_LABEL[report.careSituation]}
        </Chip>
        {report.injury === true ? (
          <Chip size="small" readOnly outlined>
            주의
          </Chip>
        ) : null}
      </Flex>

      <Flex direction="column" gap="1.5">
        <Flex gap="1.5" align="center" wrap="wrap">
          <Heading size="lg">외형</Heading>
          <Chip size="xsmall" outlined readOnly>
            AI 초안, 수정 가능
          </Chip>
        </Flex>
        <Text whiteSpace="pre-wrap">
          {report.appearance ?? "외형 설명이 없습니다"}
        </Text>
      </Flex>

      <Flex gap="1.5" wrap="wrap">
        {features.map((feature) => (
          <Chip key={feature} size="small" readOnly>
            {feature}
          </Chip>
        ))}
      </Flex>

      <Separator />

      <Flex direction="column" gap="1">
        <Text textStyle="sm" color="fg.alternative">
          목격 지역
        </Text>
        <Text>{report.areaName ?? "위치 미확인"}</Text>
        <Text textStyle="sm" color="fg.alternative" marginTop="2">
          목격 시각
        </Text>
        <Text>{formatAbsolute(report.occurredAt)}</Text>
      </Flex>

      <Flex direction="column" gap="2" marginTop="2">
        <Button width="100%" colorPalette="brand" onClick={share}>
          {copied ? "링크를 복사했습니다" : "공유하기"}
        </Button>
        <Button
          width="100%"
          variant="outline"
          size="sm"
          onClick={() => setFlagOpen(true)}
        >
          이 제보 신고하기
        </Button>
      </Flex>

      <Dialog.Root
        open={flagOpen}
        onOpenChange={(details) => setFlagOpen(details.open)}
        placement="bottom"
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Header>
                <Dialog.Title>
                  {flagSent ? "신고를 접수했습니다" : "신고 사유"}
                </Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                {flagSent ? (
                  <Text>
                    확인 후 조치합니다. 접수만으로 제보가 바로 숨겨지지는 않습니다
                  </Text>
                ) : (
                  <Flex direction="column" gap="2">
                    {(Object.keys(FLAG_REASON_LABEL) as FlagReason[]).map((reason) => (
                      <Button
                        key={reason}
                        variant="outline"
                        width="100%"
                        onClick={() => void sendFlag(reason)}
                      >
                        {FLAG_REASON_LABEL[reason]}
                      </Button>
                    ))}
                  </Flex>
                )}
              </Dialog.Body>
              <Dialog.Footer>
                <Button
                  variant="outline"
                  width="100%"
                  onClick={() => {
                    setFlagOpen(false);
                    setFlagSent(false);
                  }}
                >
                  닫기
                </Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </Flex>
  );
}
