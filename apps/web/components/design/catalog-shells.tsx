"use client";

import { useState } from "react";
import {
  AspectRatio,
  Box,
  Button,
  DataList,
  Flex,
  IconButton,
  Input,
  InputGroup,
  Switch,
  Text,
  type BoxProps,
} from "@chakra-ui/react";

import { AppBar, AppBarAction } from "@/components/ui/app-bar";
import { Banner } from "@/components/ui/banner";
import { Chip } from "@/components/ui/chip";
import { CtaBar } from "@/components/ui/cta-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { Fab } from "@/components/ui/fab";
import { Field } from "@/components/ui/field";
import { Icon } from "@/components/ui/icons";
import { ListGroup, ListItem } from "@/components/ui/list-item";
import { PageHeader } from "@/components/ui/page-header";
import { PageIndicator } from "@/components/ui/page-indicator";
import { Bleed, Screen, ScreenBody, ScrollRow, Section } from "@/components/ui/screen";
import { SearchBar } from "@/components/ui/search-bar";
import { SectionHeader } from "@/components/ui/section-header";
import { SectionMessage } from "@/components/ui/section-message";
import { Segmented } from "@/components/ui/segmented";
import { StepProgress } from "@/components/ui/step-progress";
import { TabBar, type TabBarItem } from "@/components/ui/tab-bar";

import { Demo, Spec, SpecTable, Token, Usage } from "./spec";

// Shells 카탈로그, 화면 하나를 짜는 틀과 실제 조합 예시

const TABS: TabBarItem[] = [
  { href: "#shells/shell-home", label: "홈", icon: "home" },
  { href: "#shells/shell-form", label: "제보", icon: "camera" },
  { href: "#shells/shell-map", label: "지도", icon: "map" },
  { href: "#shells/shell-settings", label: "내 정보", icon: "user" },
];

const REPORT = {
  title: "흰색 소형견, 말티즈 계열 추정",
  area: "서울 마포구 연남동",
  time: "2026년 9월 9일 오후 3시 20분",
} as const;

const NEARBY = [
  { id: "r1", title: "흰색 소형견, 말티즈 계열 추정", area: "서울 마포구 연남동" },
  { id: "r2", title: "검정 중형견, 믹스 추정", area: "서울 마포구 성산동" },
  { id: "r3", title: "삼색 고양이", area: "서울 서대문구 연희동" },
] as const;

function Slot({ label, ...rest }: BoxProps & { label: string }) {
  return (
    <Box
      borderWidth="1px"
      borderStyle="dashed"
      borderColor="border.emphasized"
      borderRadius="control"
      paddingBlock="3"
      paddingInline="3"
      textStyle="caption"
      color="fg.assistive"
      textAlign="center"
      {...rest}
    >
      {label}
    </Box>
  );
}

function MiniReportCard({ title, area }: { title: string; area: string }) {
  return (
    <Flex
      direction="column"
      gap="1"
      width="160px"
      padding="3"
      borderWidth="1px"
      borderColor="border.muted"
      borderRadius="card"
      backgroundColor="bg.panel"
    >
      <AspectRatio ratio={4 / 3} width="100%">
        <Box backgroundColor="brand.muted" borderRadius="control" />
      </AspectRatio>
      <Text textStyle="label" marginTop="1" lineClamp={2}>
        {title}
      </Text>
      <Text textStyle="caption" color="fg.assistive" truncate>
        {area}
      </Text>
    </Flex>
  );
}

function WideReportCard({ title, area }: { title: string; area: string }) {
  return (
    <Flex
      gap="3"
      padding="3"
      align="center"
      borderWidth="1px"
      borderColor="border.muted"
      borderRadius="card"
      backgroundColor="bg.panel"
      minWidth="0"
    >
      <AspectRatio ratio={1} width="72px" flexShrink={0}>
        <Box backgroundColor="brand.muted" borderRadius="control" />
      </AspectRatio>
      <Box flex="1" minWidth="0">
        <Text textStyle="bodyStrong" truncate>
          {title}
        </Text>
        <Text textStyle="bodySm" color="fg.alternative" truncate>
          {area}
        </Text>
        <Text textStyle="caption" color="fg.assistive">
          2026년 9월 9일
        </Text>
      </Box>
    </Flex>
  );
}

function ScreenSection() {
  return (
    <Spec
      id="screen"
      title="Screen"
      description="화면 배치 프리미티브입니다. 여백 숫자는 여기서만 정하고 화면 쪽에서는 토큰 이름만 부릅니다."
    >
      <Demo variant="screen" label="여백이 정해지는 자리">
        <Screen minHeight="auto">
          <ScreenBody>
            <Slot label="ScreenBody, 좌우 screen 20" />
            <Slot label="블록 사이 block 16" />
            <Section marginTop="section">
              <Slot label="Section, 묶음 사이 section 32" />
              <Slot label="묶음 안쪽 3" />
            </Section>
            <Bleed marginTop="block">
              <Slot label="Bleed, 좌우 여백 무시" borderRadius="0" />
            </Bleed>
          </ScreenBody>
        </Screen>
      </Demo>

      <Demo variant="screen" label="ScrollRow, 가장자리까지 넘기기">
        <Box paddingInline="screen" paddingBlock="block">
          <ScrollRow>
            {NEARBY.map((item) => (
              <MiniReportCard key={item.id} title={item.title} area={item.area} />
            ))}
          </ScrollRow>
        </Box>
      </Demo>

      <Usage
        code={
          "<Screen>\n" +
          "  <AppBar />\n" +
          "  <ScreenBody>\n" +
          "    <Section>...</Section>\n" +
          "    <Bleed>...</Bleed>\n" +
          "  </ScreenBody>\n" +
          "  <CtaBar>...</CtaBar>\n" +
          "</Screen>"
        }
      />
    </Spec>
  );
}

function PageHeaderSection() {
  return (
    <Spec
      id="page-header"
      title="Page Header"
      description="본문 첫머리의 큰 제목입니다. 상단 바 제목과 달리 스크롤과 함께 올라갑니다."
    >
      <Demo variant="screen" label="제목만">
        <PageHeader title="발견 제보" />
      </Demo>

      <Demo variant="screen" label="분류와 설명까지">
        <PageHeader
          eyebrow="길에서 만난 동물"
          title="사진 한 장으로 제보합니다"
          description="사진과 목격 지역만 있으면 나머지는 AI 초안이 채웁니다"
        />
      </Demo>

      <Demo variant="screen" label="제목 아래 칩">
        <PageHeader title={REPORT.title} description={`${REPORT.area}, ${REPORT.time}`}>
          <Chip readOnly size="xsmall">
            배회 중
          </Chip>
          <Chip readOnly size="xsmall">
            소형
          </Chip>
        </PageHeader>
      </Demo>

      <Demo variant="screen" label="가운데 정렬, 온보딩과 결과 화면용">
        <PageHeader
          align="center"
          title="제보가 등록되었습니다"
          description="확인할 후보가 생기면 알려 드립니다"
        />
      </Demo>
    </Spec>
  );
}

function SectionHeaderSection() {
  return (
    <Spec
      id="section-header"
      title="Section Header"
      description="묶음 제목 한 줄입니다. 오른쪽에는 짧은 동작 하나만 둡니다."
    >
      <Demo label="제목만">
        <SectionHeader title="최근 발견 제보" width="100%" />
      </Demo>

      <Demo label="개수 붙이기">
        <SectionHeader title="최근 발견 제보" count={128} width="100%" />
      </Demo>

      <Demo label="설명 붙이기">
        <SectionHeader
          title="확인할 후보"
          description="특징이 비슷한 제보입니다. 같은 개체로 확정하지 않습니다"
          width="100%"
        />
      </Demo>

      <Demo label="오른쪽 동작">
        <SectionHeader
          title="최근 발견 제보"
          count={128}
          width="100%"
          action={
            <Button variant="plain" size="sm" colorPalette="gray">
              더 보기
            </Button>
          }
        />
      </Demo>
    </Spec>
  );
}

function CtaBarSection() {
  return (
    <Spec
      id="cta-bar"
      title="CTA Bar"
      description="화면 하단의 행동 버튼입니다. 버튼은 같은 폭으로 나뉘고 안전 영역만큼 아래를 띄웁니다."
    >
      <Demo variant="screen" label="버튼 하나">
        <CtaBar sticky={false}>
          <Button size="xl">제보하기</Button>
        </CtaBar>
      </Demo>

      <Demo variant="screen" label="버튼 둘, 이전과 다음">
        <CtaBar sticky={false}>
          <Button size="xl" variant="subtle" colorPalette="gray">
            이전
          </Button>
          <Button size="xl">다음</Button>
        </CtaBar>
      </Demo>

      <Demo variant="screen" label="안내 문구를 함께">
        <CtaBar sticky={false} helper="정확한 위치는 공개되지 않습니다">
          <Button size="xl">이 위치로 제보하기</Button>
        </CtaBar>
      </Demo>

      <Demo variant="screen" label="경계선으로 구분" note="흐림 대신 선을 쓰면 목록 끝이 또렷해집니다">
        <CtaBar sticky={false} divider>
          <Button size="xl">확인할 후보 보기</Button>
        </CtaBar>
      </Demo>

      <Demo variant="screen" label="아직 누를 수 없을 때">
        <CtaBar sticky={false} helper="사진을 한 장 이상 넣어야 합니다">
          <Button size="xl" disabled>
            다음
          </Button>
        </CtaBar>
      </Demo>

      <SpecTable
        rows={[
          ["버튼 높이", "xl 48, 테마 기본 lg 44"],
          ["좌우 여백", <Token key="p">screen 20</Token>],
          ["세로 여백", "12"],
          ["버튼 사이", "8, 둘 이상은 같은 폭"],
          ["바탕", <Token key="b">bg.canvas</Token>],
          ["위쪽 구분", "16 흐림, divider 는 1px border.muted"],
          ["터치 영역", "48, 기준 44 충족"],
          ["안전영역", "paddingBottom 에 safeBottom 적용"],
          ["겹침", "sticky bottom 0, zIndex docked"],
        ]}
      />
    </Spec>
  );
}

function FabSection() {
  return (
    <Spec
      id="fab"
      title="FAB"
      description="화면 위에 떠 있는 주 동작입니다. 한 화면에 하나만 두고 CTA Bar 와 함께 쓰지 않습니다."
    >
      <Demo variant="screen" label="기본" note="데모 안에서는 position relative 로 붙임을 풀어 둡니다">
        <Screen minHeight="auto">
          <ScreenBody>
            <Slot label="본문" />
            <Slot label="본문" />
          </ScreenBody>
          <Fab icon="camera" label="제보하기" position="relative" bottom="auto" />
        </Screen>
      </Demo>

      <Demo variant="screen" label="라벨을 함께 보이는 넓은 형태">
        <Screen minHeight="auto">
          <ScreenBody>
            <Slot label="본문" />
            <Slot label="본문" />
          </ScreenBody>
          <Fab icon="camera" label="제보하기" extended position="relative" bottom="auto" />
        </Screen>
      </Demo>

      <Text textStyle="caption" color="fg.assistive">
        탭 바가 있는 화면에서는 offset 에 tabBar 높이를 넘겨 버튼이 탭 위로 올라오게 합니다
      </Text>

      <SpecTable
        rows={[
          ["크기", "56 정사각"],
          ["넓은 형태", "높이 56, 좌우 여백 20, 아이콘과 라벨 8"],
          ["모서리", <Token key="r">full</Token>],
          ["그림자", <Token key="e">float</Token>],
          ["오른쪽 여백", <Token key="m">screen 20</Token>],
          ["바닥 여백", "screen 20 + safeBottom, offset 만큼 추가"],
          ["터치 영역", "56, 기준 44 충족"],
          ["안전영역", "bottom 계산에 safeBottom 포함"],
          ["겹침", "zIndex docked, 탭 바와 같은 층"],
        ]}
      />

      <Usage code={'<Fab icon="camera" label="제보하기" offset="var(--chakra-sizes-tabBar)" />'} />
    </Spec>
  );
}

function ShellHomeSection() {
  return (
    <Spec
      id="shell-home"
      title="홈 화면"
      description="상단 바, 큰 제목, 가로로 넘기는 최근 제보, 빠른 시작 목록, 탭 바로 짭니다."
    >
      <Demo variant="screen">
        <Screen minHeight="auto">
          <AppBar
            sticky={false}
            align="start"
            title="다시집"
            onMenu={() => {}}
            actions={<AppBarAction icon="bell" label="알림" />}
          />
          <PageHeader eyebrow="길에서 만난 동물" title="사진 한 장으로 제보합니다" />
          <ScreenBody gap="section">
            <Banner
              icon="camera"
              title="30초면 끝납니다"
              description="사진과 목격 지역만 넣으면 나머지는 AI 초안이 채웁니다"
            />

            <Section>
              <SectionHeader
                title="최근 발견 제보"
                count={128}
                action={
                  <Button variant="plain" size="sm" colorPalette="gray">
                    더 보기
                  </Button>
                }
              />
              <ScrollRow>
                {NEARBY.map((item) => (
                  <MiniReportCard key={item.id} title={item.title} area={item.area} />
                ))}
              </ScrollRow>
            </Section>

            <Section>
              <SectionHeader title="빠른 시작" />
              <ListGroup inset>
                <ListItem
                  leading="camera"
                  title="발견동물 제보"
                  description="사진 한 장으로 시작합니다"
                  chevron
                  onClick={() => {}}
                />
                <ListItem
                  leading="search"
                  title="확인할 후보 찾기"
                  description="내 제보와 특징이 비슷한 제보를 봅니다"
                  chevron
                  onClick={() => {}}
                />
              </ListGroup>
            </Section>
          </ScreenBody>
          <TabBar sticky={false} activeHref="#shells/shell-home" items={TABS} />
        </Screen>
      </Demo>
    </Spec>
  );
}

const CARE_OPTIONS = [
  { value: "roaming", label: "배회 중" },
  { value: "in_care", label: "내가 데리고 있음" },
] as const;

function ShellFormSection() {
  const [care, setCare] = useState("roaming");

  return (
    <Spec
      id="shell-form"
      title="단계 폼"
      description="네 단계로 나눈 제보 입력입니다. 한 화면에 묻는 것은 하나뿐이고 진행 정도를 늘 위에 둡니다."
    >
      <Demo variant="screen">
        <Screen minHeight="auto">
          <AppBar sticky={false} back={() => {}} title="발견동물 제보" />
          <ScreenBody gap="block">
            <StepProgress current={2} total={4} label="위치" />
            <Text textStyle="title2">어디에서 봤습니까</Text>

            <Field label="목격 지역" required helper="행정동까지만 저장합니다">
              <Input placeholder="예: 서울 마포구 연남동" defaultValue="서울 마포구 연남동" />
            </Field>

            <Field label="보호 상황" required>
              <Segmented
                value={care}
                options={CARE_OPTIONS}
                onValueChange={setCare}
                aria-label="보호 상황"
              />
            </Field>

            <SectionMessage variant="info">
              정확한 위치는 공개되지 않습니다. 목록과 공유 카드에는 행정동 이름까지만 나옵니다
            </SectionMessage>
          </ScreenBody>
          <CtaBar sticky={false}>
            <Button size="xl" variant="subtle" colorPalette="gray">
              이전
            </Button>
            <Button size="xl">다음</Button>
          </CtaBar>
        </Screen>
      </Demo>
    </Spec>
  );
}

const DETAIL_FACTS = [
  { label: "동물 종류", value: "개" },
  { label: "크기", value: "소형" },
  { label: "털색", value: "흰색" },
  { label: "보호 상황", value: "배회 중" },
  { label: "목격 지역", value: REPORT.area },
] as const;

function ShellDetailSection() {
  return (
    <Spec
      id="shell-detail"
      title="상세 화면"
      description="사진이 화면 끝까지 차고 상단 바는 그 위에 투명하게 겹칩니다."
    >
      <Demo variant="screen">
        <Screen minHeight="auto">
          <Box position="relative">
            <AspectRatio ratio={4 / 3} width="100%">
              <Box backgroundColor="brand.muted" />
            </AspectRatio>
            <Box position="absolute" top="0" insetInline="0">
              <AppBar
                sticky={false}
                variant="transparent"
                back={() => {}}
                actions={
                  <>
                    <AppBarAction icon="share" label="공유" />
                    <AppBarAction icon="more" label="더 보기" />
                  </>
                }
              />
            </Box>
          </Box>

          <PageHeader title={REPORT.title} description={`${REPORT.area}, ${REPORT.time}`}>
            <Chip readOnly size="xsmall">
              배회 중
            </Chip>
            <Chip readOnly size="xsmall" color="fg.error">
              다친 것으로 보임
            </Chip>
          </PageHeader>

          <ScreenBody gap="block">
            <DataList.Root orientation="horizontal" size="md">
              {DETAIL_FACTS.map((fact) => (
                <DataList.Item key={fact.label}>
                  <DataList.ItemLabel>{fact.label}</DataList.ItemLabel>
                  <DataList.ItemValue>{fact.value}</DataList.ItemValue>
                </DataList.Item>
              ))}
            </DataList.Root>

            <SectionMessage variant="cautionary">
              품종은 추정이며 개체 동일성은 확인할 후보로만 표시합니다
            </SectionMessage>
          </ScreenBody>

          <CtaBar sticky={false}>
            <Button size="xl">확인할 후보 보기</Button>
          </CtaBar>
        </Screen>
      </Demo>
    </Spec>
  );
}

function ShellSettingsSection() {
  return (
    <Spec
      id="shell-settings"
      title="설정 화면"
      description="inset 목록을 묶음별로 쌓습니다. 되돌릴 수 없는 항목은 맨 아래에 따로 둡니다."
    >
      <Demo variant="screen">
        <Screen minHeight="auto">
          <AppBar sticky={false} back={() => {}} title="설정" />
          <Flex direction="column" gap="section" paddingInline="screen" paddingBlock="block">
            <ListGroup inset title="알림">
              <ListItem
                title="새 후보 알림"
                trailing={
                  <Switch.Root size="sm" defaultChecked colorPalette="brand">
                    <Switch.HiddenInput aria-label="새 후보 알림" />
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                  </Switch.Root>
                }
              />
              <ListItem
                title="주변 제보 알림"
                trailing={
                  <Switch.Root size="sm" colorPalette="brand">
                    <Switch.HiddenInput aria-label="주변 제보 알림" />
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                  </Switch.Root>
                }
              />
            </ListGroup>

            <ListGroup inset title="정보">
              <ListItem title="개인정보 처리방침" chevron onClick={() => {}} />
              <ListItem title="서비스 소개" chevron onClick={() => {}} />
            </ListGroup>

            <ListGroup inset>
              <ListItem title="제보 기록 삭제" destructive onClick={() => {}} />
            </ListGroup>
          </Flex>
        </Screen>
      </Demo>
    </Spec>
  );
}

function ShellOnboardingSection() {
  return (
    <Spec
      id="shell-onboarding"
      title="온보딩"
      description="그림 하나에 문장 하나입니다. 건너뛰기를 늘 같은 자리에 두어 언제든 빠져나갈 수 있게 합니다."
    >
      <Demo variant="screen">
        <Screen minHeight="auto">
          <Flex justify="center" paddingInline="screen" paddingTop="section">
            <AspectRatio ratio={1} width="200px">
              <Flex
                align="center"
                justify="center"
                backgroundColor="brand.subtle"
                borderRadius="card"
                color="brand.fg"
              >
                <Icon name="paw" size={64} />
              </Flex>
            </AspectRatio>
          </Flex>

          <PageHeader
            align="center"
            title="길에서 만난 동물을 제보합니다"
            description="사진 한 장이면 30초 안에 끝납니다"
          />

          <PageIndicator count={3} index={0} marginBlock="block" />

          <CtaBar sticky={false}>
            <Flex direction="column" gap="2">
              <Button size="xl">다음</Button>
              <Button variant="plain" colorPalette="gray">
                건너뛰기
              </Button>
            </Flex>
          </CtaBar>
        </Screen>
      </Demo>

      <Text textStyle="caption" color="fg.assistive">
        CtaBar 는 바로 아래 자식을 같은 폭으로 나누므로 세로로 쌓을 때는 Flex 하나로 감쌉니다
      </Text>
    </Spec>
  );
}

function ShellAuthSection() {
  const [visible, setVisible] = useState(false);

  return (
    <Spec
      id="shell-auth"
      title="인증 화면"
      description="상단 바 없이 로고와 입력 두 칸만 둡니다. 본문을 세로 가운데에 두어 키보드가 올라와도 흔들리지 않습니다."
    >
      <Demo variant="screen">
        <Screen minHeight="auto" justify="center" paddingBlock="section">
          <Flex justify="center">
            <Flex
              align="center"
              justify="center"
              boxSize="64px"
              borderRadius="card"
              backgroundColor="brand.subtle"
              color="brand.fg"
            >
              <Icon name="paw" size={32} />
            </Flex>
          </Flex>

          <PageHeader
            align="center"
            title="다시집에 로그인합니다"
            description="제보 기록과 확인할 후보를 이어서 봅니다"
          />

          <ScreenBody flex="0" gap="block">
            <Field label="이메일" required>
              <Input type="email" inputMode="email" autoComplete="email" placeholder="name@example.com" />
            </Field>

            <Field label="비밀번호" required>
              <InputGroup
                endElement={
                  <IconButton
                    variant="ghost"
                    colorPalette="gray"
                    size="sm"
                    aria-label={visible ? "비밀번호 숨기기" : "비밀번호 보기"}
                    onClick={() => setVisible((current) => !current)}
                  >
                    <Icon name={visible ? "eyeOff" : "eye"} size={20} />
                  </IconButton>
                }
                endElementProps={{ pointerEvents: "auto" }}
              >
                <Input
                  type={visible ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="비밀번호"
                />
              </InputGroup>
            </Field>
          </ScreenBody>

          <CtaBar sticky={false} helper="계속하면 개인정보 처리방침에 동의하는 것으로 봅니다">
            <Button size="xl">로그인</Button>
          </CtaBar>

          <Flex justify="center" gap="1" paddingInline="screen" paddingBottom="block">
            <Button variant="plain" size="sm" colorPalette="gray">
              비밀번호 찾기
            </Button>
            <Text textStyle="caption" color="border.emphasized" alignSelf="center">
              |
            </Text>
            <Button variant="plain" size="sm" colorPalette="gray">
              회원가입
            </Button>
          </Flex>
        </Screen>
      </Demo>
    </Spec>
  );
}

const LIST_FILTERS = ["개", "고양이", "그 외", "최근 7일"] as const;

const LIST_STATES = [
  { value: "filled", label: "결과 있음" },
  { value: "empty", label: "결과 없음" },
] as const;

function ShellListSection() {
  const [query, setQuery] = useState("");
  const [state, setState] = useState("filled");

  return (
    <Spec
      id="shell-list"
      title="목록 화면"
      description="검색 한 줄과 조건 칩으로 좁히고 카드로 훑습니다. 거리 정렬은 두지 않습니다."
    >
      <Segmented
        value={state}
        options={LIST_STATES}
        onValueChange={setState}
        aria-label="목록 상태"
      />

      <Demo variant="screen">
        <Screen minHeight="auto">
          <AppBar
            sticky={false}
            back={() => {}}
            title="최근 발견 제보"
            actions={<AppBarAction icon="search" label="검색" />}
          />
          <Box paddingInline="screen" paddingTop="3">
            <SearchBar value={query} onChange={setQuery} placeholder="지역으로 찾기" />
          </Box>
          <ScreenBody gap="block">
            <ScrollRow>
              {LIST_FILTERS.map((filter, index) => (
                <Chip key={filter} size="small" active={index === 0}>
                  {filter}
                </Chip>
              ))}
            </ScrollRow>

            {state === "empty" ? (
              <EmptyState
                title="조건에 맞는 제보가 없습니다"
                description="조건을 줄이면 더 많은 제보를 볼 수 있습니다"
                icon={<Icon name="search" size={28} />}
                action={
                  <Button variant="outline" colorPalette="gray" size="md">
                    전체 보기
                  </Button>
                }
              />
            ) : (
              <>
                <SectionHeader title="최근 발견 제보" count={128} />
                <Flex direction="column" gap="3">
                  {NEARBY.map((item) => (
                    <WideReportCard key={item.id} title={item.title} area={item.area} />
                  ))}
                </Flex>
                <Button variant="outline" colorPalette="gray" size="md" width="100%">
                  더 보기
                </Button>
              </>
            )}
          </ScreenBody>
        </Screen>
      </Demo>
    </Spec>
  );
}

function ShellMapSection() {
  return (
    <Spec
      id="shell-map"
      title="지도 화면"
      description="지도가 화면을 채우고 상단 바와 시트가 그 위에 뜹니다. 핀은 행정동 중심에만 찍습니다."
    >
      <Demo variant="screen">
        <Screen minHeight="auto">
          <Box position="relative" height="340px" backgroundColor="bg.alternative" overflow="hidden">
            {/* 지도 타일 대신 쓰는 격자 무늬 */}
            <Box
              position="absolute"
              inset="0"
              backgroundImage="linear-gradient(to right, var(--chakra-colors-border-muted) 1px, transparent 1px), linear-gradient(to bottom, var(--chakra-colors-border-muted) 1px, transparent 1px)"
              backgroundSize="40px 40px"
            />

            <Box position="absolute" top="0" insetInline="0">
              <AppBar
                sticky={false}
                variant="transparent"
                back={() => {}}
                actions={<AppBarAction icon="search" label="검색" />}
              />
            </Box>

            <Flex
              position="absolute"
              left="50%"
              top="50%"
              transform="translate(-50%, -100%)"
              align="center"
              justify="center"
              boxSize="40px"
              borderRadius="full"
              backgroundColor="brand.solid"
              color="brand.contrast"
              boxShadow="float"
            >
              <Icon name="paw" size={20} />
            </Flex>

            <Text
              position="absolute"
              left="50%"
              top="50%"
              transform="translate(-50%, 8px)"
              textStyle="caption"
              color="fg.alternative"
              whiteSpace="nowrap"
            >
              서울 마포구 연남동
            </Text>

            <Box position="absolute" right="3" bottom="3">
              <IconButton
                variant="solid"
                colorPalette="gray"
                size="md"
                borderRadius="full"
                boxShadow="raised"
                aria-label="현재 위치"
              >
                <Icon name="location" size={20} />
              </IconButton>
            </Box>
          </Box>

          <Box
            position="relative"
            marginTop="-6"
            borderTopRadius="sheet"
            backgroundColor="bg.panel"
            boxShadow="overlay"
            paddingTop="2"
            paddingBottom="block"
          >
            <Box
              width="handle"
              height="4px"
              borderRadius="full"
              backgroundColor="border.emphasized"
              marginInline="auto"
              marginBottom="3"
            />

            <Flex direction="column" gap="3" paddingInline="screen">
              <SectionHeader title="이 자리 제보" count={1} />

              <Flex gap="3" align="center" minWidth="0">
                <AspectRatio ratio={1} width="72px" flexShrink={0}>
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
                    {REPORT.time}
                  </Text>
                </Box>
              </Flex>

              <Button size="lg" width="100%">
                제보 자세히 보기
              </Button>
            </Flex>
          </Box>
        </Screen>
      </Demo>

      <Text textStyle="caption" color="fg.assistive">
        핀 좌표는 행정동 중심값이며 제보에 담긴 정확한 좌표는 지도에도 응답에도 올리지 않습니다
      </Text>
    </Spec>
  );
}

export function ShellsCatalog() {
  return (
    <>
      <ScreenSection />
      <PageHeaderSection />
      <SectionHeaderSection />
      <CtaBarSection />
      <FabSection />
      <ShellHomeSection />
      <ShellFormSection />
      <ShellDetailSection />
      <ShellSettingsSection />
      <ShellOnboardingSection />
      <ShellAuthSection />
      <ShellListSection />
      <ShellMapSection />
    </>
  );
}
