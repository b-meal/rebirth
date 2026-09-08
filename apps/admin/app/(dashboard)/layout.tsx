import { DashboardNav } from "@/components/dashboard-nav";
import { Divider, FlexBox, Typography } from "@wanteddev/wds";

export default function DashboardLayout({ children }: LayoutProps<"/">) {
  return (
    <FlexBox sx={{ minHeight: "100vh" }}>
      <FlexBox
        flexDirection="column"
        sx={{ width: "200px", flexShrink: 0, borderRight: "1px solid rgba(0, 0, 0, 0.08)" }}
      >
        <FlexBox alignItems="center" sx={{ height: "48px", padding: "0 16px" }}>
          <Typography variant="headline2" weight="bold">
            다시집 운영
          </Typography>
        </FlexBox>
        <Divider />
        <DashboardNav />
      </FlexBox>
      <FlexBox flexDirection="column" flex="1" sx={{ minWidth: 0 }}>
        <FlexBox alignItems="center" sx={{ height: "48px", padding: "0 20px" }}>
          <Typography variant="caption1">관리자</Typography>
        </FlexBox>
        <Divider />
        <FlexBox flexDirection="column" gap="16px" sx={{ padding: "20px" }}>
          {children}
        </FlexBox>
      </FlexBox>
    </FlexBox>
  );
}
