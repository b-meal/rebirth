"use client";

import { useState } from "react";
import {
  AbsoluteCenter,
  Box,
  Button,
  Flex,
  HStack,
  ProgressCircle,
  Skeleton,
  Spinner,
  Text,
} from "@chakra-ui/react";

import { Banner } from "@/components/ui/banner";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorView } from "@/components/ui/error-view";
import { Icon } from "@/components/ui/icons";
import { ResultView } from "@/components/ui/result-view";
import { SectionMessage } from "@/components/ui/section-message";
import { toaster } from "@/components/ui/toaster";

import { Demo, Spec, SpecTable, Token, TokenRow, Usage } from "./spec";

// 상태와 결과를 알리는 절, 같은 소식을 어느 세기로 전할지 고르는 기준을 함께 둠

// 반원 게이지, Chakra 에 없어 호 하나를 stroke-dasharray 로 잘라 그림
const ARC_LENGTH = Math.PI * 48;

function Gauge({ value, label }: { value: number; label: string }) {
  return (
    <Flex direction="column" align="center" gap="1" flex="1" minWidth="0">
      <Box width="100%" maxWidth="160px">
        <svg viewBox="0 0 120 70" width="100%" role="img" aria-label={`${label} ${value}퍼센트`}>
          <path
            d="M 12 60 A 48 48 0 0 1 108 60"
            fill="none"
            strokeWidth="10"
            strokeLinecap="round"
            stroke="var(--chakra-colors-bg-emphasized)"
          />
          <path
            d="M 12 60 A 48 48 0 0 1 108 60"
            fill="none"
            strokeWidth="10"
            strokeLinecap="round"
            stroke="var(--chakra-colors-brand-solid)"
            strokeDasharray={`${(value / 100) * ARC_LENGTH} ${ARC_LENGTH}`}
          />
        </svg>
      </Box>
      <Text textStyle="title3">{value}%</Text>
      <Text textStyle="caption" color="fg.assistive">
        {label}
      </Text>
    </Flex>
  );
}

const REPORTS = [
  { title: "흰색 소형견, 말티즈 계열 추정", place: "서울 마포구 연남동" },
  { title: "갈색 중형견, 진돗개 계열 추정", place: "서울 마포구 성산동" },
  { title: "삼색 고양이, 성묘로 보임", place: "서울 마포구 망원동" },
];

export function FeedbackCatalog() {
  const [messageOpen, setMessageOpen] = useState(true);
  const [bannerOpen, setBannerOpen] = useState(true);
  const [pending, setPending] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = () => {
    setPending(true);
    window.setTimeout(() => {
      setPending(false);
      setLoaded(true);
    }, 900);
  };

  return (
    <>
      <Spec
        id="section-message"
        title="Section Message"
        description="사용자가 고쳐야 하는 것을 그 자리에 남깁니다. 지나가면 안 되는 소식이라 토스트로 보내지 않습니다."
      >
        <Demo label="variant">
          <SectionMessage variant="info">
            공개 목록에는 행정동까지만 보입니다.
          </SectionMessage>
          <SectionMessage variant="positive">
            제보가 등록됐습니다. 확인할 후보가 생기면 알려 드립니다.
          </SectionMessage>
          <SectionMessage variant="cautionary">
            사진이 어두워 특징을 읽기 어렵습니다. 밝은 곳에서 한 장 더 올려 주십시오.
          </SectionMessage>
          <SectionMessage variant="negative">
            위치를 가져오지 못했습니다. 주소를 직접 입력해 주십시오.
          </SectionMessage>
        </Demo>

        <Demo label="닫을 수 있는 안내" note="onClose 를 넘긴 곳에만 닫기 버튼이 붙습니다">
          {messageOpen ? (
            <SectionMessage variant="info" onClose={() => setMessageOpen(false)}>
              특징 문구는 AI 초안이라 언제든 고칠 수 있습니다.
            </SectionMessage>
          ) : (
            <Button size="sm" variant="subtle" colorPalette="gray" onClick={() => setMessageOpen(true)}>
              닫은 안내 다시 보기
            </Button>
          )}
        </Demo>

        <SpecTable
          rows={[
            ["모서리", <Token key="r">card</Token>],
            ["안쪽 여백", "16"],
            ["바탕", "상태별 subtle, 글자는 상태별 fg"],
            ["아이콘", "20, 첫 줄 높이에 맞춰 위 정렬"],
            ["닫기", "onClose 를 넘긴 곳에만, 24 버튼"],
            ["터치 영역", "닫기 44 확보, 본문은 비대화형"],
          ]}
        />

        <Usage
          code={`import { SectionMessage } from "@/components/ui/section-message";

<SectionMessage variant="negative">위치를 가져오지 못했습니다</SectionMessage>`}
        />
      </Spec>

      <Spec
        id="banner"
        title="Banner"
        description="소개와 유도 문구 전용입니다. 오류와 경고는 SectionMessage 가 맡습니다."
      >
        <Demo label="tone" variant="bare">
          <Banner
            tone="brand"
            icon="paw"
            title="길에서 동물을 보셨나요"
            description="사진 한 장이면 발견동물 제보를 시작할 수 있습니다."
          />
          <Banner
            tone="neutral"
            title="정확한 위치는 저장되지 않습니다"
            description="공개 화면에는 행정동까지만 보입니다."
          />
        </Demo>

        <Demo label="동작 하나" variant="bare" note="배너 안 버튼은 sm plain 으로 두어 본문 무게를 넘지 않게 합니다">
          <Banner
            tone="brand"
            icon="info"
            title="AI 초안, 수정 가능"
            description="특징 문구는 초안으로 채워 두고 제보자가 고칩니다."
            action={
              <Button size="sm" variant="plain">
                어떻게 만드는지 보기
              </Button>
            }
          />
        </Demo>

        <Demo label="닫을 수 있는 배너" variant="bare">
          {bannerOpen ? (
            <Banner
              tone="neutral"
              icon="bell"
              title="알림을 켜면 후보를 바로 받습니다"
              onClose={() => setBannerOpen(false)}
            />
          ) : (
            <Button size="sm" variant="subtle" colorPalette="gray" onClick={() => setBannerOpen(true)}>
              닫은 배너 다시 보기
            </Button>
          )}
        </Demo>

        <SpecTable
          rows={[
            ["모서리", <Token key="r">card</Token>],
            ["안쪽 여백", "16"],
            ["바탕", "brand 는 brand.subtle, neutral 은 bg.subtle"],
            ["아이콘 원", "36, 바탕은 brand.muted 또는 bg.emphasized"],
            ["제목", "bodyStrong, 설명은 bodySm fg.alternative"],
            ["동작", "본문 아래 한 개만, 링크나 plain 버튼"],
          ]}
        />
      </Spec>

      <Spec
        id="empty-state"
        title="Empty State"
        description="정상인데 아직 아무것도 없는 상태입니다. 고장은 Error View 로 보냅니다."
      >
        <Demo label="아이콘과 다음 행동">
          <EmptyState
            icon={<Icon name="search" size={40} />}
            title="조건에 맞는 제보가 없습니다"
            description="반경을 넓히거나 필터를 지우면 더 볼 수 있습니다."
            action={
              <Button size="sm" variant="subtle" colorPalette="gray">
                필터 지우기
              </Button>
            }
          />
        </Demo>

        <Demo label="짧은 형태" note="목록 안 작은 자리에는 아이콘을 빼고 두 줄로 줄입니다">
          <EmptyState
            title="아직 확인할 후보가 없습니다"
            description="새 제보가 들어오면 이 자리에 쌓입니다."
          />
        </Demo>
      </Spec>

      <Spec
        id="callout"
        title="Callout"
        description="본문 흐름 안에서 한두 문장을 도드라지게 합니다. 상태를 알리는 것이 아니므로 SectionMessage 와 다릅니다."
      >
        <Demo
          label="브랜드 강조"
          variant="bare"
          note={<>왼쪽 세로선 4px 과 <Token>bg.subtle</Token> 바탕만 쓰고 제목은 두지 않습니다</>}
        >
          <Box
            borderStartWidth="4px"
            borderStartStyle="solid"
            borderColor="brand.solid"
            backgroundColor="bg.subtle"
            borderEndRadius="control"
            paddingInline="4"
            paddingBlock="3"
          >
            <Text textStyle="bodySm">
              공개 목록에는 행정동까지만 보입니다. 정확한 위치는 제보자와 담당 기관만 확인합니다.
            </Text>
          </Box>
        </Demo>

        <Demo label="조용한 강조" variant="bare">
          <Box
            borderStartWidth="4px"
            borderStartStyle="solid"
            borderColor="border.emphasized"
            backgroundColor="bg.subtle"
            borderEndRadius="control"
            paddingInline="4"
            paddingBlock="3"
          >
            <Text textStyle="bodySm" color="fg.alternative">
              품종은 단정하지 않습니다. 흰색 소형견, 말티즈 계열 추정처럼 본 대로 적습니다.
            </Text>
          </Box>
        </Demo>

        <Demo label="무엇을 어디에">
          <TokenRow name="Callout" value="문서 안 강조" />
          <TokenRow name="SectionMessage" value="상태 알림" />
          <TokenRow name="Banner" value="소개와 유도" />
        </Demo>
      </Spec>

      <Spec
        id="result-view"
        title="Result View"
        description="화면 하나를 통째로 쓰는 결과 안내입니다. 다음에 할 일을 버튼으로 반드시 남깁니다."
      >
        <Demo label="success" variant="screen">
          <ResultView
            status="success"
            title="제보가 등록됐습니다"
            description="가까운 이웃에게 먼저 보입니다. 확인할 후보가 생기면 알려 드립니다."
          >
            <Button size="xl" width="100%">
              제보 확인하기
            </Button>
            <Button width="100%" variant="subtle" colorPalette="gray">
              홈으로
            </Button>
          </ResultView>
        </Demo>

        <Demo label="error" variant="screen">
          <ResultView
            status="error"
            title="제보를 저장하지 못했습니다"
            description="쓰던 내용은 그대로 두었습니다. 잠시 뒤 다시 시도해 주십시오."
          >
            <Button size="xl" width="100%">
              다시 시도
            </Button>
          </ResultView>
        </Demo>

        <Demo label="info" variant="screen">
          <ResultView
            status="info"
            title="확인 중인 제보입니다"
            description="관리자가 사진과 위치를 보고 있습니다. 보통 하루 안에 끝납니다."
          />
        </Demo>

        <Demo label="brand" variant="screen" note="서비스 소개와 온보딩 마지막 장에 씁니다">
          <ResultView
            status="brand"
            title="다시집에 오신 것을 환영합니다"
            description="길에서 만난 동물을 집으로 돌려보내는 가장 빠른 길을 함께 찾습니다."
          >
            <Button size="xl" width="100%">
              시작하기
            </Button>
          </ResultView>
        </Demo>
      </Spec>

      <Spec
        id="error-view"
        title="Error View"
        description="화면을 그리지 못했을 때 원인과 다음 행동만 알립니다. 스택과 좌표와 키는 넣지 않습니다."
      >
        <Demo
          label="요청 번호까지"
          variant="screen"
          note="연결이 끊기면 제목과 설명을 오프라인 문구로 바꿔 그립니다"
        >
          <ErrorView
            title="화면을 불러오지 못했습니다"
            description="잠시 뒤 다시 시도해 주십시오. 계속 같으면 요청 번호와 함께 알려 주십시오."
            requestId="req_8f21c0a4"
            onRetry={() => toaster.create({ title: "다시 시도했습니다" })}
          />
        </Demo>

        <Demo label="쓰는 자리">
          <TokenRow name="없는 주소" value="404" />
          <TokenRow name="권한 없음" value="403" />
          <TokenRow name="서버 오류" value="500" />
          <TokenRow name="연결 끊김" value="offline" />
        </Demo>
      </Spec>

      <Spec
        id="progress-ring"
        title="Progress Ring"
        description="자리를 적게 쓰는 진행 표시입니다. 목록 행이나 카드 모서리처럼 막대를 놓을 수 없는 자리에 씁니다."
      >
        <Demo label="size" variant="row">
          <ProgressCircle.Root value={35} size="sm">
            <ProgressCircle.Circle>
              <ProgressCircle.Track />
              <ProgressCircle.Range />
            </ProgressCircle.Circle>
          </ProgressCircle.Root>
          <ProgressCircle.Root value={60} size="md">
            <ProgressCircle.Circle>
              <ProgressCircle.Track />
              <ProgressCircle.Range />
            </ProgressCircle.Circle>
            <AbsoluteCenter>
              <ProgressCircle.ValueText textStyle="caption" />
            </AbsoluteCenter>
          </ProgressCircle.Root>
          <ProgressCircle.Root value={85} size="lg">
            <ProgressCircle.Circle>
              <ProgressCircle.Track />
              <ProgressCircle.Range />
            </ProgressCircle.Circle>
            <AbsoluteCenter>
              <ProgressCircle.ValueText textStyle="label" />
            </AbsoluteCenter>
          </ProgressCircle.Root>
        </Demo>

        <Demo
          label="미확정"
          variant="row"
          note={<>끝을 모르면 <Token>value=&#123;null&#125;</Token> 로 두어 도는 모양으로 바꿉니다</>}
        >
          <ProgressCircle.Root value={null} size="md">
            <ProgressCircle.Circle>
              <ProgressCircle.Track />
              <ProgressCircle.Range />
            </ProgressCircle.Circle>
          </ProgressCircle.Root>
          <HStack gap="2" textStyle="bodySm" color="fg.alternative">
            <Text>사진을 살펴보는 중</Text>
          </HStack>
        </Demo>

        <Demo label="글자와 함께" variant="row">
          <HStack gap="3">
            <ProgressCircle.Root value={72} size="md">
              <ProgressCircle.Circle>
                <ProgressCircle.Track />
                <ProgressCircle.Range />
              </ProgressCircle.Circle>
            </ProgressCircle.Root>
            <Flex direction="column" gap="0.5" minWidth="0">
              <Text textStyle="bodyStrong">사진 올리는 중</Text>
              <Text textStyle="caption" color="fg.assistive">
                3장 중 2장 완료
              </Text>
            </Flex>
          </HStack>
        </Demo>
      </Spec>

      <Spec
        id="gauge"
        title="Gauge"
        description="0에서 100까지 한눈에 보는 반원 표시입니다. 값 하나를 크게 보여 줄 때만 쓰고 목록 안에는 넣지 않습니다."
      >
        <Demo label="값 두 개 비교" variant="row">
          <Gauge value={72} label="제보 처리율" />
          <Gauge value={28} label="확인 대기" />
        </Demo>

        <Demo
          label="낮은 값"
          variant="row"
          note="Chakra 에 없어 호 하나를 stroke-dasharray 로 자르고 role img 와 aria-label 을 답니다"
        >
          <Gauge value={8} label="오늘 새 제보" />
        </Demo>
      </Spec>

      <Spec
        id="loading"
        title="Loading Pattern"
        description="기다리는 시간을 어떻게 채울지 정합니다. 같은 화면에서 스켈레톤과 스피너를 섞지 않습니다."
      >
        <Demo label="고르는 기준">
          <TokenRow name="스켈레톤" value="구조가 정해진 목록" />
          <TokenRow name="스피너" value="1초 안팎 짧은 동작" />
          <TokenRow name="진행 막대" value="단계가 있는 작업" />
        </Demo>

        <Demo label="목록이 채워지는 과정" note="뼈대와 실제 카드의 높이를 같게 두어 화면이 튀지 않게 합니다">
          <Flex direction="column" gap="3">
            {loaded
              ? REPORTS.map((report) => (
                  <Flex key={report.title} gap="3" align="center">
                    <Flex
                      boxSize="16"
                      flexShrink={0}
                      align="center"
                      justify="center"
                      borderRadius="control"
                      backgroundColor="bg.alternative"
                      color="fg.assistive"
                    >
                      <Icon name="paw" size={24} />
                    </Flex>
                    <Flex direction="column" gap="1" flex="1" minWidth="0">
                      <Text textStyle="bodyStrong" truncate>
                        {report.title}
                      </Text>
                      <Text textStyle="bodySm" color="fg.alternative" truncate>
                        {report.place}
                      </Text>
                    </Flex>
                  </Flex>
                ))
              : REPORTS.map((report) => (
                  <Flex key={report.title} gap="3" align="center">
                    <Skeleton boxSize="16" borderRadius="control" flexShrink={0} />
                    <Flex direction="column" gap="2" flex="1" minWidth="0">
                      <Skeleton height="4" width="70%" />
                      <Skeleton height="3" width="45%" />
                    </Flex>
                  </Flex>
                ))}
          </Flex>
          <Flex gap="2">
            <Button
              flex="1"
              size="sm"
              loading={pending}
              loadingText="불러오는 중"
              onClick={load}
            >
              불러오기 흉내
            </Button>
            <Button
              flex="1"
              size="sm"
              variant="subtle"
              colorPalette="gray"
              onClick={() => setLoaded(false)}
            >
              비우기
            </Button>
          </Flex>
        </Demo>

        <Demo label="짧은 동작" variant="row">
          <HStack gap="2" textStyle="bodySm" color="fg.alternative">
            <Spinner size="sm" />
            <Text>위치를 확인하는 중</Text>
          </HStack>
        </Demo>

        <Demo label="화면을 막는 경우" note="저장처럼 되돌리기 어려운 동작만 버튼 자체를 잠급니다">
          <Box>
            <Button size="xl" width="100%" loading loadingText="제보 등록 중">
              제보 등록
            </Button>
          </Box>
        </Demo>
      </Spec>
    </>
  );
}
