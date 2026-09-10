"use client";

import { useState } from "react";
import {
  Badge,
  Divider,
  HStack,
  Icon,
  ImageFrame,
  PrefixIcon,
  Skeleton,
  Text,
  VStack,
} from "@seed-design/react";
import { actionButtonVariantMap } from "@seed-design/css/recipes/action-button";
import { badgeVariantMap } from "@seed-design/css/recipes/badge";
import { chipVariantMap } from "@seed-design/css/recipes/chip";
import { contentPlaceholderVariantMap } from "@seed-design/css/recipes/content-placeholder";
import { tagGroupItemVariantMap } from "@seed-design/css/recipes/tag-group-item";
import {
  IconCameraFill,
  IconHeartFill,
  IconLocationpinFill,
  IconPawprintFill,
  IconPlusFill,
} from "@karrotmarket/react-monochrome-icon";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "seed-design/ui/accordion";
import { ActionButton } from "seed-design/ui/action-button";
import { AttachmentField, AttachmentInput } from "seed-design/ui/attachment-field";
import { Avatar } from "seed-design/ui/avatar";
import { Checkbox, CheckboxGroup } from "seed-design/ui/checkbox";
import { Chip } from "seed-design/ui/chip";
import { ContentPlaceholder } from "seed-design/ui/content-placeholder";
import { ContextualFloatingButton } from "seed-design/ui/contextual-floating-button";
import { FieldButton, FieldButtonPlaceholder } from "seed-design/ui/field-button";
import { FloatingActionButton } from "seed-design/ui/floating-action-button";
import { IdentityPlaceholder } from "seed-design/ui/identity-placeholder";
import { List, ListItem, ListLinkItem, ListSwitchItem } from "seed-design/ui/list";
import { MannerTemp } from "seed-design/ui/manner-temp";
import { MannerTempBadge } from "seed-design/ui/manner-temp-badge";
import { ProgressCircle } from "seed-design/ui/progress-circle";
import { QuantityPicker } from "seed-design/ui/quantity-picker";
import { RadioGroup, RadioGroupItem } from "seed-design/ui/radio-group";
import { ReactionButton } from "seed-design/ui/reaction-button";
import { SegmentedControl, SegmentedControlItem } from "seed-design/ui/segmented-control";
import { SelectContent, SelectItem, SelectRoot, SelectTrigger } from "seed-design/ui/select";
import { RadioSelectBoxItem, RadioSelectBoxRoot } from "seed-design/ui/select-box";
import { Slider } from "seed-design/ui/slider";
import { Switch } from "seed-design/ui/switch";
import { TagGroupItem, TagGroupRoot } from "seed-design/ui/tag-group";
import { TextField, TextFieldInput, TextFieldTextarea } from "seed-design/ui/text-field";
import { ToggleButton } from "seed-design/ui/toggle-button";

import { CATALOG } from "./registry";
import { Row, Spec, Stage } from "./spec";

// 액션 입력 표시 절, 변형 목록은 SEED 레시피의 variantMap 을 그대로 순회

const SECTIONS = Object.fromEntries(
  CATALOG.flatMap((group) => group.sections).map((section) => [section.id, section]),
);

const SAMPLE_IMAGE =
  "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20width%3D%27160%27%20height%3D%27120%27%3E%3Crect%20width%3D%27160%27%20height%3D%27120%27%20fill%3D%27%23d9d9d9%27%2F%3E%3C%2Fsvg%3E";

export function CatalogComponents() {
  const [segment, setSegment] = useState("dog");
  const [chips, setChips] = useState<string[]>(["흰색"]);
  const [radio, setRadio] = useState("roaming");
  const [switched, setSwitched] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [slider, setSlider] = useState([40]);
  const [toggled, setToggled] = useState(false);
  const [reacted, setReacted] = useState(false);
  const [selectBox, setSelectBox] = useState("first");

  return (
    <>
      <Spec section={SECTIONS["action-button"]}>
        {actionButtonVariantMap.variant.map((variant) => (
          <Row key={variant} label={variant}>
            {actionButtonVariantMap.size.map((size) => (
              <ActionButton key={size} variant={variant} size={size}>
                {size}
              </ActionButton>
            ))}
          </Row>
        ))}
        <Row label="상태">
          <ActionButton variant="brandSolid" loading>
            불러오는 중
          </ActionButton>
          <ActionButton variant="brandSolid" disabled>
            비활성
          </ActionButton>
          <ActionButton variant="brandSolid" layout="iconOnly" aria-label="추가">
            <Icon svg={<IconPlusFill />} />
          </ActionButton>
          <ActionButton variant="neutralOutline">
            <PrefixIcon svg={<IconCameraFill />} />
            아이콘과 글자
          </ActionButton>
        </Row>
      </Spec>

      <Spec section={SECTIONS["floating-action-button"]}>
        <Stage>
          <HStack gap="x3">
            <FloatingActionButton icon={<IconPlusFill />} label="제보하기" />
            <FloatingActionButton icon={<IconPawprintFill />} label="후보 보기" />
          </HStack>
        </Stage>
      </Spec>

      <Spec section={SECTIONS["contextual-floating-button"]}>
        <Stage>
          <ContextualFloatingButton>
            <PrefixIcon svg={<IconLocationpinFill />} />이 근처 다시 검색
          </ContextualFloatingButton>
        </Stage>
      </Spec>

      <Spec section={SECTIONS["toggle-button"]}>
        <Row>
          <ToggleButton pressed={toggled} onPressedChange={setToggled}>
            관심
          </ToggleButton>
        </Row>
      </Spec>

      <Spec section={SECTIONS["reaction-button"]}>
        <Row>
          <ReactionButton pressed={reacted} onPressedChange={setReacted}>
            <PrefixIcon svg={<IconHeartFill />} />
            12
          </ReactionButton>
        </Row>
      </Spec>

      <Spec section={SECTIONS["quantity-picker"]}>
        <Row>
          <QuantityPicker
            value={quantity}
            onValueChange={setQuantity}
            min={1}
            max={9}
            aria-label="수량"
          />
        </Row>
      </Spec>

      <Spec section={SECTIONS["text-field"]}>
        <VStack align="stretch" gap="x4">
          <TextField label="한 줄 입력" description="설명 자리">
            <TextFieldInput placeholder="흰색 소형견" />
          </TextField>
          <TextField label="여러 줄 입력" maxGraphemeCount={100}>
            <TextFieldTextarea placeholder="털이 길고 엉킴" />
          </TextField>
          <TextField label="오류" invalid errorMessage="필수 입력입니다">
            <TextFieldInput placeholder="비어 있음" />
          </TextField>
        </VStack>
      </Spec>

      <Spec section={SECTIONS["segmented-control"]}>
        <SegmentedControl value={segment} onValueChange={setSegment} aria-label="동물 종류">
          <SegmentedControlItem value="dog">개</SegmentedControlItem>
          <SegmentedControlItem value="cat">고양이</SegmentedControlItem>
          <SegmentedControlItem value="other">그 외</SegmentedControlItem>
        </SegmentedControl>
      </Spec>

      <Spec section={SECTIONS.chip}>
        {chipVariantMap.size.map((size) => (
          <Row key={size} label={size}>
            {["흰색", "검정색", "갈색"].map((color) => (
              <Chip.Toggle
                key={color}
                size={size}
                checked={chips.includes(color)}
                onCheckedChange={() =>
                  setChips((prev) =>
                    prev.includes(color) ? prev.filter((c) => c !== color) : [...prev, color],
                  )
                }
              >
                <Chip.Label>{color}</Chip.Label>
              </Chip.Toggle>
            ))}
            <Chip.Button size={size}>
              <Chip.Label>누르는 칩</Chip.Label>
            </Chip.Button>
          </Row>
        ))}
      </Spec>

      <Spec section={SECTIONS.checkbox}>
        <CheckboxGroup>
          <VStack align="stretch" gap="x2">
            <Checkbox defaultChecked>필수 약관에 동의합니다</Checkbox>
            <Checkbox>선택 약관에 동의합니다</Checkbox>
            <Checkbox disabled>비활성</Checkbox>
          </VStack>
        </CheckboxGroup>
      </Spec>

      <Spec section={SECTIONS["radio-group"]}>
        <RadioGroup value={radio} onValueChange={setRadio} aria-label="보호 상황">
          <VStack align="stretch" gap="x2">
            <RadioGroupItem value="roaming">배회 중</RadioGroupItem>
            <RadioGroupItem value="in_care">내가 데리고 있음</RadioGroupItem>
          </VStack>
        </RadioGroup>
      </Spec>

      <Spec section={SECTIONS.switch}>
        <Row>
          <Switch checked={switched} onCheckedChange={setSwitched}>
            거리 계산에 사용
          </Switch>
        </Row>
      </Spec>

      <Spec section={SECTIONS.select}>
        <SelectRoot label="동물 종류" defaultValue={["dog"]}>
          <SelectTrigger />
          <SelectContent>
            <SelectItem value="dog" label="개" />
            <SelectItem value="cat" label="고양이" />
            <SelectItem value="other" label="그 외" />
          </SelectContent>
        </SelectRoot>
      </Spec>

      <Spec section={SECTIONS["select-box"]}>
        <RadioSelectBoxRoot value={selectBox} onValueChange={setSelectBox} aria-label="선택 상자">
          <VStack align="stretch" gap="x2">
            <RadioSelectBoxItem value="first" label="첫 번째" description="설명 자리" />
            <RadioSelectBoxItem value="second" label="두 번째" description="설명 자리" />
          </VStack>
        </RadioSelectBoxRoot>
      </Spec>

      <Spec section={SECTIONS.slider}>
        <Slider values={slider} onValuesChange={setSlider} min={0} max={100} aria-label="반경" />
      </Spec>

      <Spec section={SECTIONS["field-button"]}>
        <FieldButton label="목격 지역">
          <FieldButtonPlaceholder>지역을 골라 주십시오</FieldButtonPlaceholder>
        </FieldButton>
      </Spec>

      <Spec section={SECTIONS["attachment-field"]}>
        <AttachmentField label="사진" accept="image/*" maxFiles={3}>
          <AttachmentInput />
        </AttachmentField>
      </Spec>

      <Spec section={SECTIONS.badge}>
        {badgeVariantMap.variant.map((variant) => (
          <Row key={variant} label={variant}>
            {badgeVariantMap.tone.map((tone) => (
              <Badge key={tone} variant={variant} tone={tone}>
                {tone}
              </Badge>
            ))}
          </Row>
        ))}
      </Spec>

      <Spec section={SECTIONS["tag-group"]}>
        {tagGroupItemVariantMap.tone.map((tone) => (
          <Row key={tone} label={tone}>
            <TagGroupRoot>
              {tagGroupItemVariantMap.size.map((size) => (
                <TagGroupItem key={size} size={size} tone={tone} label={size} />
              ))}
            </TagGroupRoot>
          </Row>
        ))}
      </Spec>

      <Spec section={SECTIONS.avatar}>
        <Row>
          <Avatar size="24" src={SAMPLE_IMAGE} alt="예시" />
          <Avatar size="48" src={SAMPLE_IMAGE} alt="예시" />
          <Avatar size="80" src={SAMPLE_IMAGE} alt="예시" />
        </Row>
      </Spec>

      <Spec section={SECTIONS["image-frame"]}>
        <Row>
          <ImageFrame src={SAMPLE_IMAGE} alt="예시" ratio={4 / 3} width="200px" borderRadius="r3" />
          <ImageFrame src={SAMPLE_IMAGE} alt="예시" ratio={1} width="120px" borderRadius="full" />
        </Row>
      </Spec>

      <Spec section={SECTIONS["content-placeholder"]}>
        <Row>
          {contentPlaceholderVariantMap.type.map((type) => (
            <VStack key={type} align="stretch" gap="x1" width="96px">
              <ContentPlaceholder type={type} style={{ width: 96, height: 96 }} />
              <Text textStyle="t1Regular" color="fg.neutralSubtle">
                {type}
              </Text>
            </VStack>
          ))}
        </Row>
      </Spec>

      <Spec section={SECTIONS["identity-placeholder"]}>
        <Row>
          <IdentityPlaceholder style={{ width: 96, height: 96 }} />
        </Row>
      </Spec>

      <Spec section={SECTIONS.skeleton}>
        <VStack align="stretch" gap="x2">
          <Skeleton width="60%" height="x6" radius="8" />
          <Skeleton width="full" height="x12" radius="16" />
        </VStack>
      </Spec>

      <Spec section={SECTIONS["progress-circle"]}>
        <Row>
          <ProgressCircle size="24" />
          <ProgressCircle size="40" value={60} />
        </Row>
      </Spec>

      <Spec section={SECTIONS["manner-temp"]}>
        <Row>
          <MannerTemp temperature={36.5} />
          <MannerTempBadge temperature={42.1} />
        </Row>
      </Spec>

      <Spec section={SECTIONS.list}>
        <List>
          <ListItem title="목격 지역" detail="서울특별시 관악구 신림동" />
          <ListLinkItem href="#list" title="제보 상세 보기" />
          <ListSwitchItem title="알림 받기" defaultChecked />
        </List>
      </Spec>

      <Spec section={SECTIONS.accordion}>
        <Accordion>
          <AccordionItem value="first">
            <AccordionTrigger title="사진은 어디에 저장됩니까" />
            <AccordionContent>
              비공개 버킷에 저장하고 서명 주소로만 잠시 노출합니다
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="second">
            <AccordionTrigger title="정확한 좌표가 공개됩니까" />
            <AccordionContent>
              공개 응답에는 행정동까지만 담기고 좌표는 담기지 않습니다
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Spec>

      <Divider />
    </>
  );
}
