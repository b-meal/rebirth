"use client";

import { useState } from "react";
import {
  AbsoluteCenter,
  Avatar,
  Badge,
  Box,
  Button,
  Circle,
  Clipboard,
  Flex,
  Float,
  Group,
  HStack,
  IconButton,
  Input,
  Kbd,
  Loader,
  Menu,
  Portal,
  Progress,
  ProgressCircle,
  Separator,
  Skeleton,
  SkeletonCircle,
  SkeletonText,
  Spinner,
  Status,
  Tag,
  Text,
} from "@chakra-ui/react";

import { AppBarAction } from "@/components/ui/app-bar";
import { Chip } from "@/components/ui/chip";
import { Icon } from "@/components/ui/icons";
import { ListItem } from "@/components/ui/list-item";
import { ScrollRow } from "@/components/ui/screen";
import { StepProgress } from "@/components/ui/step-progress";
import { toaster } from "@/components/ui/toaster";

import { Demo, Spec, SpecTable, ThemeStage, Token, TokenRow, Usage } from "./spec";

// 혼자 쓰이는 가장 작은 단위, 화면 조립 전에 낱개 상태를 모두 보이는 절

const BUTTON_VARIANTS = ["solid", "subtle", "surface", "outline", "ghost", "plain"] as const;

const FILTERS = ["전체", "배회 중", "제보자 보호 중", "확인 중"] as const;

const INITIAL_TAGS = ["연남동", "흰색 소형견", "목줄 있음"];

const AVATAR_SIZES = ["xs", "sm", "md", "lg", "xl"] as const;

export function ElementsCatalog() {
  const [filter, setFilter] = useState<string>(FILTERS[0]);
  const [tags, setTags] = useState(INITIAL_TAGS);

  return (
    <>
      <Spec
        id="button"
        title="Button"
        description="한 화면에서 solid 는 가장 중요한 동작 하나에만 씁니다. 기본 크기는 lg 로 올려 두어 손가락 44px 을 확보합니다."
      >
        <Demo label="variant" variant="row">
          {BUTTON_VARIANTS.map((variant) => (
            <Button key={variant} size="sm" variant={variant}>
              {variant}
            </Button>
          ))}
        </Demo>

        <Demo label="size" variant="row" note="sm 은 목록 안 보조 동작, xl 은 화면 아래 제출 버튼입니다">
          <Button size="sm">sm</Button>
          <Button size="md">md</Button>
          <Button size="lg">lg</Button>
          <Button size="xl">xl</Button>
        </Demo>

        <Demo label="상태" variant="row">
          <Button size="sm" loading loadingText="올리는 중">
            사진 올리기
          </Button>
          <Button size="sm" loading variant="subtle" colorPalette="gray" />
          <Button size="sm" disabled>
            비활성
          </Button>
        </Demo>

        <Demo label="화면 아래 기본 동작" note="폼 제출은 너비를 채우고 xl 로 둡니다">
          <Button size="xl" width="100%">
            제보 등록
          </Button>
        </Demo>

        <Demo label="아이콘 동반" variant="row">
          <Button size="sm" variant="subtle">
            <Icon name="camera" size={16} />
            사진 추가
          </Button>
          <Button size="sm" variant="outline">
            <Icon name="share" size={16} />
            공유
          </Button>
        </Demo>

        <Demo label="다른 팔레트" variant="row" note="회색은 물러나는 동작, 빨강은 되돌릴 수 없는 동작에만 씁니다">
          <Button size="sm" variant="subtle" colorPalette="gray">
            나중에 하기
          </Button>
          <Button size="sm" variant="subtle" colorPalette="red">
            제보 내리기
          </Button>
          <Button size="sm" colorPalette="red">
            삭제
          </Button>
        </Demo>

        <Demo label="두 테마" variant="bare">
          <ThemeStage>
            <Button size="sm">제보 등록</Button>
            <Button size="sm" variant="subtle">
              나중에
            </Button>
            <Button size="sm" variant="outline" colorPalette="gray">
              취소
            </Button>
          </ThemeStage>
        </Demo>

        <SpecTable
          rows={[
            ["높이", "sm 36 / md 40 / lg 44 / xl 48"],
            ["좌우 패딩", "sm 14 / md 16 / lg 20 / xl 20"],
            ["글자", "sm 14 / md 14 / lg 16 / xl 16"],
            ["모서리", <>12px, <Token>radii.control</Token></>],
            ["disabled", "opacity 0.5, cursor not-allowed"],
            ["loading", "글자가 loadingText 로 바뀌고 클릭 차단"],
          ]}
        />

        <Usage
          code={`import { Button } from "@chakra-ui/react";

<Button size="xl" width="100%">제보 등록</Button>`}
        />
      </Spec>

      <Spec
        id="icon-button"
        title="Icon Button"
        description="글자 없이 아이콘만 두는 버튼입니다. aria-label 이 없으면 화면 낭독기에서 이름이 사라지므로 반드시 넣습니다."
      >
        <Demo label="size" variant="row">
          <IconButton size="sm" variant="ghost" colorPalette="gray" aria-label="공유">
            <Icon name="share" size={16} />
          </IconButton>
          <IconButton size="md" variant="ghost" colorPalette="gray" aria-label="공유">
            <Icon name="share" size={20} />
          </IconButton>
          <IconButton size="lg" variant="ghost" colorPalette="gray" aria-label="공유">
            <Icon name="share" size={24} />
          </IconButton>
        </Demo>

        <Demo label="variant" variant="row">
          <IconButton size="md" aria-label="저장">
            <Icon name="bookmark" size={20} />
          </IconButton>
          <IconButton size="md" variant="subtle" aria-label="저장">
            <Icon name="bookmark" size={20} />
          </IconButton>
          <IconButton size="md" variant="outline" colorPalette="gray" aria-label="저장">
            <Icon name="bookmark" size={20} />
          </IconButton>
          <IconButton size="md" variant="ghost" colorPalette="gray" aria-label="저장">
            <Icon name="bookmark" size={20} />
          </IconButton>
        </Demo>

        <Demo label="AppBarAction" variant="row" note="상단 바 오른쪽 전용, 44px 터치 영역을 고정으로 잡습니다">
          <AppBarAction icon="search" label="검색" />
          <AppBarAction icon="bell" label="알림" />
          <AppBarAction icon="moreVertical" label="더 보기" />
        </Demo>

        <Demo label="둥근 버튼" variant="row" note="지도 위처럼 바탕이 복잡한 자리에는 원형과 그림자를 함께 씁니다">
          <IconButton
            size="lg"
            variant="solid"
            borderRadius="full"
            boxShadow="raised"
            aria-label="현재 위치로"
          >
            <Icon name="location" size={22} />
          </IconButton>
          <IconButton
            size="lg"
            variant="surface"
            colorPalette="gray"
            borderRadius="full"
            boxShadow="raised"
            aria-label="지도 보기"
          >
            <Icon name="map" size={22} />
          </IconButton>
        </Demo>
      </Spec>

      <Spec
        id="button-group"
        title="Button Group"
        description="버튼 두 개 이상이 한 덩어리로 붙는 자리입니다. 나란히 둘 때 주 동작을 오른쪽에 둡니다."
      >
        <Demo label="Group attached">
          <Group attached>
            <Button size="sm" variant="outline" colorPalette="gray">
              목록
            </Button>
            <Button size="sm" variant="outline" colorPalette="gray">
              지도
            </Button>
            <Button size="sm" variant="outline" colorPalette="gray">
              사진
            </Button>
          </Group>
        </Demo>

        <Demo label="단계 폼의 이전 다음" note="이전은 회색 subtle, 다음은 브랜드 solid 로 무게를 나눕니다">
          <Flex gap="2" width="100%">
            <Button flex="1" variant="subtle" colorPalette="gray">
              이전
            </Button>
            <Button flex="1">다음</Button>
          </Flex>
        </Demo>

        <Demo label="주 동작과 물러나는 동작" note="세로로 쌓을 때 아래쪽은 plain 으로 낮춥니다">
          <Button size="xl" width="100%">
            제보 이어서 쓰기
          </Button>
          <Button width="100%" variant="plain" colorPalette="gray">
            저장하지 않고 나가기
          </Button>
        </Demo>
      </Spec>

      <Spec
        id="split-button"
        title="Split Button"
        description="주 동작 하나에 덜 쓰는 갈래를 붙입니다. 주 동작이 분명할 때만 쓰고 아니면 ActionSheet 로 보냅니다."
      >
        <Demo label="주 동작과 갈래">
          <Menu.Root>
            <Group attached>
              <Button onClick={() => toaster.create({ title: "공유 창을 열었습니다" })}>
                <Icon name="share" size={18} />
                공유하기
              </Button>
              <Menu.Trigger asChild>
                <IconButton aria-label="공유 방법 더 보기">
                  <Icon name="chevronDown" size={18} />
                </IconButton>
              </Menu.Trigger>
            </Group>
            <Portal>
              <Menu.Positioner>
                <Menu.Content>
                  <Menu.Item
                    value="copy-link"
                    onSelect={() => toaster.create({ title: "링크를 복사했습니다" })}
                  >
                    <Icon name="link" size={16} />
                    <Menu.ItemText>링크 복사</Menu.ItemText>
                  </Menu.Item>
                  <Menu.Item
                    value="save-qr"
                    onSelect={() => toaster.create({ title: "QR 이미지를 저장했습니다" })}
                  >
                    <Icon name="qr" size={16} />
                    <Menu.ItemText>QR 저장</Menu.ItemText>
                  </Menu.Item>
                </Menu.Content>
              </Menu.Positioner>
            </Portal>
          </Menu.Root>
        </Demo>

        <Demo
          label="테두리 형태"
          note="갈래가 세 개를 넘거나 주 동작을 고를 수 없으면 ActionSheet 가 맞습니다"
        >
          <Menu.Root>
            <Group attached>
              <Button size="sm" variant="outline" colorPalette="gray">
                목록 내려받기
              </Button>
              <Menu.Trigger asChild>
                <IconButton size="sm" variant="outline" colorPalette="gray" aria-label="형식 고르기">
                  <Icon name="chevronDown" size={16} />
                </IconButton>
              </Menu.Trigger>
            </Group>
            <Portal>
              <Menu.Positioner>
                <Menu.Content>
                  <Menu.Item value="csv">CSV</Menu.Item>
                  <Menu.Item value="pdf">PDF</Menu.Item>
                </Menu.Content>
              </Menu.Positioner>
            </Portal>
          </Menu.Root>
        </Demo>

        <Usage
          code={`<Menu.Root>
  <Group attached>
    <Button>공유하기</Button>
    <Menu.Trigger asChild>
      <IconButton aria-label="공유 방법 더 보기" />
    </Menu.Trigger>
  </Group>
</Menu.Root>`}
        />
      </Spec>

      <Spec
        id="copy-button"
        title="Copy Button"
        description="복사한 뒤 아이콘이 잠깐 체크로 바뀌어 눌린 것을 알립니다. 토스트까지 함께 띄우면 소식이 두 번 옵니다."
      >
        <Demo label="아이콘만" variant="row">
          <Clipboard.Root value="req_8f21c0a4">
            <Clipboard.Trigger asChild>
              <IconButton variant="ghost" colorPalette="gray" aria-label="요청 번호 복사">
                <Clipboard.Indicator copied={<Icon name="check" size={20} />}>
                  <Icon name="copy" size={20} />
                </Clipboard.Indicator>
              </IconButton>
            </Clipboard.Trigger>
          </Clipboard.Root>
          <Text textStyle="caption" fontFamily="mono" color="fg.assistive">
            req_8f21c0a4
          </Text>
        </Demo>

        <Demo label="글자와 함께" variant="row">
          <Clipboard.Root value="https://dasijip.kr/r/8f21c0">
            <Clipboard.Trigger asChild>
              <Button size="sm" variant="subtle" colorPalette="gray">
                <Clipboard.Indicator copied={<Icon name="check" size={16} />}>
                  <Icon name="copy" size={16} />
                </Clipboard.Indicator>
                링크 복사
              </Button>
            </Clipboard.Trigger>
          </Clipboard.Root>
        </Demo>

        <Demo label="입력 끝에 붙임" note="공유 링크처럼 값을 보여 주면서 복사도 받는 자리입니다">
          <Clipboard.Root value="https://dasijip.kr/r/8f21c0" width="100%">
            <Group attached width="100%">
              <Clipboard.Input asChild>
                <Input size="sm" flex="1" minWidth="0" readOnly />
              </Clipboard.Input>
              <Clipboard.Trigger asChild>
                <IconButton size="sm" variant="outline" colorPalette="gray" aria-label="링크 복사">
                  <Clipboard.Indicator copied={<Icon name="check" size={16} />}>
                    <Icon name="copy" size={16} />
                  </Clipboard.Indicator>
                </IconButton>
              </Clipboard.Trigger>
            </Group>
          </Clipboard.Root>
        </Demo>
      </Spec>

      <Spec
        id="chip"
        title="Chip"
        description="고르는 칩과 읽기 전용 태그를 한 컴포넌트로 둡니다. readOnly 는 span 으로 렌더되어 탭 순서에 끼지 않습니다."
      >
        <Demo label="size" variant="row">
          <Chip size="xsmall">xsmall</Chip>
          <Chip size="small">small</Chip>
          <Chip size="medium">medium</Chip>
        </Demo>

        <Demo label="상태" variant="row">
          <Chip size="small">기본</Chip>
          <Chip size="small" active>
            선택됨
          </Chip>
          <Chip size="small" outlined>
            테두리
          </Chip>
          <Chip size="small" readOnly>
            읽기 전용
          </Chip>
        </Demo>

        <Demo label="필터 한 줄" variant="bare" note="화면 여백 밖까지 넘기는 ScrollRow 안에 두어 가로로 훑게 합니다">
          <ScrollRow paddingBlock="1">
            {FILTERS.map((item) => (
              <Chip
                key={item}
                size="small"
                active={filter === item}
                onClick={() => setFilter(item)}
              >
                {item}
              </Chip>
            ))}
          </ScrollRow>
        </Demo>

        <Demo label="두 테마" variant="bare">
          <ThemeStage>
            <Chip size="small" active>
              배회 중
            </Chip>
            <Chip size="small">제보자 보호 중</Chip>
            <Chip size="small" outlined>
              확인 중
            </Chip>
          </ThemeStage>
        </Demo>

        <SpecTable
          rows={[
            ["높이", "xsmall 24 / small 30 / medium 36"],
            ["좌우 패딩", "xsmall 8 / small 10 / medium 14"],
            ["글자", "xsmall 12 / small 14 / medium 14"],
            ["모서리", "full"],
            ["선택", "active 는 brand solid, 기본은 gray subtle"],
            ["읽기 전용", <><Token>readOnly</Token> 는 span 렌더, 포커스와 클릭 없음</>],
          ]}
        />

        <Usage code={`<Chip size="small" active={selected} onClick={select}>배회 중</Chip>`} />
      </Spec>

      <Spec
        id="badge"
        title="Badge & Tag"
        description="Badge 는 사람이 누를 수 없는 상태 표시, Tag 는 지울 수 있는 값, Chip 은 고르는 값입니다."
      >
        <Demo label="Badge variant" variant="row">
          <Badge variant="solid">신규</Badge>
          <Badge variant="subtle">확인 중</Badge>
          <Badge variant="outline">종료</Badge>
          <Badge variant="surface">보호 중</Badge>
        </Demo>

        <Demo label="Badge palette" variant="row">
          <Badge colorPalette="brand">브랜드</Badge>
          <Badge colorPalette="gray">기본</Badge>
          <Badge colorPalette="red">긴급</Badge>
          <Badge colorPalette="green">완료</Badge>
        </Demo>

        <Demo label="Tag 지울 수 있는 값" variant="row">
          {tags.map((tag) => (
            <Tag.Root key={tag} size="md" colorPalette="gray">
              <Tag.Label>{tag}</Tag.Label>
              <Tag.EndElement>
                <Tag.CloseTrigger
                  aria-label={`${tag} 지우기`}
                  onClick={() => setTags((prev) => prev.filter((item) => item !== tag))}
                />
              </Tag.EndElement>
            </Tag.Root>
          ))}
          {tags.length < INITIAL_TAGS.length ? (
            <Button size="xs" variant="plain" colorPalette="gray" onClick={() => setTags(INITIAL_TAGS)}>
              되돌리기
            </Button>
          ) : null}
        </Demo>

        <Demo
          label="읽기 전용 Chip 태그"
          variant="row"
          note="같은 모양이라도 지울 수 있으면 Tag, 상태만 알리면 Badge, 고르면 Chip 입니다"
        >
          <Chip size="xsmall" readOnly>
            흰색 소형견
          </Chip>
          <Chip size="xsmall" readOnly>
            말티즈 계열 추정
          </Chip>
          <Chip size="xsmall" readOnly>
            서울 마포구 연남동
          </Chip>
        </Demo>

        <SpecTable
          rows={[
            ["최소 높이", "xs 16 / sm 20 / md 24 / lg 28"],
            ["좌우 패딩", "xs 4 / sm 6 / md 8 / lg 10"],
            ["글자", "xs 10 / sm 12 / md 14 / lg 14"],
            ["모서리", "12px"],
            ["기본값", "variant subtle, size sm"],
            ["동작", "누를 수 없고 탭 순서에 끼지 않음"],
          ]}
        />
      </Spec>

      <Spec
        id="avatar"
        title="Avatar"
        description="제보자와 보호소 계정을 나타냅니다. 사진이 없으면 이름 첫 글자로 떨어집니다."
      >
        <Demo label="size" variant="row">
          {AVATAR_SIZES.map((size) => (
            <Avatar.Root key={size} size={size}>
              <Avatar.Fallback name="김제보" />
            </Avatar.Root>
          ))}
        </Demo>

        <Demo label="사진과 대체 글자" variant="row">
          <Avatar.Root size="lg">
            <Avatar.Fallback name="다시집" />
            <Avatar.Image src="/logo/logo-mark.png" alt="" />
          </Avatar.Root>
          <Avatar.Root size="lg" colorPalette="brand">
            <Avatar.Fallback name="박이웃" />
          </Avatar.Root>
          <Avatar.Root size="lg" variant="outline" colorPalette="gray">
            <Avatar.Fallback>
              <Icon name="user" size={22} />
            </Avatar.Fallback>
          </Avatar.Root>
        </Demo>

        <Demo label="접속 표시" variant="row" note="Float 로 아바타 오른쪽 아래에 점을 겹칩니다">
          <Avatar.Root size="lg" colorPalette="brand">
            <Avatar.Fallback name="이보호" />
            <Float placement="bottom-end" offsetX="1" offsetY="1">
              <Circle size="10px" backgroundColor="green.500" outlineWidth="2px" outlineStyle="solid" outlineColor="bg.panel" />
            </Float>
          </Avatar.Root>
          <Avatar.Root size="lg" colorPalette="gray">
            <Avatar.Fallback name="최관찰" />
            <Float placement="bottom-end" offsetX="1" offsetY="1">
              <Circle size="10px" backgroundColor="bg.emphasized" outlineWidth="2px" outlineStyle="solid" outlineColor="bg.panel" />
            </Float>
          </Avatar.Root>
        </Demo>

        <SpecTable
          rows={[
            ["지름", "xs 32 / sm 36 / md 40 / lg 44 / xl 48"],
            ["글자", "xs 12 / sm 14 / md 16 / lg 16 / xl 18"],
            ["모서리", <>full, <Token>shape</Token> 로 square rounded 전환</>],
            ["대체 표시", "name 첫 글자, 없으면 사람 아이콘"],
            ["기본값", "variant subtle, size md"],
            ["접속 점", "Float bottom-end, 지름 10px"],
          ]}
        />
      </Spec>

      <Spec
        id="progress"
        title="Progress"
        description="끝이 있는 작업에만 씁니다. 남은 시간을 모르면 indeterminate 로 두거나 스피너로 바꿉니다."
      >
        <Demo label="size">
          <Progress.Root value={40} size="xs">
            <Progress.Track borderRadius="full">
              <Progress.Range />
            </Progress.Track>
          </Progress.Root>
          <Progress.Root value={60} size="sm">
            <Progress.Track borderRadius="full">
              <Progress.Range />
            </Progress.Track>
          </Progress.Root>
          <Progress.Root value={80} size="md">
            <Progress.Track borderRadius="full">
              <Progress.Range />
            </Progress.Track>
          </Progress.Root>
        </Demo>

        <Demo label="이름과 값">
          <Progress.Root value={64} size="sm">
            <HStack justify="space-between" marginBottom="2">
              <Progress.Label textStyle="label">사진 올리는 중</Progress.Label>
              <Progress.ValueText textStyle="caption" color="fg.alternative" />
            </HStack>
            <Progress.Track borderRadius="full">
              <Progress.Range />
            </Progress.Track>
          </Progress.Root>
        </Demo>

        <Demo label="indeterminate" note="value 를 null 로 두면 끝을 모르는 작업으로 그립니다">
          <Progress.Root value={null} size="sm">
            <Progress.Track borderRadius="full">
              <Progress.Range />
            </Progress.Track>
          </Progress.Root>
        </Demo>

        <Demo label="ProgressCircle" variant="row">
          <ProgressCircle.Root value={70} size="sm">
            <ProgressCircle.Circle>
              <ProgressCircle.Track />
              <ProgressCircle.Range />
            </ProgressCircle.Circle>
          </ProgressCircle.Root>
          <ProgressCircle.Root value={45} size="lg">
            <ProgressCircle.Circle>
              <ProgressCircle.Track />
              <ProgressCircle.Range />
            </ProgressCircle.Circle>
            <AbsoluteCenter>
              <ProgressCircle.ValueText textStyle="caption" />
            </AbsoluteCenter>
          </ProgressCircle.Root>
        </Demo>

        <Demo label="StepProgress" note="여러 단계 폼 상단 고정, 현재 단계 이름을 함께 적습니다">
          <StepProgress current={2} total={4} label="위치" />
        </Demo>

        <Usage code={`<StepProgress current={2} total={4} label="위치" />`} />
      </Spec>

      <Spec
        id="spinner"
        title="Spinner"
        description="1초 안팎으로 끝나는 짧은 동작에 씁니다. 목록이 통째로 비어 있는 동안에는 스켈레톤이 낫습니다."
      >
        <Demo label="size" variant="row">
          <Spinner size="xs" />
          <Spinner size="sm" />
          <Spinner size="md" />
          <Spinner size="lg" />
        </Demo>

        <Demo label="글자 옆" variant="row">
          <HStack gap="2" textStyle="bodySm" color="fg.alternative">
            <Spinner size="sm" />
            <Text>불러오는 중</Text>
          </HStack>
        </Demo>

        <Demo label="브랜드 색" variant="row">
          <Spinner size="md" color="brand.solid" />
          <Spinner size="md" color="fg.assistive" />
        </Demo>

        <Demo label="Loader" variant="row" note="스피너와 글자를 한 덩어리로 묶어 버튼 안에도 그대로 넣습니다">
          <HStack gap="2" textStyle="bodySm" color="fg.alternative">
            <Loader text="주변 제보를 찾는 중" />
          </HStack>
        </Demo>
      </Spec>

      <Spec
        id="skeleton"
        title="Skeleton"
        description="들어올 내용의 자리를 미리 잡습니다. 실제 카드와 높이가 다르면 화면이 튀므로 같은 뼈대를 씁니다."
      >
        <Demo label="기본 도형">
          <Skeleton height="6" />
          <HStack gap="3">
            <SkeletonCircle size="10" />
            <Skeleton height="6" flex="1" />
          </HStack>
        </Demo>

        <Demo label="SkeletonText">
          <SkeletonText noOfLines={3} gap="2" />
        </Demo>

        <Demo label="제보 카드 자리" note="목록 첫 화면은 카드 두세 장 분량만 깔고 더 늘리지 않습니다">
          <Flex gap="3" align="center">
            <Skeleton boxSize="16" borderRadius="control" flexShrink={0} />
            <Flex direction="column" gap="2" flex="1" minWidth="0">
              <Skeleton height="4" width="70%" />
              <Skeleton height="3" width="45%" />
            </Flex>
          </Flex>
          <Flex gap="3" align="center">
            <Skeleton boxSize="16" borderRadius="control" flexShrink={0} />
            <Flex direction="column" gap="2" flex="1" minWidth="0">
              <Skeleton height="4" width="60%" />
              <Skeleton height="3" width="50%" />
            </Flex>
          </Flex>
        </Demo>
      </Spec>

      <Spec
        id="separator"
        title="Separator"
        description="묶음이 바뀌는 자리에만 긋습니다. 카드가 이미 경계를 만들면 선을 겹치지 않습니다."
      >
        <Demo label="가로">
          <Text textStyle="bodySm">최근 제보</Text>
          <Separator borderColor="border.muted" />
          <Text textStyle="bodySm" color="fg.alternative">
            지난 제보
          </Text>
        </Demo>

        <Demo label="가운데 글자">
          <HStack gap="3">
            <Separator flex="1" borderColor="border.muted" />
            <Text textStyle="caption" color="fg.assistive">
              또는
            </Text>
            <Separator flex="1" borderColor="border.muted" />
          </HStack>
        </Demo>

        <Demo label="세로" note="메타 정보 사이 구분에만 쓰고 높이를 글자 높이에 맞춥니다">
          <HStack gap="2" textStyle="caption" color="fg.alternative">
            <Text>서울 마포구 연남동</Text>
            <Separator orientation="vertical" height="3" borderColor="border" />
            <Text>3시간 전</Text>
            <Separator orientation="vertical" height="3" borderColor="border" />
            <Text>확인 12</Text>
          </HStack>
        </Demo>
      </Spec>

      <Spec
        id="status"
        title="Status"
        description="제보 하나의 현재 상태를 점 하나와 짧은 말로 알립니다. 색만으로 구분하지 않고 글자를 함께 둡니다."
      >
        <Demo label="상태 값">
          <Status.Root colorPalette="orange">
            <Status.Indicator />
            배회 중
          </Status.Root>
          <Status.Root colorPalette="green">
            <Status.Indicator />
            제보자 보호 중
          </Status.Root>
          <Status.Root colorPalette="gray">
            <Status.Indicator />
            확인 중
          </Status.Root>
          <Status.Root colorPalette="gray">
            <Status.Indicator
              backgroundColor="transparent"
              borderWidth="1px"
              borderColor="border.emphasized"
            />
            종료
          </Status.Root>
        </Demo>

        <Demo label="목록 행 오른쪽" variant="screen">
          <Box borderBottomWidth="1px" borderColor="border.muted">
            <ListItem
              title="흰색 소형견, 말티즈 계열 추정"
              description="서울 마포구 연남동"
              leading="paw"
              trailing={
                <Status.Root size="sm" colorPalette="orange">
                  <Status.Indicator />
                  배회 중
                </Status.Root>
              }
            />
          </Box>
          <ListItem
            title="갈색 중형견, 진돗개 계열 추정"
            description="서울 마포구 성산동"
            leading="paw"
            trailing={
              <Status.Root size="sm" colorPalette="green">
                <Status.Indicator />
                제보자 보호 중
              </Status.Root>
            }
          />
        </Demo>

        <Demo label="색과 뜻">
          <TokenRow name="배회 중" value="orange" />
          <TokenRow name="제보자 보호 중" value="green" />
          <TokenRow name="확인 중" value="gray" />
          <TokenRow name="종료" value="gray outline" />
        </Demo>
      </Spec>

      <Spec
        id="kbd"
        title="Kbd"
        description="키 이름 표기입니다. 모바일에서는 외장 키보드를 붙인 사람에게만 뜻이 있으므로 안내 문구에만 씁니다."
      >
        <Demo label="size" variant="row">
          <Kbd size="sm">esc</Kbd>
          <Kbd size="md">esc</Kbd>
          <Kbd size="lg">esc</Kbd>
        </Demo>

        <Demo label="variant" variant="row">
          <Kbd variant="raised">Ctrl</Kbd>
          <Kbd variant="outline">Ctrl</Kbd>
          <Kbd variant="subtle">Ctrl</Kbd>
          <Kbd variant="plain">Ctrl</Kbd>
        </Demo>

        <Demo label="조합" variant="row" note="키 사이 더하기는 글자로 두어 낭독기에서도 읽히게 합니다">
          <HStack gap="1">
            <Kbd size="sm">Ctrl</Kbd>
            <Text textStyle="caption" color="fg.assistive">
              +
            </Text>
            <Kbd size="sm">K</Kbd>
            <Text textStyle="bodySm" color="fg.alternative" marginInlineStart="1">
              검색 열기
            </Text>
          </HStack>
        </Demo>

        <SpecTable
          rows={[
            ["높이", "sm 18 / md 20 / lg 24"],
            ["좌우 패딩", "4"],
            ["글자", <><Token>fonts.mono</Token>, sm 12 / md 14 / lg 16</>],
            ["기본값", "variant raised, size md"],
          ]}
        />
      </Spec>
    </>
  );
}
