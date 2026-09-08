import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "제보 상세" };

export default async function SightingDetailPage({
  params,
}: PageProps<"/sightings/[id]">) {
  const { id } = await params;

  return (
    <>
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold">제보 상세</h1>
        <Badge variant="secondary" className="tabular-nums">
          {id}
        </Badge>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">조회 연결 전</CardTitle>
          <CardDescription>
            AI 초안과 사용자 수정 이력, 서명 URL 사진을 이 화면에 붙입니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground text-xs">
          품종은 단정하지 않고 계열 추정으로만 적습니다.
        </CardContent>
      </Card>
    </>
  );
}
