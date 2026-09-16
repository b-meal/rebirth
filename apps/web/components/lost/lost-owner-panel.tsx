"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Icon, ResponsivePair, Text, VStack } from "@seed-design/react";
import {
  IconCheckmarkCircleFill,
  IconMagnifyingglassSparkleFill,
} from "@karrotmarket/react-monochrome-icon";
import { ActionButton } from "seed-design/ui/action-button";
import {
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogRoot,
  AlertDialogTitle,
} from "seed-design/ui/alert-dialog";
import { Callout } from "seed-design/ui/callout";

import { withObject } from "@/lib/report-label";
import { SectionCard, SectionTitle } from "@/components/ui/screen";

// 내 신고에만 보이는 관리 줄
// 소유와 권한이 다른 축이라 둘을 따로 받음. 로그인 계정은 내 기록임을 말하고
// 고치고 닫는 권한은 관리 세션에서만 나옴. POL-03

export type LostOwnerPanelProps = {
  reportId: string;
  /** 낙관적 락. 화면이 본 값과 어긋나면 서버가 409 로 되돌림 */
  version: number;
  lifecycle: string;
  /** 지금 이 브라우저가 관리 권한을 갖는지. 관리 주소로 들어온 적이 있어야 참 */
  canManage: boolean;
  /** 적어 둔 이름. 내 아이 이름으로 물어야 남 얘기처럼 읽히지 않음 */
  name: string | null;
};

export function LostOwnerPanel({
  reportId,
  version,
  lifecycle,
  canManage,
  name,
}: LostOwnerPanelProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const searching = lifecycle === "searching";

  const confirmFound = () => {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/manage/reports/${reportId}/close`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ reason: "found", version }),
        });

        if (response.status === 409) {
          setError("다른 곳에서 먼저 바뀌었어요. 새로고침하고 다시 눌러 주세요");
          return;
        }
        if (!response.ok) {
          setError("상태를 바꾸지 못했어요. 잠시 뒤 다시 눌러 주세요");
          return;
        }

        setOpen(false);
        router.refresh();
      } catch {
        setError("상태를 바꾸지 못했어요. 잠시 뒤 다시 눌러 주세요");
      }
    });
  };

  return (
    <SectionCard gap="x3">
      <VStack align="stretch" gap="x1">
        <SectionTitle>내 신고 관리</SectionTitle>
        <Text textStyle="t3Regular" color="fg.neutralMuted">
          {searching
            ? "비슷한 발견 제보를 모아 두었어요"
            : "이미 마무리된 신고예요"}
        </Text>
      </VStack>

      {canManage ? (
        searching ? (
          <VStack align="stretch" gap="x2">
            <ActionButton variant="neutralWeak" size="large" asChild>
              <Link href={`/mine/lost/${reportId}`}>
                <Icon svg={<IconMagnifyingglassSparkleFill />} />
                확인할 후보 보기
              </Link>
            </ActionButton>
            <ActionButton
              variant="brandSolid"
              size="large"
              onClick={() => {
                setError(null);
                setOpen(true);
              }}
            >
              <Icon svg={<IconCheckmarkCircleFill />} />
              {name ? `${withObject(name)} 찾았어요` : "우리 아이를 찾았어요"}
            </ActionButton>
            {/* 시트를 닫아도 남아 실패를 알림 */}
            {error ? <Callout tone="critical" description={error} /> : null}
          </VStack>
        ) : null
      ) : (
        // 로그인만으로는 고칠 수 없음. 어디로 가야 하는지만 알림
        <Callout
          tone="informative"
          description="후보 확인과 상태 변경은 신고할 때 받은 관리 주소로 들어와야 열려요"
        />
      )}

      <AlertDialogRoot
        open={open}
        onOpenChange={(next) => {
          if (!pending) setOpen(next);
        }}
      >
        {/* design-system-allow:space 다이얼로그 기본 폭 272px 는 recipe 상수라 넓힐 토큰이 없음 */}
        <AlertDialogContent style={{ maxWidth: "320px" }}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {name ? `${withObject(name)} 찾았나요?` : "우리 아이를 찾았나요?"}
            </AlertDialogTitle>
            {/* 앱이 사실을 확인하지 않는다는 점을 여기서 밝힘 */}
            <AlertDialogDescription>
              신고가 찾음으로 바뀌고 목록에서 내려가요. 다시 열려면 문의해야 해요
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <ResponsivePair gap="x2">
              <AlertDialogAction
                variant="neutralWeak"
                disabled={pending}
                onClick={() => setOpen(false)}
              >
                아직이에요
              </AlertDialogAction>
              <AlertDialogAction
                variant="brandSolid"
                loading={pending}
                onClick={(event) => {
                  event.preventDefault();
                  confirmFound();
                }}
              >
                찾았어요
              </AlertDialogAction>
            </ResponsivePair>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogRoot>
    </SectionCard>
  );
}
