import type { Meta, StoryObj } from "@storybook/react-vite";
import type { LocationCandidate } from "@rebirth/core/location/candidate";
import { FlexBox, Typography } from "@wanteddev/wds";
import { useState } from "react";
import { PlaceSearchField } from "../../web/components/ui/place-search-field";
import {
  usePlaceSearch,
  type PlaceSearchMode,
} from "../../web/hooks/use-place-search";

// 검색과 역지오코딩은 web 의 /api 라우트를 거치므로 pnpm -F @rebirth/web dev 가 함께 떠 있어야 함

const SEOUL_CITY_HALL = { lat: 37.5665, lng: 126.978 };

type DemoProps = {
  mode: PlaceSearchMode;
  emptyMessage?: string;
  // 켜면 서울시청을 기준으로 반경 검색과 거리 표시를 함
  nearby: boolean;
  radiusMeters: number;
  placeholder: string;
};

// 실제 폼에서 쓰는 방식 그대로 훅과 컴포넌트를 연결
function Demo({ mode, nearby, radiusMeters, placeholder, emptyMessage }: DemoProps) {
  const [picked, setPicked] = useState<LocationCandidate | null>(null);
  const search = usePlaceSearch({
    mode,
    center: nearby ? SEOUL_CITY_HALL : undefined,
    radiusMeters: nearby ? radiusMeters : undefined,
  });

  return (
    <FlexBox flexDirection="column" gap="16px" sx={{ width: 390, minHeight: 320 }}>
      <PlaceSearchField
        search={search}
        placeholder={placeholder}
        emptyMessage={emptyMessage}
        onPick={(candidate) => {
          setPicked(candidate);
          search.clear();
        }}
      />
      {/* 결과가 겹쳐 뜨므로 이 문구는 목록이 열려도 밀리지 않음 */}
      <Typography variant="caption1" color="semantic.label.alternative">
        {picked
          ? `${picked.name} · ${picked.areaName || "행정동 없음"} · ${picked.detail}`
          : "고른 장소 없음"}
      </Typography>
    </FlexBox>
  );
}

const meta = {
  title: "다시집/PlaceSearchField",
  component: Demo,
  args: {
    mode: "keyword",
    nearby: false,
    radiusMeters: 1000,
    placeholder: "지하철역, 건물, 주소로 검색",
  },
  argTypes: {
    mode: {
      control: { type: "inline-radio" },
      options: ["keyword", "address"],
      description: "keyword 는 장소 검색, address 는 주소 검색",
    },
    radiusMeters: { control: { type: "range", min: 100, max: 20000, step: 100 } },
  },
} satisfies Meta<typeof Demo>;

export default meta;

type Story = StoryObj<typeof meta>;

export const 기본: Story = {};

export const 반경검색: Story = {
  name: "반경 검색",
  args: { nearby: true, radiusMeters: 1000 },
};

export const 주소검색: Story = {
  name: "주소 검색",
  args: {
    mode: "address",
    placeholder: "도로명이나 지번으로 검색",
    // 장소명으로는 결과가 오지 않아 다음 행동을 알려 줌
    emptyMessage: "도로명이나 지번으로 입력해 보십시오. 건물 이름은 장소 검색에서 찾습니다",
  },
};
