import type { Meta, StoryObj } from "@storybook/react-vite";
import { Flex, Text } from "@chakra-ui/react";
import { LocationPicker } from "../../web/components/ui/location-picker";

// 검색과 역지오코딩은 web 의 /api 라우트를 거치므로 pnpm -F @rebirth/web dev 가 함께 떠 있어야 함
// 지도는 NEXT_PUBLIC_KAKAO_JS_KEY 와 카카오 플랫폼에 등록된 localhost:6006 이 있을 때만 뜸

const meta = {
  title: "다시집/LocationPicker",
  component: LocationPicker,
  parameters: { layout: "centered" },
  argTypes: {
    coarseGridMeters: {
      control: { type: "inline-radio" },
      options: [300, 1000],
      description: "공개 격자. 부상·어린 개체 제보는 1km",
    },
    mapHeight: { control: { type: "number" } },
  },
  args: {
    onSelect: (selection) => console.log("onSelect", selection),
  },
  decorators: [
    (Story) => (
      <Flex direction="column" gap="2" width="390px">
        <Story />
      </Flex>
    ),
  ],
} satisfies Meta<typeof LocationPicker>;

export default meta;

type Story = StoryObj<typeof meta>;

export const 기본: Story = {};

export const 넓은격자: Story = {
  name: "1km 격자",
  args: { coarseGridMeters: 1000 },
};

export const 초기위치지정: Story = {
  name: "초기 위치 지정",
  args: { initialCenter: { lat: 35.1796, lng: 129.0756 } },
  render: (args) => (
    <>
      <Text textStyle="sm" color="fg.alternative">
        위치 권한을 허용하면 현재 위치로 옮겨 갑니다
      </Text>
      <LocationPicker {...args} />
    </>
  ),
};
