import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button, Flex, Heading, Input, Text, Textarea } from "@chakra-ui/react";
import { Chip } from "../../web/components/ui/chip";
import { EmptyState } from "../../web/components/ui/empty-state";
import { Field } from "../../web/components/ui/field";
import { SectionMessage } from "../../web/components/ui/section-message";
import { Segmented } from "../../web/components/ui/segmented";
import { Toaster, toaster } from "../../web/components/ui/toaster";

// WDS 를 걷어내면서 자체 프리미티브 3종과 Chakra 기본형을 한 화면에 모아 봄
// 화면마다 흩어진 조합을 여기서 한 번에 확인함

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Flex direction="column" gap="2">
      <Heading size="sm" color="fg.alternative">
        {title}
      </Heading>
      <Flex gap="2" wrap="wrap" align="center">
        {children}
      </Flex>
    </Flex>
  );
}

function Catalog() {
  return (
    <Flex direction="column" gap="6" maxWidth="480px">
      <Section title="Chip · 고르는 칩">
        <Chip size="xsmall">xsmall</Chip>
        <Chip size="small">small</Chip>
        <Chip size="medium">medium</Chip>
        <Chip active>선택됨</Chip>
        <Chip outlined>테두리</Chip>
      </Section>

      <Section title="Chip · 읽기 전용 태그">
        <Chip size="xsmall" outlined readOnly>
          AI 초안
        </Chip>
        <Chip size="small" readOnly>
          배회 중
        </Chip>
        <Chip size="small" readOnly>
          흰색
        </Chip>
      </Section>

      <Section title="SectionMessage">
        <Flex direction="column" gap="2" width="100%">
          <SectionMessage variant="info">안내 문구입니다</SectionMessage>
          <SectionMessage variant="positive">잘 처리됐습니다</SectionMessage>
          <SectionMessage variant="cautionary">주의가 필요합니다</SectionMessage>
          <SectionMessage variant="negative" onClose={() => {}}>
            닫을 수 있는 오류입니다
          </SectionMessage>
        </Flex>
      </Section>

      <Section title="Segmented">
        <Flex direction="column" gap="2" width="100%">
          <Segmented
            value="dog"
            options={[
              { value: "dog", label: "개" },
              { value: "cat", label: "고양이" },
              { value: "other", label: "그 외" },
              { value: "unknown", label: "모르겠음" },
            ]}
            onValueChange={() => {}}
          />
          <Segmented
            value="null"
            options={[
              { value: "true", label: "있음" },
              { value: "false", label: "없음" },
              { value: "null", label: "모르겠음" },
            ]}
            onValueChange={() => {}}
          />
        </Flex>
      </Section>

      <Section title="Button">
        <Button colorPalette="brand">기본</Button>
        <Button colorPalette="brand" size="xl">
          큰 버튼
        </Button>
        <Button variant="outline">테두리</Button>
        <Button variant="outline" size="sm">
          작은 테두리
        </Button>
        <Button colorPalette="brand" loading>
          처리 중
        </Button>
        <Button disabled>비활성</Button>
      </Section>

      <Section title="입력">
        <Flex direction="column" gap="2" width="100%">
          <Input placeholder="한 줄 입력" />
          <Input type="datetime-local" />
          <Textarea rows={3} placeholder="여러 줄 입력" />
        </Flex>
      </Section>

      <Section title="Field">
        <Flex direction="column" gap="4" width="100%">
          <Field label="외형 요약" helper="품종은 단정하지 않고 추정으로만 적습니다">
            <Textarea rows={2} placeholder="흰색 소형견, 털이 길고 엉킴" />
          </Field>
          <Field
            label="목격 지역"
            required
            error="목격 지역을 골라야 다음으로 넘어갑니다"
          >
            <Input placeholder="동, 면으로 검색" />
          </Field>
          <Field
            label="외형 요약"
            labelSuffix={
              <Chip size="xsmall" outlined readOnly>
                AI 초안
              </Chip>
            }
          >
            <Input defaultValue="흰색 소형견, 털이 길고 엉킴" />
          </Field>
        </Flex>
      </Section>

      <Section title="EmptyState">
        <EmptyState
          title="아직 후보가 없습니다"
          description="같은 지역에 목격 제보가 올라오면 이 화면에 후보로 나옵니다"
          action={<Button colorPalette="brand">처음부터 다시 보기</Button>}
        />
      </Section>

      <Section title="Toast">
        {/* 카탈로그 안에서도 실제로 띄워 봄 */}
        <Toaster />
        <Button
          variant="outline"
          onClick={() => toaster.create({ title: "링크를 복사했습니다", type: "success" })}
        >
          성공 토스트
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            toaster.create({
              title: "링크를 복사하지 못했습니다",
              description: "주소창의 주소를 복사해 주십시오",
              type: "error",
            })
          }
        >
          오류 토스트
        </Button>
      </Section>

      <Section title="타이포">
        <Flex direction="column" gap="1" width="100%">
          <Heading size="2xl">타이틀 2xl</Heading>
          <Heading size="xl">타이틀 xl</Heading>
          <Heading size="lg">타이틀 lg</Heading>
          <Heading size="sm">헤딩 sm</Heading>
          <Text>본문</Text>
          <Text color="fg.alternative">보조 문구</Text>
          <Text textStyle="sm" color="fg.assistive">
            가장 옅은 안내
          </Text>
        </Flex>
      </Section>
    </Flex>
  );
}

const meta = {
  title: "다시집/카탈로그",
  component: Catalog,
  parameters: { layout: "padded" },
} satisfies Meta<typeof Catalog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const 기본: Story = {};
