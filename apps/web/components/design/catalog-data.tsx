"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Accordion,
  AspectRatio,
  Avatar,
  AvatarGroup,
  Box,
  Button,
  Card,
  Carousel,
  Clipboard,
  CodeBlock,
  DataList,
  Flex,
  IconButton,
  Image,
  Input,
  Marquee,
  QrCode,
  SimpleGrid,
  Skeleton,
  Stat,
  Switch,
  Table,
  Text,
  Timeline,
} from "@chakra-ui/react";

import { Chip } from "@/components/ui/chip";
import { Icon } from "@/components/ui/icons";
import { ListGroup, ListItem } from "@/components/ui/list-item";
import { ScrollRow } from "@/components/ui/screen";

import { Demo, Spec, SpecTable, ThemeStage, Token, Usage } from "./spec";

// Data Display 카탈로그, 제보 내용을 담아 보여 주는 틀만 모음

const PHOTO = "/logo/logo-mark-512.png";
const SHARE_URL = "https://dasijip.example/r/abc123";

const REPORT = {
  title: "흰색 소형견, 말티즈 계열 추정",
  area: "서울 마포구 연남동",
  time: "2026년 9월 9일 오후 3시 20분",
} as const;

function CardSection() {
  return (
    <Spec
      id="card"
      title="Card"
      description="제보 하나를 통째로 담는 가장 큰 단위입니다. 모서리는 card 토큰으로 고정하고 그림자는 elevated 에서만 씁니다."
    >
      <Demo label="변형 세 가지">
        {(
          [
            { variant: "elevated", note: "떠 보이게 할 때" },
            { variant: "outline", note: "목록의 기본" },
            { variant: "subtle", note: "배경과 묶을 때" },
          ] as const
        ).map((item) => (
          <Card.Root key={item.variant} variant={item.variant} borderRadius="card">
            <Card.Body gap="1">
              <Card.Title textStyle="heading">{item.variant}</Card.Title>
              <Card.Description textStyle="bodySm">{item.note}</Card.Description>
            </Card.Body>
          </Card.Root>
        ))}
      </Demo>

      <Demo label="제보 카드" note="품종은 단정하지 않고 털색과 크기로만 부릅니다">
        <Card.Root variant="outline" borderRadius="card">
          <Card.Body gap="0.5">
            <Card.Title textStyle="bodyStrong">{REPORT.title}</Card.Title>
            <Text textStyle="bodySm" color="fg.alternative">
              {REPORT.area}
            </Text>
            <Text textStyle="caption" color="fg.assistive">
              {REPORT.time}
            </Text>
            <Flex gap="1.5" wrap="wrap" marginTop="2.5">
              <Chip readOnly size="xsmall">
                배회 중
              </Chip>
              <Chip readOnly size="xsmall" color="fg.error">
                다친 것으로 보임
              </Chip>
            </Flex>
          </Card.Body>
        </Card.Root>
      </Demo>

      <Demo label="가로형" note="목록에서 사진을 함께 보여 줄 때 씁니다">
        <Card.Root variant="outline" borderRadius="card">
          <Flex gap="3" padding="3" align="center" minWidth="0">
            <AspectRatio ratio={1} width="88px" flexShrink={0}>
              <Box backgroundColor="brand.muted" borderRadius="control" />
            </AspectRatio>
            <Box flex="1" minWidth="0">
              <Text textStyle="bodyStrong" truncate>
                {REPORT.title}
              </Text>
              <Text textStyle="bodySm" color="fg.alternative" truncate>
                {REPORT.area}
              </Text>
              <Text textStyle="caption" color="fg.assistive">
                2026년 9월 9일
              </Text>
            </Box>
          </Flex>
        </Card.Root>
      </Demo>

      <Demo label="누를 수 있는 카드" note="카드 전체가 링크라 키보드 이동과 새 탭 열기가 그대로 동작합니다">
        <Card.Root
          asChild
          variant="outline"
          borderRadius="card"
          color="inherit"
          textDecoration="none"
          _active={{ backgroundColor: "bg.subtle" }}
        >
          <Link href="#data/card">
            <Card.Body gap="1">
              <Flex align="center" gap="2">
                <Card.Title textStyle="bodyStrong" flex="1" minWidth="0">
                  확인할 후보 2건
                </Card.Title>
                <Box color="fg.assistive">
                  <Icon name="forward" size={18} />
                </Box>
              </Flex>
              <Card.Description textStyle="bodySm">
                특징이 비슷한 제보를 모아 둡니다. 같은 개체로 확정하지 않습니다
              </Card.Description>
            </Card.Body>
          </Link>
        </Card.Root>
      </Demo>

      <ThemeStage>
        <Card.Root variant="outline" borderRadius="card" width="100%">
          <Card.Body gap="0.5">
            <Card.Title textStyle="bodyStrong">{REPORT.title}</Card.Title>
            <Text textStyle="bodySm" color="fg.alternative">
              {REPORT.area}
            </Text>
            <Text textStyle="caption" color="fg.assistive">
              {REPORT.time}
            </Text>
            <Flex gap="1.5" wrap="wrap" marginTop="2.5">
              <Chip readOnly size="xsmall">
                배회 중
              </Chip>
              <Chip readOnly size="xsmall" color="fg.error">
                다친 것으로 보임
              </Chip>
            </Flex>
          </Card.Body>
        </Card.Root>
      </ThemeStage>

      <SpecTable
        rows={[
          ["모서리", <Token key="r">card</Token>],
          ["안쪽 여백", "sm 16 기본, md 20, lg 24"],
          ["바탕", "bg.panel, subtle 만 bg.subtle"],
          ["테두리", "outline 만 1px border.muted"],
          ["그림자", "elevated 만 raised, 나머지 없음"],
          ["썸네일", "88px 정사각, 모서리 control 12"],
          ["터치 영역", "카드 전체가 링크, 44px 이상"],
          ["안전영역", "적용 없음"],
        ]}
      />

      <Usage
        code={
          '<Card.Root variant="outline" borderRadius="card">\n' +
          "  <Card.Body>\n" +
          "    <Card.Title />\n" +
          "    <Card.Description />\n" +
          "  </Card.Body>\n" +
          "</Card.Root>"
        }
      />
    </Spec>
  );
}

function TrailingSwitch({ label }: { label: string }) {
  return (
    <Switch.Root size="sm" defaultChecked colorPalette="brand">
      <Switch.HiddenInput aria-label={label} />
      <Switch.Control>
        <Switch.Thumb />
      </Switch.Control>
    </Switch.Root>
  );
}

function ListItemSection() {
  return (
    <Spec
      id="list-item"
      title="List Item"
      description="설정과 목록의 한 줄입니다. 화면 끝까지 닿는 기본형과 카드처럼 담는 inset 형 두 가지만 씁니다."
    >
      <Demo variant="screen" label="기본, 화면 끝까지" note="ListGroup 이 줄 사이 구분선을 넣습니다">
        <ListGroup>
          <ListItem
            leading="bell"
            title="알림"
            description="확인할 후보가 생기면 알려 드립니다"
            chevron
            onClick={() => {}}
          />
          <ListItem leading="map" title="관심 지역" trailing="서울 마포구" chevron onClick={() => {}} />
          <ListItem
            leading="moon"
            title="어두운 화면"
            trailing={<TrailingSwitch label="어두운 화면" />}
          />
          <ListItem leading="trash" title="제보 기록 삭제" destructive onClick={() => {}} />
          <ListItem leading="lock" title="관리자 도구" description="권한이 없습니다" disabled />
        </ListGroup>
      </Demo>

      <Demo variant="screen" label="inset, 화면 여백 안쪽">
        <Box paddingInline="screen" paddingBlock="block">
          <ListGroup inset title="계정">
            <ListItem title="로그인 방식" trailing="휴대폰 번호" />
            <ListItem title="알림 설정" chevron onClick={() => {}} />
          </ListGroup>
        </Box>
      </Demo>

      <Demo variant="screen" label="왼쪽에 노드 넣기" note="leading 에 문자열 대신 노드를 주면 그대로 놓입니다">
        <ListGroup>
          <ListItem
            leading={
              <Avatar.Root size="sm" colorPalette="brand">
                <Avatar.Fallback name="김제보" />
              </Avatar.Root>
            }
            title="김제보"
            description="확인할 후보 2건을 함께 봤습니다"
            chevron
            onClick={() => {}}
          />
        </ListGroup>
      </Demo>

      <ThemeStage>
        <Box width="100%">
          <ListGroup inset>
            <ListItem leading="bell" title="알림" trailing="켜짐" chevron onClick={() => {}} />
            <ListItem leading="map" title="관심 지역" trailing="서울 마포구" chevron onClick={() => {}} />
          </ListGroup>
        </Box>
      </ThemeStage>

      <SpecTable
        rows={[
          ["최소 높이", "56"],
          ["세로 여백", "12"],
          ["좌우 여백", "screen 20, inset 은 16"],
          ["모서리", "inset 만 card 16, 기본형 없음"],
          ["아이콘 원", "40px, 바탕 bg.subtle"],
          ["구분선", "1px border.muted, 좌우 여백만큼 들여씀"],
          ["터치 영역", "56, 기준 44 충족"],
          ["끈 상태", "opacity 0.45"],
          ["안전영역", "적용 없음"],
        ]}
      />

      <Usage
        code={
          '<ListGroup inset title="계정">\n' +
          '  <ListItem leading="bell" title="알림" chevron onClick={...} />\n' +
          "</ListGroup>"
        }
      />
    </Spec>
  );
}

const REPORT_FACTS = [
  { label: "동물 종류", value: "개" },
  { label: "크기", value: "소형" },
  { label: "털색", value: "흰색" },
  { label: "보호 상황", value: "배회 중" },
  { label: "목격 지역", value: "서울 마포구 연남동" },
] as const;

function DataListSection() {
  return (
    <Spec
      id="data-list"
      title="Data List"
      description="이름과 값이 짝을 이루는 정보입니다. 상세 화면의 제보 정보가 여기에 들어갑니다."
    >
      <Demo label="가로 배치" note="라벨 폭이 좁아 값이 길어도 줄이 밀리지 않습니다">
        <DataList.Root orientation="horizontal" size="md">
          {REPORT_FACTS.map((fact) => (
            <DataList.Item key={fact.label}>
              <DataList.ItemLabel>{fact.label}</DataList.ItemLabel>
              <DataList.ItemValue>{fact.value}</DataList.ItemValue>
            </DataList.Item>
          ))}
        </DataList.Root>
      </Demo>

      <Demo label="세로 배치" note="값이 긴 항목이 섞일 때 씁니다">
        <DataList.Root orientation="vertical" size="sm">
          {REPORT_FACTS.slice(0, 3).map((fact) => (
            <DataList.Item key={fact.label}>
              <DataList.ItemLabel>{fact.label}</DataList.ItemLabel>
              <DataList.ItemValue>{fact.value}</DataList.ItemValue>
            </DataList.Item>
          ))}
        </DataList.Root>
      </Demo>

      <Usage
        code={
          '<DataList.Root orientation="horizontal">\n' +
          "  <DataList.Item>\n" +
          "    <DataList.ItemLabel>동물 종류</DataList.ItemLabel>\n" +
          "    <DataList.ItemValue>개</DataList.ItemValue>\n" +
          "  </DataList.Item>\n" +
          "</DataList.Root>"
        }
      />
    </Spec>
  );
}

const CANDIDATE_ROWS = [
  { name: "후보 1", area: "서울 마포구 연남동", date: "2026년 9월 9일", size: "소형" },
  { name: "후보 2", area: "서울 마포구 성산동", date: "2026년 9월 7일", size: "소형" },
  { name: "후보 3", area: "서울 서대문구 연희동", date: "2026년 9월 5일", size: "중형" },
] as const;

function TableSection() {
  return (
    <Spec
      id="table"
      title="Table"
      description="모바일에서는 목록 카드가 기본이고 표는 값을 나란히 견줄 때만 씁니다."
    >
      <Demo label="확인할 후보 비교" note="가로 스크롤 상자에 담아 화면 밖으로 밀려나지 않게 합니다">
        <Box overflowX="auto" width="100%">
          <Table.Root size="sm" variant="line">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>후보</Table.ColumnHeader>
                <Table.ColumnHeader>목격 지역</Table.ColumnHeader>
                <Table.ColumnHeader>발견일</Table.ColumnHeader>
                <Table.ColumnHeader>크기</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {CANDIDATE_ROWS.map((row) => (
                <Table.Row key={row.name}>
                  <Table.Cell whiteSpace="nowrap">{row.name}</Table.Cell>
                  <Table.Cell whiteSpace="nowrap">{row.area}</Table.Cell>
                  <Table.Cell whiteSpace="nowrap">{row.date}</Table.Cell>
                  <Table.Cell whiteSpace="nowrap">{row.size}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Box>
      </Demo>

      <Usage code={'<Box overflowX="auto">\n  <Table.Root size="sm">...</Table.Root>\n</Box>'} />
    </Spec>
  );
}

const FAQ = [
  {
    value: "location",
    question: "정확한 위치가 공개되나요",
    answer:
      "공개하지 않습니다. 목록과 상세와 공유 카드에는 행정동 이름까지만 나오고 정확한 좌표는 응답에 담기지 않습니다.",
  },
  {
    value: "draft",
    question: "AI 가 쓴 내용은 그대로 올라가나요",
    answer:
      "AI 초안이며 그대로 수정할 수 있습니다. 제보를 올리기 전 네 번째 단계에서 문장을 직접 고칠 수 있습니다.",
  },
  {
    value: "breed",
    question: "품종을 확정해 주나요",
    answer:
      "확정하지 않습니다. 흰색 소형견처럼 눈에 보이는 특징으로만 부르고 품종은 추정으로 표시합니다.",
  },
] as const;

function AccordionSection() {
  return (
    <Spec
      id="accordion"
      title="Accordion"
      description="자주 묻는 질문처럼 제목만 훑고 필요한 것만 펼치는 목록입니다."
    >
      <Demo label="FAQ">
        <Accordion.Root collapsible defaultValue={["location"]} variant="outline" width="100%">
          {FAQ.map((item) => (
            <Accordion.Item key={item.value} value={item.value}>
              <Accordion.ItemTrigger>
                <Text flex="1" minWidth="0" textStyle="bodyStrong" textAlign="start">
                  {item.question}
                </Text>
                <Accordion.ItemIndicator />
              </Accordion.ItemTrigger>
              <Accordion.ItemContent>
                <Accordion.ItemBody textStyle="bodySm" color="fg.alternative">
                  {item.answer}
                </Accordion.ItemBody>
              </Accordion.ItemContent>
            </Accordion.Item>
          ))}
        </Accordion.Root>
      </Demo>

      <Usage
        code={
          "<Accordion.Root collapsible>\n" +
          '  <Accordion.Item value="location">\n' +
          "    <Accordion.ItemTrigger>...</Accordion.ItemTrigger>\n" +
          "    <Accordion.ItemContent>\n" +
          "      <Accordion.ItemBody>...</Accordion.ItemBody>\n" +
          "    </Accordion.ItemContent>\n" +
          "  </Accordion.Item>\n" +
          "</Accordion.Root>"
        }
      />
    </Spec>
  );
}

const HISTORY = [
  { title: "제보 등록", time: "2026년 9월 9일 오후 3시 20분", done: true },
  { title: "AI 초안 생성", time: "2026년 9월 9일 오후 3시 21분", done: true },
  { title: "확인할 후보 2건 안내", time: "2026년 9월 9일 오후 6시 40분", done: true },
  { title: "종료", time: "진행 중", done: false },
] as const;

function TimelineSection() {
  return (
    <Spec
      id="timeline"
      title="Timeline"
      description="제보 하나가 지나온 단계를 시간 순으로 보여 줍니다. 끝나지 않은 단계는 옅게 둡니다."
    >
      <Demo label="제보 이력">
        <Timeline.Root size="sm" variant="subtle" width="100%">
          {HISTORY.map((step) => (
            <Timeline.Item key={step.title}>
              <Timeline.Connector>
                <Timeline.Separator />
                <Timeline.Indicator
                  backgroundColor={step.done ? "brand.solid" : "bg.muted"}
                  color={step.done ? "brand.contrast" : "fg.assistive"}
                >
                  <Icon name={step.done ? "check" : "clock"} size={12} />
                </Timeline.Indicator>
              </Timeline.Connector>
              <Timeline.Content>
                <Timeline.Title textStyle="bodyStrong" color={step.done ? "fg.default" : "fg.assistive"}>
                  {step.title}
                </Timeline.Title>
                <Timeline.Description>{step.time}</Timeline.Description>
              </Timeline.Content>
            </Timeline.Item>
          ))}
        </Timeline.Root>
      </Demo>

      <Usage
        code={
          "<Timeline.Root>\n" +
          "  <Timeline.Item>\n" +
          "    <Timeline.Connector>\n" +
          "      <Timeline.Separator />\n" +
          "      <Timeline.Indicator />\n" +
          "    </Timeline.Connector>\n" +
          "    <Timeline.Content>...</Timeline.Content>\n" +
          "  </Timeline.Item>\n" +
          "</Timeline.Root>"
        }
      />
    </Spec>
  );
}

// 상대 시각은 서버와 브라우저가 어긋나지 않도록 고정 문자열 기준
const ACTIVITY = [
  { id: "share", who: "박이웃", what: "공유 카드를 내려받았습니다", ago: "10분 전", icon: "share" },
  { id: "match", who: "이확인", what: "확인할 후보 2건을 표시했습니다", ago: "3시간 전", icon: "users" },
  {
    id: "draft",
    who: "AI 초안",
    what: "설명 초안을 만들었습니다. 그대로 고칠 수 있습니다",
    ago: "어제",
    icon: "edit",
  },
  { id: "upload", who: "김제보", what: "제보를 올렸습니다", ago: "어제", icon: "camera" },
] as const;

function ActivityFeedSection() {
  return (
    <Spec
      id="activity-feed"
      title="Activity Feed"
      description="사람과 시스템이 남긴 움직임을 최신 것부터 쌓습니다. 단계가 정해진 흐름은 Timeline 을 씁니다."
    >
      <Demo label="제보 하나의 활동">
        <Flex direction="column" gap="4" width="100%">
          {ACTIVITY.map((item) => (
            <Flex key={item.id} gap="3" align="flex-start" minWidth="0">
              <Flex
                flexShrink={0}
                boxSize="9"
                borderRadius="full"
                backgroundColor="bg.subtle"
                color="fg.alternative"
                align="center"
                justify="center"
              >
                <Icon name={item.icon} size={18} />
              </Flex>
              <Box flex="1" minWidth="0">
                <Text textStyle="bodySm">
                  <Text as="span" textStyle="bodySm" fontWeight="600">
                    {item.who}
                  </Text>{" "}
                  {item.what}
                </Text>
              </Box>
              <Text textStyle="caption" color="fg.assistive" flexShrink={0} whiteSpace="nowrap">
                {item.ago}
              </Text>
            </Flex>
          ))}
        </Flex>
      </Demo>

      <Text textStyle="caption" color="fg.assistive">
        AI 가 만든 항목은 사람이 한 일과 섞이지 않게 이름을 AI 초안으로 적습니다. 상대 시각은 서버에서 계산해
        내려보내고 화면에서 다시 재지 않습니다
      </Text>
    </Spec>
  );
}

function UserCardSection() {
  return (
    <Spec
      id="user-card"
      title="User Card"
      description="제보자와 보호 기관을 소개하는 카드입니다. 실명과 연락처는 넣지 않고 활동 기록만 보여 줍니다."
    >
      <Demo label="한 줄형">
        <Card.Root variant="outline" borderRadius="card">
          <Flex gap="3" padding="3" align="center" minWidth="0">
            <Avatar.Root size="md" colorPalette="brand" flexShrink={0}>
              <Avatar.Fallback name="김제보" />
            </Avatar.Root>
            <Box flex="1" minWidth="0">
              <Text textStyle="bodyStrong" truncate>
                김제보
              </Text>
              <Text textStyle="caption" color="fg.assistive" truncate>
                제보 4건, 후보 확인 12건
              </Text>
            </Box>
            <Button size="sm" variant="outline" colorPalette="gray" flexShrink={0}>
              쪽지
            </Button>
          </Flex>
        </Card.Root>
      </Demo>

      <Demo label="큰 카드형">
        <Card.Root variant="outline" borderRadius="card">
          <Card.Body alignItems="center" gap="1" textAlign="center">
            <Avatar.Root size="xl" colorPalette="brand">
              <Avatar.Fallback name="연남 보호소" />
            </Avatar.Root>
            <Text textStyle="title3" marginTop="2">
              연남 보호소
            </Text>
            <Text textStyle="bodySm" color="fg.alternative">
              서울 마포구 연남동
            </Text>
            <Flex gap="1.5" wrap="wrap" justify="center" marginTop="2">
              <Chip readOnly size="xsmall">
                보호 중 8마리
              </Chip>
              <Chip readOnly size="xsmall">
                평일 방문 가능
              </Chip>
            </Flex>
          </Card.Body>
          <Card.Footer gap="2">
            <Button variant="outline" colorPalette="gray" flex="1" size="md">
              전화
            </Button>
            <Button flex="1" size="md">
              보호 요청
            </Button>
          </Card.Footer>
        </Card.Root>
      </Demo>
    </Spec>
  );
}

const COMPARISON = [
  { label: "동물 종류", mine: "개", other: "개" },
  { label: "크기", mine: "소형", other: "소형" },
  { label: "털색", mine: "흰색", other: "흰색" },
  { label: "목격 지역", mine: "서울 마포구 연남동", other: "서울 마포구 성산동" },
  { label: "목격 시각", mine: "2026년 9월 9일 오후 3시 20분", other: "2026년 9월 7일 오전 11시 5분" },
] as const;

function ComparisonTableSection() {
  return (
    <Spec
      id="comparison-table"
      title="Comparison Table"
      description="제보 두 건을 항목별로 나란히 놓습니다. 값이 다른 줄만 배경으로 짚어 어디를 봐야 하는지 알립니다."
    >
      <Demo label="이번 제보와 확인할 후보">
        <Box overflowX="auto" width="100%">
          <Table.Root size="sm" variant="line">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>항목</Table.ColumnHeader>
                <Table.ColumnHeader>이번 제보</Table.ColumnHeader>
                <Table.ColumnHeader>확인할 후보</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {COMPARISON.map((row) => {
                const differs = row.mine !== row.other;
                return (
                  <Table.Row
                    key={row.label}
                    backgroundColor={differs ? "brand.subtle" : undefined}
                  >
                    <Table.Cell whiteSpace="nowrap" color="fg.alternative">
                      {row.label}
                    </Table.Cell>
                    <Table.Cell whiteSpace="nowrap">{row.mine}</Table.Cell>
                    <Table.Cell whiteSpace="nowrap">{row.other}</Table.Cell>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table.Root>
        </Box>
      </Demo>

      <Text textStyle="caption" color="fg.assistive">
        값이 모두 겹쳐도 확인할 후보로만 두고 개체 동일성은 사람이 판단합니다
      </Text>
    </Spec>
  );
}

const SNIPPET =
  "const report = await createReport({\n" +
  '  animalType: "dog",\n' +
  '  careSituation: "roaming",\n' +
  '  areaName: "서울 마포구 연남동",\n' +
  "});";

function CodeBlockSection() {
  return (
    <Spec
      id="code-block"
      title="Code Block"
      description="개발 문서와 API 안내에만 씁니다. 좁은 화면에서는 가로로 밀어 읽습니다."
    >
      <Demo label="복사 버튼이 붙은 코드">
        <CodeBlock.Root code={SNIPPET} language="ts" size="sm" width="100%" borderRadius="card">
          <CodeBlock.Content>
            <CodeBlock.Header>
              <CodeBlock.Title textStyle="caption">create-report.ts</CodeBlock.Title>
              <CodeBlock.CopyTrigger asChild>
                <IconButton variant="ghost" size="xs" aria-label="코드 복사">
                  <CodeBlock.CopyIndicator copied={<Icon name="check" size={16} />}>
                    <Icon name="copy" size={16} />
                  </CodeBlock.CopyIndicator>
                </IconButton>
              </CodeBlock.CopyTrigger>
            </CodeBlock.Header>
            <CodeBlock.Code overflowX="auto" fontFamily="mono">
              <CodeBlock.CodeText />
            </CodeBlock.Code>
          </CodeBlock.Content>
        </CodeBlock.Root>
      </Demo>

      <Usage
        code={
          '<CodeBlock.Root code={snippet} language="ts" size="sm">\n' +
          "  <CodeBlock.Content>\n" +
          "    <CodeBlock.Header>...</CodeBlock.Header>\n" +
          "    <CodeBlock.Code>\n" +
          "      <CodeBlock.CodeText />\n" +
          "    </CodeBlock.Code>\n" +
          "  </CodeBlock.Content>\n" +
          "</CodeBlock.Root>"
        }
      />
    </Spec>
  );
}

const STATS = [
  { label: "최근 7일 제보", value: "128", help: "지난주보다 12", up: true },
  { label: "확인할 후보", value: "12", help: "어제보다 3", up: true },
  { label: "공유", value: "356", help: "지난주보다 8", up: false },
] as const;

function StatSection() {
  return (
    <Spec
      id="stat"
      title="Stat"
      description="숫자 하나를 크게 보여 주는 칸입니다. 한 줄에 셋까지만 놓아 값이 줄바꿈되지 않게 합니다."
    >
      <Demo label="요약 세 칸">
        <SimpleGrid columns={3} gap="2" width="100%">
          {STATS.map((item) => (
            <Stat.Root key={item.label} size="sm" minWidth="0">
              <Stat.Label textStyle="caption" color="fg.assistive">
                {item.label}
              </Stat.Label>
              <Stat.ValueText textStyle="title3">{item.value}</Stat.ValueText>
              <Stat.HelpText textStyle="caption" gap="0.5">
                {item.up ? <Stat.UpIndicator /> : <Stat.DownIndicator />}
                {item.help}
              </Stat.HelpText>
            </Stat.Root>
          ))}
        </SimpleGrid>
      </Demo>

      <Usage
        code={
          "<Stat.Root size=\"sm\">\n" +
          "  <Stat.Label />\n" +
          "  <Stat.ValueText />\n" +
          "  <Stat.HelpText><Stat.UpIndicator /></Stat.HelpText>\n" +
          "</Stat.Root>"
        }
      />
    </Spec>
  );
}

const SLIDES = [
  { id: "front", tone: "brand.muted", label: "정면" },
  { id: "side", tone: "bg.alternative", label: "옆모습" },
  { id: "spot", tone: "brand.subtle", label: "발견 장소" },
] as const;

function CarouselSection() {
  const [page, setPage] = useState(0);

  return (
    <Spec
      id="carousel"
      title="Carousel"
      description="사진 여러 장을 한 자리에서 넘겨 봅니다. 현재 장은 PageIndicator 가 아니라 Carousel 이 직접 표시합니다."
    >
      <Demo label="사진 세 장" note="손가락으로 밀어 넘길 수 있고 좌우 버튼은 보조 수단입니다">
        <Carousel.Root
          width="100%"
          slideCount={SLIDES.length}
          page={page}
          onPageChange={(details) => setPage(details.page)}
          allowMouseDrag
          spacing="8px"
        >
          <Carousel.ItemGroup>
            {SLIDES.map((slide, index) => (
              <Carousel.Item key={slide.id} index={index}>
                <AspectRatio ratio={4 / 3} borderRadius="card" overflow="hidden">
                  <Flex backgroundColor={slide.tone} align="center" justify="center">
                    <Text textStyle="label" color="fg.alternative">
                      {slide.label}
                    </Text>
                  </Flex>
                </AspectRatio>
              </Carousel.Item>
            ))}
          </Carousel.ItemGroup>

          <Carousel.Control marginTop="3" justifyContent="space-between" alignItems="center">
            <Carousel.PrevTrigger asChild>
              <IconButton variant="outline" size="sm" aria-label="이전 사진">
                <Icon name="back" size={18} />
              </IconButton>
            </Carousel.PrevTrigger>

            <Carousel.IndicatorGroup gap="1.5">
              {SLIDES.map((slide, index) => (
                <Carousel.Indicator
                  key={slide.id}
                  index={index}
                  width={index === page ? "20px" : "6px"}
                  height="6px"
                  borderRadius="full"
                  backgroundColor={index === page ? "brand.solid" : "border.emphasized"}
                  transition="width 0.2s, background-color 0.2s"
                />
              ))}
            </Carousel.IndicatorGroup>

            <Carousel.NextTrigger asChild>
              <IconButton variant="outline" size="sm" aria-label="다음 사진">
                <Icon name="forward" size={18} />
              </IconButton>
            </Carousel.NextTrigger>
          </Carousel.Control>
        </Carousel.Root>
      </Demo>

      <Text textStyle="caption" color="fg.assistive">
        지금 {page + 1} / {SLIDES.length} 장입니다. onPageChange 로 받은 값을 그대로 상태에 둡니다
      </Text>

      <Usage
        code={
          "<Carousel.Root slideCount={3} page={page} onPageChange={(d) => setPage(d.page)}>\n" +
          "  <Carousel.ItemGroup>\n" +
          "    <Carousel.Item index={0}>...</Carousel.Item>\n" +
          "  </Carousel.ItemGroup>\n" +
          "</Carousel.Root>"
        }
      />
    </Spec>
  );
}

const MARQUEE_AREAS = [
  "서울 마포구 연남동",
  "서울 마포구 성산동",
  "서울 서대문구 연희동",
  "서울 은평구 응암동",
] as const;

function MarqueeSection() {
  return (
    <Spec
      id="marquee"
      title="Marquee"
      description="공지 한 줄을 천천히 흘려보냅니다. 흐르는 동안에도 읽을 수 있어야 하므로 누를 것은 넣지 않습니다."
    >
      <Demo variant="screen" label="최근 제보가 들어온 지역">
        <Marquee.Root
          autoFill
          speed={40}
          spacing="12px"
          pauseOnInteraction
          paddingBlock="3"
          backgroundColor="bg.subtle"
          translations={{ root: "최근 제보가 들어온 지역" }}
          css={{ "--marquee-edge-color": "colors.bg.subtle", "--marquee-edge-size": "12%" }}
        >
          <Marquee.Viewport>
            {/* 흐름 정지 요청 존중 기준 */}
            <Marquee.Content
              css={{ "@media (prefers-reduced-motion: reduce)": { animation: "none" } }}
            >
              {MARQUEE_AREAS.map((area) => (
                <Marquee.Item key={area}>
                  <Flex align="center" gap="1.5" paddingInline="2">
                    <Box color="brand.fg">
                      <Icon name="pin" size={14} />
                    </Box>
                    <Text textStyle="caption" color="fg.alternative" whiteSpace="nowrap">
                      {area}
                    </Text>
                  </Flex>
                </Marquee.Item>
              ))}
            </Marquee.Content>
          </Marquee.Viewport>
          <Marquee.Edge side="start" />
          <Marquee.Edge side="end" />
        </Marquee.Root>
      </Demo>

      <Text textStyle="caption" color="fg.assistive">
        <Token>autoFill</Token> 이 목록을 폭에 맞게 복제해 이음매를 지웁니다. 손이 닿으면 멈추고 움직임 최소화를
        켠 기기에서는 흐르지 않습니다
      </Text>
    </Spec>
  );
}

function ImageSection() {
  return (
    <Spec
      id="image"
      title="Image"
      description="사진은 언제나 비율 상자 안에 넣습니다. 높이가 미리 잡혀 있어야 사진이 도착할 때 화면이 흔들리지 않습니다."
    >
      <Demo label="4 대 3, 목록과 상세의 기본">
        <AspectRatio ratio={4 / 3} width="100%">
          <Image
            src={PHOTO}
            alt="제보 사진 예시"
            objectFit="cover"
            borderRadius="card"
            backgroundColor="bg.alternative"
          />
        </AspectRatio>
      </Demo>

      <Demo label="1 대 1, 후보 목록의 작은 사진">
        <AspectRatio ratio={1} width="140px">
          <Image
            src={PHOTO}
            alt="후보 사진 예시"
            objectFit="cover"
            borderRadius="card"
            backgroundColor="bg.alternative"
          />
        </AspectRatio>
      </Demo>

      <Demo label="불러오는 중" note="같은 비율의 Skeleton 을 먼저 그려 자리를 잡습니다">
        <AspectRatio ratio={4 / 3} width="100%">
          <Skeleton borderRadius="card" />
        </AspectRatio>
      </Demo>

      <Demo label="사진이 없을 때">
        <AspectRatio ratio={4 / 3} width="100%">
          <Flex
            direction="column"
            align="center"
            justify="center"
            gap="2"
            backgroundColor="bg.alternative"
            borderRadius="card"
            color="fg.assistive"
          >
            <Icon name="image" size={28} />
            <Text textStyle="caption">사진이 등록되지 않았습니다</Text>
          </Flex>
        </AspectRatio>
      </Demo>

      <Demo variant="screen" label="가로로 넘기는 작은 사진">
        <Box paddingInline="screen" paddingBlock="block">
          <ScrollRow>
            {SLIDES.map((slide) => (
              <Box
                key={slide.id}
                boxSize="96px"
                borderRadius="control"
                backgroundColor={slide.tone}
                overflow="hidden"
              />
            ))}
          </ScrollRow>
        </Box>
      </Demo>

      <Text textStyle="caption" color="fg.assistive">
        원본 사진은 비공개 버킷에 두고 화면에는 서명 URL 로만 내려보냅니다
      </Text>

      <Usage
        code={
          "<AspectRatio ratio={4 / 3}>\n" +
          '  <Image src={url} alt="" objectFit="cover" borderRadius="card" />\n' +
          "</AspectRatio>"
        }
      />
    </Spec>
  );
}

function QrCodeSection() {
  return (
    <Spec
      id="qr-code"
      title="QR Code"
      description="공유 카드에 실어 종이나 화면으로 옮겨 갈 때 씁니다. 값은 언제나 공개 제보 주소입니다."
    >
      <Demo label="공유 카드용">
        <Flex direction="column" align="center" gap="2">
          <QrCode.Root value={SHARE_URL} size="lg" padding="3" backgroundColor="white" borderRadius="card">
            <QrCode.Frame>
              <QrCode.Pattern />
            </QrCode.Frame>
          </QrCode.Root>
          <Text textStyle="caption" color="fg.assistive">
            공유 카드에 실리는 QR
          </Text>
        </Flex>
      </Demo>

      <Usage
        code={
          '<QrCode.Root value="https://dasijip.example/r/abc123" size="lg">\n' +
          "  <QrCode.Frame>\n" +
          "    <QrCode.Pattern />\n" +
          "  </QrCode.Frame>\n" +
          "</QrCode.Root>"
        }
      />
    </Spec>
  );
}

const HELPERS = ["김제보", "이확인", "박이웃"] as const;

function AvatarGroupSection() {
  return (
    <Spec
      id="avatar-group"
      title="Avatar Group"
      description="같은 제보를 함께 본 사람을 겹쳐 보여 줍니다. 사진이 없으면 이름 첫 글자를 씁니다."
    >
      <Demo label="겹쳐 쌓기">
        <Flex direction="column" gap="2">
          <AvatarGroup size="sm" gap="0" spaceX="-2" stacking="last-on-top">
            {HELPERS.map((name) => (
              <Avatar.Root key={name} colorPalette="brand" borderWidth="2px" borderColor="bg.panel">
                <Avatar.Fallback name={name} />
              </Avatar.Root>
            ))}
            <Avatar.Root colorPalette="gray" borderWidth="2px" borderColor="bg.panel">
              <Avatar.Fallback>+3</Avatar.Fallback>
            </Avatar.Root>
          </AvatarGroup>
          <Text textStyle="caption" color="fg.assistive">
            함께 확인한 사람
          </Text>
        </Flex>
      </Demo>

      <Demo label="더 작은 크기">
        <AvatarGroup size="xs" gap="0" spaceX="-1.5" stacking="last-on-top">
          {HELPERS.map((name) => (
            <Avatar.Root key={name} colorPalette="brand" borderWidth="2px" borderColor="bg.panel">
              <Avatar.Fallback name={name} />
            </Avatar.Root>
          ))}
        </AvatarGroup>
      </Demo>

      <Usage
        code={
          '<AvatarGroup size="sm" gap="0" spaceX="-2">\n' +
          "  <Avatar.Root>\n" +
          '    <Avatar.Fallback name="김제보" />\n' +
          "  </Avatar.Root>\n" +
          "</AvatarGroup>"
        }
      />
    </Spec>
  );
}

function ClipboardSection() {
  return (
    <Spec
      id="clipboard"
      title="Clipboard"
      description="공개 제보 주소를 복사합니다. 복사한 뒤에는 아이콘이 바뀌어 눌린 것을 알려 줍니다."
    >
      <Demo label="버튼 하나">
        <Clipboard.Root value={SHARE_URL}>
          <Clipboard.Trigger asChild>
            <Button variant="outline" colorPalette="gray" width="100%">
              <Clipboard.Indicator copied={<Icon name="check" size={20} />}>
                <Icon name="copy" size={20} />
              </Clipboard.Indicator>
              링크 복사
            </Button>
          </Clipboard.Trigger>
        </Clipboard.Root>
      </Demo>

      <Demo label="주소를 함께 보여 줄 때" note="읽기 전용 입력이라 값이 바뀌지 않습니다">
        <Clipboard.Root value={SHARE_URL} width="100%">
          <Clipboard.Label textStyle="label" color="fg.alternative">
            공유 주소
          </Clipboard.Label>
          <Flex gap="2" marginTop="2" minWidth="0">
            <Clipboard.Input asChild>
              <Input readOnly size="md" flex="1" minWidth="0" />
            </Clipboard.Input>
            <Clipboard.Trigger asChild>
              <IconButton variant="outline" colorPalette="gray" size="md" aria-label="주소 복사">
                <Clipboard.Indicator copied={<Icon name="check" size={20} />}>
                  <Icon name="copy" size={20} />
                </Clipboard.Indicator>
              </IconButton>
            </Clipboard.Trigger>
          </Flex>
        </Clipboard.Root>
      </Demo>

      <Usage
        code={
          "<Clipboard.Root value={url}>\n" +
          "  <Clipboard.Trigger asChild>\n" +
          "    <Button>\n" +
          "      <Clipboard.Indicator copied={<Icon name=\"check\" />}>\n" +
          "        <Icon name=\"copy\" />\n" +
          "      </Clipboard.Indicator>\n" +
          "      링크 복사\n" +
          "    </Button>\n" +
          "  </Clipboard.Trigger>\n" +
          "</Clipboard.Root>"
        }
      />
    </Spec>
  );
}

export function DataCatalog() {
  return (
    <>
      <CardSection />
      <ListItemSection />
      <DataListSection />
      <TableSection />
      <AccordionSection />
      <TimelineSection />
      <ActivityFeedSection />
      <UserCardSection />
      <ComparisonTableSection />
      <CodeBlockSection />
      <StatSection />
      <CarouselSection />
      <MarqueeSection />
      <ImageSection />
      <QrCodeSection />
      <AvatarGroupSection />
      <ClipboardSection />
    </>
  );
}
