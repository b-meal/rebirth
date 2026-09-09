import type { Meta, StoryObj } from "@storybook/react-vite";
import { FlexBox, Typography } from "@wanteddev/wds";
import { PhotoPicker } from "../../web/components/ui/photo-picker";
import { usePhotoPicker } from "../../web/hooks/use-photo-picker";

type DemoProps = {
  maxCount: number;
  disabled: boolean;
  hint: string;
};

// 실제 폼에서 쓰는 방식 그대로 훅과 컴포넌트를 연결
function Demo({ maxCount, disabled, hint }: DemoProps) {
  const picker = usePhotoPicker({ maxCount });
  const summary = picker.photos
    .map((photo) => `${photo.width}×${photo.height} · ${Math.round(photo.file.size / 1024)}KB`)
    .join(", ");

  return (
    <FlexBox flexDirection="column" gap="16px" sx={{ maxWidth: 420 }}>
      <PhotoPicker picker={picker} disabled={disabled} hint={hint} />
      <Typography variant="caption1" color="semantic.label.alternative">
        {picker.photos.length === 0
          ? "선택된 사진 없음"
          : `재인코딩 결과 ${picker.photos.length}장 · ${summary}`}
      </Typography>
    </FlexBox>
  );
}

const meta = {
  title: "다시집/PhotoPicker",
  component: Demo,
  args: {
    maxCount: 5,
    disabled: false,
    // 제보 폼에서 넘기는 도메인 문구 예시. 컴포넌트 기본값은 중립 문구
    hint: "동물이 잘 보이는 사진일수록 AI 초안이 정확해집니다",
  },
  argTypes: {
    maxCount: { control: { type: "range", min: 1, max: 10, step: 1 } },
  },
} satisfies Meta<typeof Demo>;

export default meta;

type Story = StoryObj<typeof meta>;

export const 기본: Story = {};

export const 한장만: Story = {
  args: { maxCount: 1 },
};

export const 비활성: Story = {
  args: { disabled: true },
};
