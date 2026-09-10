"use client";

import { useEffect, useRef, useState } from "react";
import {
  AspectRatio,
  Avatar,
  Box,
  Button,
  Checkbox,
  CheckboxCard,
  ColorPicker,
  Combobox,
  createListCollection,
  DatePicker,
  Editable,
  Fieldset,
  FileUpload,
  Flex,
  Float,
  IconButton,
  Input,
  InputGroup,
  NativeSelect,
  NumberInput,
  parseColor,
  PinInput,
  Portal,
  Progress,
  RadioCard,
  RadioGroup,
  RatingGroup,
  Select,
  Slider,
  Switch,
  TagsInput,
  Text,
  Textarea,
  Toggle,
  useFilter,
  useListCollection,
} from "@chakra-ui/react";

import { Chip } from "@/components/ui/chip";
import { Field } from "@/components/ui/field";
import { Icon } from "@/components/ui/icons";
import { ListGroup, ListItem } from "@/components/ui/list-item";
import { PhotoPicker } from "@/components/ui/photo-picker";
import {
  PhotoPickerInput,
  type PhotoPickerInputHandle,
} from "@/components/ui/photo-picker-input";
import { SearchBar } from "@/components/ui/search-bar";
import { Segmented } from "@/components/ui/segmented";
import { usePhotoPicker } from "@/hooks/use-photo-picker";

import { COAT_COLORS } from "@/lib/theme";

import { Demo, Spec, SpecTable, ThemeStage, Token, TokenRow, Usage } from "./spec";

// 입력과 선택 절의 예시 모음, 절마다 자기 상태를 가진 작은 컴포넌트로 나눔

const AI_DRAFT = "흰색 소형견, 말티즈 계열 추정";

function DraftChip() {
  return (
    <Chip size="xsmall" readOnly marginInlineStart="2">
      AI 초안
    </Chip>
  );
}

function FieldDemo() {
  return (
    <>
      <Demo label="라벨과 도움말">
        <Field label="발견 장소" helper="행정동까지만 적습니다">
          <Input placeholder="연남동" />
        </Field>
      </Demo>
      <Demo label="필수와 오류" note="오류가 들어오면 도움말을 밀어내고 오류만 남습니다">
        <Field
          label="발견 장소"
          required
          helper="행정동까지만 적습니다"
          error="발견 장소를 입력해 주세요"
        >
          <Input placeholder="연남동" />
        </Field>
      </Demo>
      <Demo label="라벨 옆 배지">
        <Field label="외형 요약" labelSuffix={<DraftChip />} helper="초안을 그대로 고칠 수 있습니다">
          <Input defaultValue={AI_DRAFT} />
        </Field>
      </Demo>
      <Demo label="비활성">
        <Field label="제보 번호" helper="접수 뒤 자동으로 채워집니다">
          <Input disabled placeholder="접수 전" />
        </Field>
      </Demo>
      <SpecTable
        rows={[
          ["구성", "라벨, 입력, 도움말 또는 오류 한 줄"],
          ["세로 간격", <Token key="gap">gap 2</Token>],
          ["라벨", <Token key="label">label</Token>],
          ["도움말", "caption, fg.muted"],
          ["오류", "caption, fg.error"],
          ["필수", "라벨 뒤 RequiredIndicator, fg.error"],
          ["disabled", "라벨과 입력 투명도 0.5"],
        ]}
      />
    </>
  );
}

function InputDemo() {
  return (
    <>
      <Demo label="variant">
        <Input variant="outline" placeholder="outline" />
        <Input variant="subtle" placeholder="subtle" />
        <Input variant="flushed" placeholder="flushed" />
      </Demo>
      <Demo label="size" note="기본값을 lg 로 올려 두어 따로 적지 않아도 손가락 기준을 넘깁니다">
        <Input size="md" placeholder="md" />
        <Input size="lg" placeholder="lg" />
        <Input size="xl" placeholder="xl" />
      </Demo>
      <Demo label="앞뒤 요소">
        <InputGroup startElement={<Icon name="pinOutline" size={18} />}>
          <Input placeholder="행정동 검색" />
        </InputGroup>
        <InputGroup endElement="kg">
          <Input inputMode="decimal" placeholder="몸무게 추정" />
        </InputGroup>
      </Demo>
      <Demo label="숫자 자판" note="type tel 과 inputMode numeric 으로 전화 자판을 바로 띄웁니다">
        <Field label="연락처" helper="확인 연락이 필요할 때만 사용합니다">
          <InputGroup startElement={<Icon name="phone" size={18} />}>
            <Input type="tel" inputMode="numeric" placeholder="010-0000-0000" />
          </InputGroup>
        </Field>
      </Demo>
      <Demo label="비활성과 오류">
        <Input disabled placeholder="비활성" />
        <Field label="연락처" error="숫자만 입력해 주세요">
          <Input defaultValue="010-없음" />
        </Field>
      </Demo>
      <Demo label="크기별 높이" variant="bare">
        <TokenRow name="size md" value="40px" />
        <TokenRow name="size lg" value="44px" />
        <TokenRow name="size xl" value="48px" />
      </Demo>
      <Demo label="테마 비교" variant="bare">
        <ThemeStage>
          <Input variant="outline" placeholder="outline" />
          <Input variant="subtle" placeholder="subtle" />
        </ThemeStage>
      </Demo>
      <SpecTable
        rows={[
          ["높이", "md 40 / lg 44 / xl 48"],
          ["기본 크기", <Token key="size">lg</Token>],
          ["좌우 여백", "md 12 / lg 16 / xl 18"],
          ["모서리", <Token key="radius">radii.l2</Token>],
          ["포커스 링", <Token key="ring">brand.focusRing</Token>],
          ["invalid", "테두리와 링을 border.error 로 교체"],
          ["disabled", "layerStyle disabled 적용"],
        ]}
      />
      <Usage
        code={`<InputGroup startElement={<Icon name="pinOutline" />}>
  <Input placeholder="행정동 검색" />
</InputGroup>`}
      />
    </>
  );
}

const NOTE_LIMIT = 200;

function TextareaDemo() {
  const [note, setNote] = useState("목줄이 있고 사람을 피하지 않습니다");

  return (
    <>
      <Demo label="기본 3줄">
        <Textarea rows={3} placeholder="발견 당시 상황을 적어 주세요" />
      </Demo>
      <Demo label="autoresize" note="줄이 늘어나면 상자가 따라 커져 안쪽 스크롤이 생기지 않습니다">
        <Textarea autoresize rows={2} placeholder="입력하면 높이가 늘어납니다" />
      </Demo>
      <Demo label="글자 수">
        <Textarea
          rows={3}
          maxLength={NOTE_LIMIT}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
        <Text textStyle="caption" color="fg.assistive" textAlign="end">
          {note.length} / {NOTE_LIMIT}
        </Text>
      </Demo>
      <Demo label="비활성">
        <Textarea disabled rows={2} placeholder="제보 확정 뒤에는 고칠 수 없습니다" />
      </Demo>
    </>
  );
}

function NumberInputDemo() {
  const [count, setCount] = useState("1");
  const [stepper, setStepper] = useState(1);

  return (
    <>
      <Demo label="size md">
        <NumberInput.Root
          size="md"
          min={1}
          max={9}
          value={count}
          onValueChange={(details) => setCount(details.value)}
        >
          <NumberInput.Control>
            <NumberInput.IncrementTrigger />
            <NumberInput.DecrementTrigger />
          </NumberInput.Control>
          <NumberInput.Input />
        </NumberInput.Root>
      </Demo>
      <Demo label="size lg">
        <NumberInput.Root size="lg" min={1} max={9} defaultValue="2">
          <NumberInput.Control>
            <NumberInput.IncrementTrigger />
            <NumberInput.DecrementTrigger />
          </NumberInput.Control>
          <NumberInput.Input />
        </NumberInput.Root>
      </Demo>
      <Demo
        label="스테퍼"
        note="화살표가 작아 길에서 누르기 어려우므로 모바일에서는 이 형태를 권장합니다"
      >
        <Flex align="center" gap="3" width="100%">
          <IconButton
            aria-label="마리 수 줄이기"
            variant="outline"
            borderRadius="full"
            disabled={stepper <= 1}
            onClick={() => setStepper((prev) => Math.max(1, prev - 1))}
          >
            <Icon name="minus" size={20} />
          </IconButton>
          <Text flex="1" textAlign="center" textStyle="title3">
            {stepper}마리
          </Text>
          <IconButton
            aria-label="마리 수 늘리기"
            variant="outline"
            borderRadius="full"
            disabled={stepper >= 9}
            onClick={() => setStepper((prev) => Math.min(9, prev + 1))}
          >
            <Icon name="plus" size={20} />
          </IconButton>
        </Flex>
      </Demo>
    </>
  );
}

function PinInputDemo() {
  return (
    <>
      <Demo label="4자리 인증번호">
        <PinInput.Root otp>
          <PinInput.HiddenInput />
          <PinInput.Control>
            {[0, 1, 2, 3].map((index) => (
              <PinInput.Input key={index} index={index} />
            ))}
          </PinInput.Control>
        </PinInput.Root>
      </Demo>
      <Demo label="6자리 가림" note="mask 를 켜면 입력한 숫자가 점으로 바뀝니다">
        <PinInput.Root otp mask size="sm">
          <PinInput.HiddenInput />
          <PinInput.Control>
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <PinInput.Input key={index} index={index} />
            ))}
          </PinInput.Control>
        </PinInput.Root>
      </Demo>
      <Usage
        code={`<PinInput.Root otp mask>
  <PinInput.HiddenInput />
  <PinInput.Control>...</PinInput.Control>
</PinInput.Root>`}
      />
    </>
  );
}

function SearchBarDemo() {
  const [keyword, setKeyword] = useState("");
  const [canceled, setCanceled] = useState(false);
  const [submitted, setSubmitted] = useState<string | null>(null);

  return (
    <>
      <Demo label="기본">
        <SearchBar value={keyword} onChange={setKeyword} placeholder="행정동으로 검색" />
      </Demo>
      <Demo label="취소 버튼" note={canceled ? "취소를 눌렀습니다" : "취소는 넘긴 곳에만 붙습니다"}>
        <SearchBar
          value={keyword}
          onChange={setKeyword}
          onCancel={() => {
            setKeyword("");
            setCanceled(true);
          }}
        />
      </Demo>
      <Demo
        label="제출"
        note={submitted ? `제출한 값: ${submitted}` : "확인 자판을 누르면 제출됩니다"}
      >
        <SearchBar value={keyword} onChange={setKeyword} onSubmit={setSubmitted} />
      </Demo>
    </>
  );
}

const STRENGTH_LABEL = ["너무 짧음", "약함", "보통", "강함", "매우 강함"];

function scoreOf(value: string) {
  let score = 0;
  if (value.length >= 8) score += 1;
  if (/[A-Z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;
  return score;
}

function PasswordInputDemo() {
  const [value, setValue] = useState("");
  const [visible, setVisible] = useState(false);
  const score = scoreOf(value);

  return (
    <>
      <Demo label="보기 전환">
        <InputGroup
          endElement={
            <IconButton
              aria-label={visible ? "비밀번호 가리기" : "비밀번호 보기"}
              size="xs"
              variant="ghost"
              colorPalette="gray"
              onClick={() => setVisible((prev) => !prev)}
            >
              <Icon name={visible ? "eyeOff" : "eye"} size={18} />
            </IconButton>
          }
          endElementProps={{ pointerEvents: "auto" }}
        >
          <Input
            type={visible ? "text" : "password"}
            autoComplete="new-password"
            placeholder="비밀번호"
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
        </InputGroup>
      </Demo>
      <Demo label="세기 표시">
        <Progress.Root value={(score / 4) * 100} size="sm" shape="full" width="100%">
          <Progress.Track>
            <Progress.Range />
          </Progress.Track>
        </Progress.Root>
        <Text textStyle="caption" color={score <= 1 ? "fg.error" : "fg.alternative"}>
          {STRENGTH_LABEL[score]}
        </Text>
      </Demo>
    </>
  );
}

function TagsInputDemo() {
  return (
    <>
      <Demo label="털색 태그" note="적은 뒤 확인을 누르면 태그가 됩니다">
        <TagsInput.Root defaultValue={["흰색", "갈색"]} width="100%">
          <TagsInput.HiddenInput />
          <TagsInput.Label>털색</TagsInput.Label>
          <TagsInput.Control>
            <TagsInput.Items />
            <TagsInput.Input placeholder="색을 적고 확인" />
          </TagsInput.Control>
        </TagsInput.Root>
      </Demo>
      <Demo label="전체 지우기">
        <TagsInput.Root defaultValue={["흰색", "갈색", "검정"]} width="100%">
          <TagsInput.HiddenInput />
          <TagsInput.Control>
            <TagsInput.Items />
            <TagsInput.Input placeholder="색 추가" />
          </TagsInput.Control>
          <TagsInput.ClearTrigger asChild>
            <Button variant="outline" size="sm" alignSelf="start">
              모두 지우기
            </Button>
          </TagsInput.ClearTrigger>
        </TagsInput.Root>
      </Demo>
    </>
  );
}

const SPECIES = createListCollection({
  items: [
    { label: "개", value: "dog" },
    { label: "고양이", value: "cat" },
    { label: "그 외", value: "etc" },
    { label: "확인 어려움", value: "unknown" },
  ],
});

function SelectDemo() {
  const [species, setSpecies] = useState<string[]>([]);

  return (
    <>
      <Demo
        label="네이티브 선택"
        note="OS 선택기를 그대로 써서 한 손으로 고르기 쉬우므로 모바일 기본으로 둡니다"
      >
        <NativeSelect.Root>
          <NativeSelect.Field placeholder="동물 종류 선택">
            {SPECIES.items.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
      </Demo>
      <Demo label="Chakra Select" note="목록이 길면 BottomSheet 선택을 권장합니다">
        <Select.Root
          collection={SPECIES}
          value={species}
          onValueChange={(details) => setSpecies(details.value)}
          width="100%"
        >
          <Select.HiddenSelect />
          <Select.Control>
            <Select.Trigger>
              <Select.ValueText placeholder="동물 종류 선택" />
            </Select.Trigger>
            <Select.IndicatorGroup>
              <Select.Indicator />
            </Select.IndicatorGroup>
          </Select.Control>
          <Portal>
            <Select.Positioner>
              <Select.Content>
                {SPECIES.items.map((item) => (
                  <Select.Item key={item.value} item={item}>
                    <Select.ItemText>{item.label}</Select.ItemText>
                    <Select.ItemIndicator />
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Positioner>
          </Portal>
        </Select.Root>
      </Demo>
    </>
  );
}

const DONGS = [
  { label: "연남동", value: "yeonnam" },
  { label: "성산동", value: "seongsan" },
  { label: "망원동", value: "mangwon" },
  { label: "합정동", value: "hapjeong" },
  { label: "서교동", value: "seogyo" },
];

function ComboboxDemo() {
  const { contains } = useFilter({ sensitivity: "base" });
  const { collection, filter } = useListCollection({
    initialItems: DONGS,
    filter: contains,
  });

  return (
    <>
      <Demo
        label="행정동 찾기"
        note="실제 장소 검색은 PlaceSearchField 가 맡고 여기서는 목록 좁히기만 보입니다"
      >
        <Combobox.Root
          collection={collection}
          openOnClick
          width="100%"
          onInputValueChange={(details) => filter(details.inputValue)}
        >
          <Combobox.Control>
            <Combobox.Input placeholder="행정동 이름" />
            <Combobox.IndicatorGroup>
              <Combobox.ClearTrigger />
              <Combobox.Trigger />
            </Combobox.IndicatorGroup>
          </Combobox.Control>
          <Portal>
            <Combobox.Positioner>
              <Combobox.Content>
                <Combobox.Empty>맞는 행정동이 없습니다</Combobox.Empty>
                {collection.items.map((item) => (
                  <Combobox.Item key={item.value} item={item}>
                    <Combobox.ItemText>{item.label}</Combobox.ItemText>
                    <Combobox.ItemIndicator />
                  </Combobox.Item>
                ))}
              </Combobox.Content>
            </Combobox.Positioner>
          </Portal>
        </Combobox.Root>
      </Demo>
      <Usage
        code={`const { contains } = useFilter({ sensitivity: "base" })
const { collection, filter } = useListCollection({
  initialItems: DONGS,
  filter: contains,
})`}
      />
    </>
  );
}

const CONSENTS = [
  { key: "privacy", label: "개인정보 처리방침 동의" },
  { key: "location", label: "위치 정보 이용 동의" },
  { key: "photo", label: "사진 공개 동의" },
];

const TRAITS = [
  { value: "collar", label: "목줄 있음", description: "이름표나 인식표가 함께 있을 수 있습니다" },
  { value: "hurt", label: "다친 것으로 보임", description: "절뚝이거나 상처가 보이는 상태입니다" },
  { value: "eartip", label: "귀 끝 잘림", description: "중성화한 길고양이 표시일 수 있습니다" },
];

const TRAIT_COLLECTION = createListCollection({
  items: TRAITS.map((trait) => ({ label: trait.label, value: trait.value })),
});

function MultiSelectDemo() {
  const [picked, setPicked] = useState<string[]>(["collar"]);

  return (
    <>
      <Demo label="여러 개 고르기" note="항목이 6개를 넘으면 BottomSheet 안 체크박스 목록으로 바꿉니다">
        <Select.Root
          multiple
          collection={TRAIT_COLLECTION}
          value={picked}
          onValueChange={(details) => setPicked(details.value)}
          width="100%"
        >
          <Select.HiddenSelect />
          <Select.Label>특징</Select.Label>
          <Select.Control>
            <Select.Trigger>
              <Select.ValueText placeholder="특징 선택" />
            </Select.Trigger>
            <Select.IndicatorGroup>
              <Select.Indicator />
            </Select.IndicatorGroup>
          </Select.Control>
          <Portal>
            <Select.Positioner>
              <Select.Content>
                {TRAIT_COLLECTION.items.map((item) => (
                  <Select.Item key={item.value} item={item}>
                    <Select.ItemText>{item.label}</Select.ItemText>
                    <Select.ItemIndicator />
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Positioner>
          </Portal>
        </Select.Root>
      </Demo>
      <Demo label="고른 값 나열" note="고른 값은 읽기 전용 Chip 으로 아래에 펼칩니다">
        {picked.length === 0 ? (
          <Text textStyle="bodySm" color="fg.assistive">
            아직 고른 특징이 없습니다
          </Text>
        ) : (
          <Flex wrap="wrap" gap="2">
            {picked.map((value) => (
              <Chip key={value} size="small" readOnly>
                {TRAIT_COLLECTION.find(value)?.label ?? value}
              </Chip>
            ))}
          </Flex>
        )}
      </Demo>
    </>
  );
}

function CheckboxDemo() {
  const [agreed, setAgreed] = useState<string[]>([]);
  const allChecked = agreed.length === CONSENTS.length;
  const someChecked = agreed.length > 0 && !allChecked;

  return (
    <>
      <Demo label="size" variant="row">
        <Checkbox.Root size="sm" defaultChecked>
          <Checkbox.HiddenInput />
          <Checkbox.Control />
          <Checkbox.Label>sm</Checkbox.Label>
        </Checkbox.Root>
        <Checkbox.Root size="md" defaultChecked>
          <Checkbox.HiddenInput />
          <Checkbox.Control />
          <Checkbox.Label>md</Checkbox.Label>
        </Checkbox.Root>
        <Checkbox.Root size="lg" defaultChecked>
          <Checkbox.HiddenInput />
          <Checkbox.Control />
          <Checkbox.Label>lg</Checkbox.Label>
        </Checkbox.Root>
      </Demo>
      <Demo label="상태">
        <Checkbox.Root>
          <Checkbox.HiddenInput />
          <Checkbox.Control />
          <Checkbox.Label>선택 안 함</Checkbox.Label>
        </Checkbox.Root>
        <Checkbox.Root checked="indeterminate">
          <Checkbox.HiddenInput />
          <Checkbox.Control />
          <Checkbox.Label>일부 선택</Checkbox.Label>
        </Checkbox.Root>
        <Checkbox.Root disabled defaultChecked>
          <Checkbox.HiddenInput />
          <Checkbox.Control />
          <Checkbox.Label>비활성</Checkbox.Label>
        </Checkbox.Root>
      </Demo>
      <Demo label="전체 동의" note="아래에서 하나만 골라도 위 칸이 일부 선택으로 바뀝니다">
        <Checkbox.Root
          checked={allChecked ? true : someChecked ? "indeterminate" : false}
          onCheckedChange={(details) =>
            setAgreed(details.checked === true ? CONSENTS.map((item) => item.key) : [])
          }
        >
          <Checkbox.HiddenInput />
          <Checkbox.Control />
          <Checkbox.Label>
            <Text textStyle="bodyStrong">약관에 모두 동의합니다</Text>
          </Checkbox.Label>
        </Checkbox.Root>
        <Flex direction="column" gap="3" paddingInlineStart="6">
          {CONSENTS.map((consent) => (
            <Checkbox.Root
              key={consent.key}
              checked={agreed.includes(consent.key)}
              onCheckedChange={(details) =>
                setAgreed((prev) =>
                  details.checked === true
                    ? [...prev, consent.key]
                    : prev.filter((key) => key !== consent.key),
                )
              }
            >
              <Checkbox.HiddenInput />
              <Checkbox.Control />
              <Checkbox.Label>{consent.label}</Checkbox.Label>
            </Checkbox.Root>
          ))}
        </Flex>
      </Demo>
      <Demo label="특징 여러 개 고르기">
        {TRAITS.map((trait) => (
          <CheckboxCard.Root key={trait.value} orientation="vertical" align="start">
            <CheckboxCard.HiddenInput />
            <CheckboxCard.Control>
              <CheckboxCard.Content>
                <CheckboxCard.Label>{trait.label}</CheckboxCard.Label>
                <CheckboxCard.Description>{trait.description}</CheckboxCard.Description>
              </CheckboxCard.Content>
              <CheckboxCard.Indicator />
            </CheckboxCard.Control>
          </CheckboxCard.Root>
        ))}
      </Demo>
      <Demo label="테마 비교" variant="bare">
        <ThemeStage>
          <Checkbox.Root defaultChecked>
            <Checkbox.HiddenInput />
            <Checkbox.Control />
            <Checkbox.Label>선택함</Checkbox.Label>
          </Checkbox.Root>
          <Checkbox.Root>
            <Checkbox.HiddenInput />
            <Checkbox.Control />
            <Checkbox.Label>선택 안 함</Checkbox.Label>
          </Checkbox.Root>
        </ThemeStage>
      </Demo>
      <SpecTable
        rows={[
          ["상자 크기", "sm 16 / md 20 / lg 24"],
          ["라벨 간격", "sm 8 / md 10 / lg 12"],
          ["선택 배경", <Token key="bg">brand.solid</Token>],
          ["체크 색", <Token key="fg">brand.contrast</Token>],
          ["기본 테두리", <Token key="border">border.emphasized</Token>],
          ["indeterminate", "선택과 같은 배경에 가로줄 표시"],
          ["disabled", "투명도 0.5, 포인터 없음"],
        ]}
      />
    </>
  );
}

const CARE_SITUATIONS = [
  { value: "roaming", label: "배회 중", description: "지금도 그 자리나 근처를 돌아다닙니다" },
  { value: "in_care", label: "내가 데리고 있음", description: "제보자가 임시로 보호하는 중입니다" },
];

function RadioDemo() {
  const [size, setSize] = useState("small");
  const [care, setCare] = useState("roaming");

  return (
    <>
      <Demo label="세로 목록">
        <RadioGroup.Root value={size} onValueChange={(details) => setSize(details.value ?? "small")}>
          <Flex direction="column" gap="3">
            <RadioGroup.Item value="small">
              <RadioGroup.ItemHiddenInput />
              <RadioGroup.ItemIndicator />
              <RadioGroup.ItemText>소형</RadioGroup.ItemText>
            </RadioGroup.Item>
            <RadioGroup.Item value="medium">
              <RadioGroup.ItemHiddenInput />
              <RadioGroup.ItemIndicator />
              <RadioGroup.ItemText>중형</RadioGroup.ItemText>
            </RadioGroup.Item>
            <RadioGroup.Item value="large">
              <RadioGroup.ItemHiddenInput />
              <RadioGroup.ItemIndicator />
              <RadioGroup.ItemText>대형</RadioGroup.ItemText>
            </RadioGroup.Item>
          </Flex>
        </RadioGroup.Root>
      </Demo>
      <Demo label="보호 상황" note="제보 1단계 필수 입력이라 설명까지 보이는 카드로 둡니다">
        <RadioCard.Root
          value={care}
          orientation="vertical"
          align="start"
          width="100%"
          onValueChange={(details) => setCare(details.value ?? "roaming")}
        >
          <RadioCard.Label>보호 상황</RadioCard.Label>
          <Flex direction="column" gap="3">
            {CARE_SITUATIONS.map((situation) => (
              <RadioCard.Item key={situation.value} value={situation.value}>
                <RadioCard.ItemHiddenInput />
                <RadioCard.ItemControl>
                  <RadioCard.ItemContent>
                    <RadioCard.ItemText>{situation.label}</RadioCard.ItemText>
                    <RadioCard.ItemDescription>{situation.description}</RadioCard.ItemDescription>
                  </RadioCard.ItemContent>
                  <RadioCard.ItemIndicator />
                </RadioCard.ItemControl>
              </RadioCard.Item>
            ))}
          </Flex>
        </RadioCard.Root>
      </Demo>
    </>
  );
}

function SwitchDemo() {
  const [notify, setNotify] = useState(true);

  return (
    <>
      <Demo label="size" variant="row">
        <Switch.Root size="sm" defaultChecked>
          <Switch.HiddenInput />
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
          <Switch.Label>sm</Switch.Label>
        </Switch.Root>
        <Switch.Root size="md" defaultChecked>
          <Switch.HiddenInput />
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
          <Switch.Label>md</Switch.Label>
        </Switch.Root>
        <Switch.Root size="lg" defaultChecked>
          <Switch.HiddenInput />
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
          <Switch.Label>lg</Switch.Label>
        </Switch.Root>
      </Demo>
      <Demo label="비활성" variant="row">
        <Switch.Root disabled>
          <Switch.HiddenInput />
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
          <Switch.Label>꺼짐</Switch.Label>
        </Switch.Root>
        <Switch.Root disabled defaultChecked>
          <Switch.HiddenInput />
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
          <Switch.Label>켜짐</Switch.Label>
        </Switch.Root>
      </Demo>
      <Demo
        label="설정 행 안"
        variant="screen"
        note="설정 화면에서는 행 오른쪽에 붙이고 행 자체는 누를 수 없게 둡니다"
      >
        <Box width="100%" paddingInline="screen" paddingBlock="block">
          <ListGroup inset>
            <ListItem
              title="알림 받기"
              description="내 제보에 확인할 후보가 생기면 알려 드립니다"
              leading="bell"
              trailing={
                <Switch.Root
                  checked={notify}
                  onCheckedChange={(details) => setNotify(details.checked)}
                >
                  <Switch.HiddenInput />
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                </Switch.Root>
              }
            />
          </ListGroup>
        </Box>
      </Demo>
      <SpecTable
        rows={[
          ["트랙 크기", "sm 32x16 / md 40x20 / lg 48x24"],
          ["썸", "트랙 높이의 0.8배, 흰 바탕에 그림자"],
          ["라벨 간격", <Token key="gap">gap 2.5</Token>],
          ["꺼짐 배경", <Token key="off">bg.emphasized</Token>],
          ["켜짐 배경", <Token key="on">brand.solid</Token>],
          ["모서리", "트랙과 썸 모두 full"],
          ["disabled", "투명도 0.5, 커서 not-allowed"],
        ]}
      />
    </>
  );
}

function ToggleDemo() {
  const [saved, setSaved] = useState(false);

  return (
    <>
      <Demo label="아이콘 전환" variant="row">
        <Toggle.Root asChild>
          <IconButton aria-label="관심 표시" variant="ghost" borderRadius="full">
            <Toggle.Indicator fallback={<Icon name="heart" size={20} />}>
              <Icon name="heartFilled" size={20} />
            </Toggle.Indicator>
          </IconButton>
        </Toggle.Root>
        <Toggle.Root asChild pressed={saved} onPressedChange={setSaved}>
          <IconButton aria-label="저장" variant="ghost" borderRadius="full">
            <Icon name="bookmark" size={20} />
          </IconButton>
        </Toggle.Root>
      </Demo>
      <Demo label="행 안에서" note="눌린 상태가 색으로만 남으므로 라벨을 함께 둡니다">
        <Flex align="center" justify="space-between" gap="3" width="100%">
          <Text textStyle="body">이 제보 저장</Text>
          <Toggle.Root asChild pressed={saved} onPressedChange={setSaved}>
            <Button variant={saved ? "solid" : "outline"} size="sm">
              {saved ? "저장함" : "저장"}
            </Button>
          </Toggle.Root>
        </Flex>
      </Demo>
    </>
  );
}

const SPECIES_OPTIONS = [
  { value: "dog", label: "개" },
  { value: "cat", label: "고양이" },
  { value: "etc", label: "그 외" },
];

const PERIOD_OPTIONS = [
  { value: "today", label: "오늘" },
  { value: "week", label: "이번 주" },
  { value: "month", label: "이번 달" },
  { value: "all", label: "전체" },
];

function SegmentedDemo() {
  const [species, setSpecies] = useState("dog");
  const [period, setPeriod] = useState("week");

  return (
    <>
      <Demo label="세 개">
        <Segmented
          value={species}
          options={SPECIES_OPTIONS}
          onValueChange={setSpecies}
          aria-label="동물 종류"
        />
      </Demo>
      <Demo label="네 개" note="선택지가 넷을 넘으면 Chip 목록이나 Select 로 바꿉니다">
        <Segmented
          value={period}
          options={PERIOD_OPTIONS}
          onValueChange={setPeriod}
          aria-label="기간"
        />
      </Demo>
    </>
  );
}

const DISTANCE_MARKS = [
  { value: 100, label: "100m" },
  { value: 1000, label: "1km" },
  { value: 2000, label: "2km" },
];

function formatMeters(meters: number) {
  return meters < 1000 ? `${meters}m` : `${(meters / 1000).toFixed(1)}km`;
}

function SliderDemo() {
  const [weight, setWeight] = useState([6]);
  const [distance, setDistance] = useState([300, 1200]);

  return (
    <>
      <Demo label="값 하나">
        <Flex justify="space-between" width="100%">
          <Text textStyle="label">몸무게 추정</Text>
          <Text textStyle="label" color="fg.alternative">
            {weight[0]}kg
          </Text>
        </Flex>
        <Slider.Root
          min={1}
          max={40}
          step={1}
          value={weight}
          width="100%"
          onValueChange={(details) => setWeight(details.value)}
        >
          <Slider.Control>
            <Slider.Track>
              <Slider.Range />
            </Slider.Track>
            <Slider.Thumbs />
          </Slider.Control>
        </Slider.Root>
      </Demo>
      <Demo label="값 두 개와 눈금" note="지도에서 훑어볼 거리 범위를 정합니다">
        <Flex justify="space-between" width="100%">
          <Text textStyle="label">거리 범위</Text>
          <Text textStyle="label" color="fg.alternative">
            {formatMeters(distance[0])} ~ {formatMeters(distance[1])}
          </Text>
        </Flex>
        <Slider.Root
          min={100}
          max={2000}
          step={100}
          minStepsBetweenThumbs={1}
          value={distance}
          width="100%"
          paddingBottom="6"
          onValueChange={(details) => setDistance(details.value)}
        >
          <Slider.Control>
            <Slider.Track>
              <Slider.Range />
            </Slider.Track>
            <Slider.Thumbs />
            <Slider.Marks marks={DISTANCE_MARKS} />
          </Slider.Control>
        </Slider.Root>
      </Demo>
      <Demo label="비활성">
        <Slider.Root disabled defaultValue={[8]} min={1} max={40} width="100%">
          <Slider.Control>
            <Slider.Track>
              <Slider.Range />
            </Slider.Track>
            <Slider.Thumbs />
          </Slider.Control>
        </Slider.Root>
      </Demo>
    </>
  );
}

function RatingDemo() {
  return (
    <>
      <Demo label="입력">
        <RatingGroup.Root count={5} defaultValue={4}>
          <RatingGroup.HiddenInput />
          <RatingGroup.Control />
        </RatingGroup.Root>
      </Demo>
      <Demo label="size lg 와 반 칸">
        <RatingGroup.Root count={5} defaultValue={3.5} allowHalf size="lg">
          <RatingGroup.HiddenInput />
          <RatingGroup.Control />
        </RatingGroup.Root>
      </Demo>
      <Demo label="읽기 전용" note="보호소 후기 자리이며 제보 화면에서는 쓰지 않습니다">
        <RatingGroup.Root count={5} defaultValue={4} readOnly>
          <RatingGroup.HiddenInput />
          <RatingGroup.Control />
        </RatingGroup.Root>
      </Demo>
    </>
  );
}

const COAT_PRESETS = [
  { label: "흰색", value: COAT_COLORS.white },
  { label: "갈색", value: COAT_COLORS.brown },
  { label: "검정", value: COAT_COLORS.black },
  { label: "회색", value: COAT_COLORS.gray },
  { label: "노란색", value: COAT_COLORS.yellow },
  { label: "삼색", value: COAT_COLORS.calico },
];

function ColorPickerDemo() {
  const [coat, setCoat] = useState(() => parseColor(COAT_PRESETS[0].value));

  return (
    <>
      <Demo label="프리셋 스와치" note="털색은 몇 가지면 충분하므로 이 형태를 모바일 기본으로 둡니다">
        <ColorPicker.Root
          value={coat}
          width="100%"
          onValueChange={(details) => setCoat(details.value)}
        >
          <ColorPicker.HiddenInput />
          <ColorPicker.Label>털색</ColorPicker.Label>
          <ColorPicker.SwatchGroup>
            {COAT_PRESETS.map((preset) => (
              <ColorPicker.SwatchTrigger
                key={preset.value}
                value={preset.value}
                aria-label={preset.label}
              >
                <ColorPicker.Swatch value={preset.value} boxSize="9">
                  <ColorPicker.SwatchIndicator>
                    <Icon name="check" size={14} />
                  </ColorPicker.SwatchIndicator>
                </ColorPicker.Swatch>
              </ColorPicker.SwatchTrigger>
            ))}
          </ColorPicker.SwatchGroup>
        </ColorPicker.Root>
        <Text textStyle="caption" color="fg.assistive">
          고른 값 {coat.toString("hex")}
        </Text>
      </Demo>
      <Demo label="전체 선택기" note="자유 색이 필요할 때만 열고 결과는 hex 로 저장합니다">
        <ColorPicker.Root defaultValue={parseColor(COAT_COLORS.brown)} width="100%">
          <ColorPicker.HiddenInput />
          <ColorPicker.Label>색 고르기</ColorPicker.Label>
          <ColorPicker.Control>
            <ColorPicker.Input />
            <ColorPicker.Trigger>
              <ColorPicker.ValueSwatch />
            </ColorPicker.Trigger>
          </ColorPicker.Control>
          <Portal>
            <ColorPicker.Positioner>
              <ColorPicker.Content>
                <ColorPicker.Area />
                <Flex align="center" gap="2">
                  <ColorPicker.EyeDropper size="xs" variant="outline" />
                  <ColorPicker.Sliders />
                </Flex>
                <ColorPicker.ValueText />
              </ColorPicker.Content>
            </ColorPicker.Positioner>
          </Portal>
        </ColorPicker.Root>
      </Demo>
    </>
  );
}

function nowLocalValue() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  const day = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  return `${day}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function DateTimeDemo() {
  const [seenAt, setSeenAt] = useState("");

  return (
    <>
      <Demo
        label="네이티브 입력"
        note="OS 피커를 그대로 쓰면 자판 없이 고를 수 있고 지역 형식도 알아서 맞습니다"
      >
        <Field label="발견 날짜">
          <Input type="date" />
        </Field>
        <Field label="발견 시각">
          <Input type="time" />
        </Field>
      </Demo>
      <Demo label="빠른 채움" note="지금 버튼은 yyyy-MM-ddTHH:mm 형식으로 값을 채웁니다">
        <Field label="발견 시각" helper="기억나는 만큼만 적어도 됩니다">
          <Input
            type="datetime-local"
            value={seenAt}
            onChange={(event) => setSeenAt(event.target.value)}
          />
        </Field>
        <Button
          variant="outline"
          size="sm"
          alignSelf="start"
          onClick={() => setSeenAt(nowLocalValue())}
        >
          지금
        </Button>
      </Demo>
      <Usage code={`<Input type="datetime-local" value={seenAt} />`} />
    </>
  );
}

function CalendarDemo() {
  return (
    <Demo
      label="범위 선택 달력"
      note="단일 날짜는 input type date 가 기본이고 달력은 범위 선택에만 씁니다"
    >
      <Box width="100%" overflowX="auto">
        <DatePicker.Root open inline locale="ko-KR" selectionMode="range">
          <DatePicker.Content>
            <DatePicker.View view="day">
              <DatePicker.ViewControl>
                <DatePicker.PrevTrigger />
                <DatePicker.ViewTrigger>
                  <DatePicker.RangeText />
                </DatePicker.ViewTrigger>
                <DatePicker.NextTrigger />
              </DatePicker.ViewControl>
              <DatePicker.DayTable />
            </DatePicker.View>
          </DatePicker.Content>
        </DatePicker.Root>
      </Box>
    </Demo>
  );
}

function FileUploadDemo() {
  const picker = usePhotoPicker({ maxCount: 1 });

  return (
    <>
      <Demo label="PhotoPicker" note="캔버스 재인코딩으로 위치 정보를 지운 뒤 미리보기를 만듭니다">
        <Box width="100%">
          <PhotoPicker picker={picker} label="발견 사진" />
        </Box>
      </Demo>
      <Demo
        label="Chakra FileUpload"
        note="capture 를 environment 로 두면 후면 카메라가 바로 열립니다"
      >
        <FileUpload.Root accept="image/*" maxFiles={3} capture="environment" width="100%">
          <FileUpload.HiddenInput />
          <FileUpload.Dropzone>
            <FileUpload.DropzoneContent>
              <Icon name="upload" size={20} />
              <Text textStyle="bodySm">사진을 올려 주세요</Text>
              <Text textStyle="caption" color="fg.assistive">
                최대 3장
              </Text>
            </FileUpload.DropzoneContent>
          </FileUpload.Dropzone>
          <FileUpload.List clearable showSize />
        </FileUpload.Root>
      </Demo>
      <Demo label="썸네일 줄">
        <Flex gap="2" width="100%">
          {[0, 1, 2].map((index) => (
            <Box key={index} position="relative" flex="1" minWidth="0">
              <AspectRatio ratio={1}>
                <Box
                  borderRadius="control"
                  borderWidth="1px"
                  borderColor="border.muted"
                  backgroundColor="bg.alternative"
                  color="fg.assistive"
                >
                  <Icon name="image" size={20} />
                </Box>
              </AspectRatio>
              <Float placement="top-end" offset="1.5">
                <IconButton
                  aria-label={`사진 ${index + 1} 삭제`}
                  size="2xs"
                  variant="solid"
                  colorPalette="gray"
                  borderRadius="full"
                >
                  <Icon name="close" size={12} />
                </IconButton>
              </Float>
            </Box>
          ))}
        </Flex>
      </Demo>
    </>
  );
}

type Attachment = {
  id: string;
  name: string;
  size: string;
  state: "done" | "uploading" | "error";
  progress?: number;
};

const ATTACHMENTS: Attachment[] = [
  { id: "a", name: "발견동물-연남동-골목-01.jpg", size: "1.8MB", state: "done" },
  { id: "b", name: "발견동물-연남동-정면-02.jpg", size: "2.4MB", state: "uploading", progress: 62 },
  { id: "c", name: "발견동물-연남동-야간-03.heic", size: "3.1MB", state: "error" },
];

// CSS 로는 문자열 가운데를 줄일 수 없어 앞뒤를 남기고 직접 자름
function truncateMiddle(name: string) {
  if (name.length <= 22) return name;
  return `${name.slice(0, 12)}…${name.slice(-8)}`;
}

function AttachmentRow({ item }: { item: Attachment }) {
  const failed = item.state === "error";

  return (
    <Flex align="center" gap="3" width="100%">
      <Flex
        flexShrink={0}
        boxSize="10"
        align="center"
        justify="center"
        borderRadius="control"
        borderWidth="1px"
        borderColor="border.muted"
        backgroundColor="bg.alternative"
        color="fg.assistive"
      >
        <Icon name="image" size={18} />
      </Flex>
      <Box flex="1" minWidth="0">
        <Text textStyle="bodySm" color={failed ? "fg.error" : "fg.default"} truncate>
          {truncateMiddle(item.name)}
        </Text>
        {item.state === "uploading" ? (
          <Progress.Root value={item.progress ?? 0} size="xs" shape="full" marginTop="1.5">
            <Progress.Track>
              <Progress.Range />
            </Progress.Track>
          </Progress.Root>
        ) : (
          <Text textStyle="caption" color={failed ? "fg.error" : "fg.assistive"}>
            {failed ? "올리지 못했습니다" : item.size}
          </Text>
        )}
      </Box>
      {failed ? (
        <Button variant="outline" size="xs" flexShrink={0}>
          다시 시도
        </Button>
      ) : null}
      <IconButton
        aria-label={`${item.name} 삭제`}
        size="xs"
        variant="ghost"
        colorPalette="gray"
        flexShrink={0}
      >
        <Icon name="close" size={16} />
      </IconButton>
    </Flex>
  );
}

function AttachmentListDemo() {
  return (
    <>
      <Demo label="올린 파일 목록" note="파일명은 앞 12자와 뒤 8자만 남기고 가운데를 줄입니다">
        {ATTACHMENTS.map((item) => (
          <AttachmentRow key={item.id} item={item} />
        ))}
      </Demo>
      <Demo label="상태별 차이" variant="bare">
        <TokenRow name="올리는 중" value="Progress xs" />
        <TokenRow name="완료" value="용량 caption" />
        <TokenRow name="실패" value="fg.error + 다시 시도" />
      </Demo>
    </>
  );
}

function AvatarUploaderDemo() {
  const inputRef = useRef<PhotoPickerInputHandle>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  return (
    <Demo label="프로필 사진" note="미리보기까지만 만들고 서버로 올리지는 않습니다">
      <Flex direction="column" align="center" gap="3" width="100%">
        <Box position="relative">
          <Avatar.Root size="2xl">
            <Avatar.Fallback name="다시집" />
            {preview ? <Avatar.Image src={preview} alt="프로필 미리보기" /> : null}
          </Avatar.Root>
          <Float placement="bottom-end" offset="1.5">
            <IconButton
              aria-label="사진 바꾸기"
              size="xs"
              borderRadius="full"
              onClick={() => inputRef.current?.open()}
            >
              <Icon name="camera" size={14} />
            </IconButton>
          </Float>
        </Box>
        {preview ? (
          <Button variant="outline" size="sm" onClick={() => setPreview(null)}>
            사진 지우기
          </Button>
        ) : (
          <Text textStyle="caption" color="fg.assistive">
            사진이 없으면 이름 첫 글자를 보여 줍니다
          </Text>
        )}
      </Flex>
      <PhotoPickerInput
        ref={inputRef}
        mode="library"
        onFiles={(files) => {
          const [file] = files;
          if (file) setPreview(URL.createObjectURL(file));
        }}
      />
    </Demo>
  );
}

function EditableDemo() {
  return (
    <Demo label="외형 요약" note="AI 초안이므로 제보자가 그 자리에서 고칩니다">
      <Flex align="center" gap="1">
        <Text textStyle="label" color="fg.alternative">
          외형 요약
        </Text>
        <Chip size="xsmall" readOnly>
          AI 초안, 수정 가능
        </Chip>
      </Flex>
      <Editable.Root defaultValue={AI_DRAFT} width="100%">
        <Editable.Preview minHeight="touch" width="100%" />
        <Editable.Input />
        <Editable.Control>
          <Editable.EditTrigger asChild>
            <IconButton aria-label="수정" variant="ghost" size="xs">
              <Icon name="edit" size={16} />
            </IconButton>
          </Editable.EditTrigger>
          <Editable.CancelTrigger asChild>
            <IconButton aria-label="되돌리기" variant="outline" size="xs">
              <Icon name="close" size={16} />
            </IconButton>
          </Editable.CancelTrigger>
          <Editable.SubmitTrigger asChild>
            <IconButton aria-label="저장" variant="outline" size="xs">
              <Icon name="check" size={16} />
            </IconButton>
          </Editable.SubmitTrigger>
        </Editable.Control>
      </Editable.Root>
    </Demo>
  );
}

function FieldsetDemo() {
  const [invalid, setInvalid] = useState(false);

  return (
    <>
      <Demo label="세 칸 묶기">
        <Fieldset.Root invalid={invalid} width="100%">
          <Fieldset.Legend>제보자 연락처</Fieldset.Legend>
          <Fieldset.HelperText>확인 연락이 필요할 때만 사용합니다</Fieldset.HelperText>
          <Fieldset.Content>
            <Field label="이름">
              <Input placeholder="홍길동" />
            </Field>
            <Field label="연락처">
              <Input type="tel" inputMode="numeric" placeholder="010-0000-0000" />
            </Field>
            <Field label="이메일">
              <Input type="email" inputMode="email" placeholder="name@example.com" />
            </Field>
          </Fieldset.Content>
          <Fieldset.ErrorText>연락처 형식을 확인해 주세요</Fieldset.ErrorText>
        </Fieldset.Root>
        <Button
          variant="outline"
          size="sm"
          alignSelf="start"
          onClick={() => setInvalid((prev) => !prev)}
        >
          {invalid ? "오류 끄기" : "오류 켜기"}
        </Button>
      </Demo>
      <Usage
        code={`<Fieldset.Root invalid>
  <Fieldset.Legend />
  <Fieldset.Content />
  <Fieldset.ErrorText />
</Fieldset.Root>`}
      />
    </>
  );
}

export function FormsCatalog() {
  return (
    <>
      <Spec
        id="field"
        title="Field"
        description="입력 한 칸의 라벨과 도움말과 오류를 묶습니다. 오류가 들어오면 도움말 자리를 오류가 대신합니다."
      >
        <FieldDemo />
      </Spec>

      <Spec
        id="input"
        title="Input"
        description="한 줄 입력입니다. 기본 크기가 lg 라서 따로 적지 않아도 손가락 기준을 넘깁니다."
      >
        <InputDemo />
      </Spec>

      <Spec
        id="textarea"
        title="Textarea"
        description="여러 줄 입력입니다. 길이 제한이 있으면 글자 수를 오른쪽 아래에 붙입니다."
      >
        <TextareaDemo />
      </Spec>

      <Spec
        id="number-input"
        title="Number Input"
        description="수를 올리고 내립니다. 모바일에서는 화살표 대신 큰 버튼 스테퍼를 권장합니다."
      >
        <NumberInputDemo />
      </Spec>

      <Spec
        id="pin-input"
        title="PIN Input"
        description="자리 수가 정해진 입력입니다. otp 를 켜면 문자 인증번호 자동 채움을 받습니다."
      >
        <PinInputDemo />
      </Spec>

      <Spec
        id="search-bar"
        title="Search Bar"
        description="검색 입력 한 줄입니다. 값이 있으면 지우기 버튼이 나오고 취소는 넘긴 곳에만 붙습니다."
      >
        <SearchBarDemo />
      </Spec>

      <Spec
        id="password-input"
        title="Password Input"
        description="비밀번호 입력입니다. 보기 전환 버튼과 세기 표시를 함께 둡니다."
      >
        <PasswordInputDemo />
      </Spec>

      <Spec
        id="tags-input"
        title="Tags Input"
        description="여러 값을 태그로 쌓습니다. 털색처럼 목록을 미리 정하기 어려운 값에 씁니다."
      >
        <TagsInputDemo />
      </Spec>

      <Spec
        id="select"
        title="Select"
        description="목록에서 하나를 고릅니다. 모바일 기본은 네이티브 선택기이고 목록이 길면 BottomSheet 를 씁니다."
      >
        <SelectDemo />
      </Spec>

      <Spec
        id="combobox"
        title="Combobox"
        description="입력하면서 목록을 좁힙니다. 실제 장소 검색은 PlaceSearchField 가 맡습니다."
      >
        <ComboboxDemo />
      </Spec>

      <Spec
        id="multi-select"
        title="Multi Select"
        description="목록에서 여러 개를 고릅니다. 고른 값은 트리거 아래에 읽기 전용 Chip 으로 펼칩니다."
      >
        <MultiSelectDemo />
      </Spec>

      <Spec
        id="checkbox"
        title="Checkbox"
        description="여러 개를 고릅니다. 설명이 필요한 선택지는 CheckboxCard 로 크게 둡니다."
      >
        <CheckboxDemo />
      </Spec>

      <Spec
        id="radio"
        title="Radio"
        description="하나만 고릅니다. 값이 화면 흐름을 바꾸는 선택은 RadioCard 로 설명까지 보여 줍니다."
      >
        <RadioDemo />
      </Spec>

      <Spec
        id="switch"
        title="Switch"
        description="켜고 끕니다. 누르는 즉시 반영되므로 저장 버튼이 필요한 값에는 쓰지 않습니다."
      >
        <SwitchDemo />
      </Spec>

      <Spec
        id="toggle"
        title="Toggle"
        description="눌린 상태를 유지하는 버튼입니다. 관심 표시나 저장처럼 되돌릴 수 있는 행동에 씁니다."
      >
        <ToggleDemo />
      </Spec>

      <Spec
        id="segmented"
        title="Segmented"
        description="값이 항상 있어야 하는 단일 선택입니다. 선택지는 넷까지만 둡니다."
      >
        <SegmentedDemo />
      </Spec>

      <Spec
        id="slider"
        title="Slider"
        description="범위 안에서 값을 고릅니다. 정확한 값이 필요하면 숫자 입력을 함께 둡니다."
      >
        <SliderDemo />
      </Spec>

      <Spec
        id="rating"
        title="Rating"
        description="별점입니다. 반 칸과 읽기 전용을 지원합니다."
      >
        <RatingDemo />
      </Spec>

      <Spec
        id="color-picker"
        title="Color Picker"
        description="색을 고릅니다. 털색처럼 값이 정해진 곳은 프리셋 스와치를 기본으로 씁니다."
      >
        <ColorPickerDemo />
      </Spec>

      <Spec
        id="date-time"
        title="Date & Time"
        description="날짜와 시각은 네이티브 입력을 씁니다. 자주 쓰는 값은 빠른 채움 버튼으로 줄입니다."
      >
        <DateTimeDemo />
      </Spec>

      <Spec
        id="calendar"
        title="Calendar"
        description="달을 펼쳐 놓고 날짜를 고릅니다. 요일과 달 이름은 locale 값을 따릅니다."
      >
        <CalendarDemo />
      </Spec>

      <Spec
        id="file-upload"
        title="File Upload"
        description="사진을 올립니다. 제보 화면에서는 위치 정보를 지우는 PhotoPicker 를 씁니다."
      >
        <FileUploadDemo />
      </Spec>

      <Spec
        id="attachment-list"
        title="Attachment List"
        description="올린 파일을 행으로 나열합니다. 올리는 중과 실패를 같은 자리에서 구분합니다."
      >
        <AttachmentListDemo />
      </Spec>

      <Spec
        id="avatar-uploader"
        title="Avatar Uploader"
        description="원형 사진 한 장을 바꿉니다. 비어 있으면 이름 첫 글자를 대신 보여 줍니다."
      >
        <AvatarUploaderDemo />
      </Spec>

      <Spec
        id="editable"
        title="Editable"
        description="보여 주던 값을 그 자리에서 고칩니다. AI 초안처럼 대부분 그대로 두는 값에 맞습니다."
      >
        <EditableDemo />
      </Spec>

      <Spec
        id="fieldset"
        title="Fieldset"
        description="관련 있는 입력 칸을 묶습니다. 묶음 단위 오류는 Fieldset 아래에 한 번만 적습니다."
      >
        <FieldsetDemo />
      </Spec>
    </>
  );
}
