"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { HStack, Icon, ResponsivePair, Text, VStack } from "@seed-design/react";
import {
  IconCheckmarkCircleFill,
  IconDocumentLine,
  IconLockLine,
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
import { Switch } from "seed-design/ui/switch";

import { startManaging } from "@/app/r/[id]/actions";
import { toggleMatchAlert } from "@/app/mine/notifications/actions";
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
  /** 닮은 제보가 올라오면 알림함에 띄울지 */
  matchAlert: boolean;
};

export function LostOwnerPanel({
  reportId,
  version,
  lifecycle,
  canManage,
  name,
  matchAlert,
}: LostOwnerPanelProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // 서버가 다시 그릴 때까지 스위치가 눌린 대로 보이게 화면이 먼저 값을 들고 있음
  const [alertOn, setAlertOn] = useState(matchAlert);
  const [alertPending, startAlert] = useTransition();
  const [startPending, startManage] = useTransition();

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

      {/* 알림은 관리 권한이 아니라 계정에 묶여 있어 관리 주소 없이도 켜고 끌 수 있음 */}
      {searching ? (
        <HStack justify="space-between" align="center" gap="x3">
          <VStack align="stretch" gap="x0_5" minWidth="0">
            <Text textStyle="t4Regular" color="fg.neutral">
              닮은 제보 알림
            </Text>
            <Text textStyle="t2Regular" color="fg.neutralSubtle">
              많이 닮은 제보가 올라오면 알림함에 모아 드려요
            </Text>
          </VStack>
          <Switch
            checked={alertOn}
            disabled={alertPending}
            onCheckedChange={(next) => {
              setAlertOn(next);
              startAlert(async () => {
                const ok = await toggleMatchAlert(reportId, next);
                // 실패하면 눌리기 전으로 되돌려 화면과 서버가 어긋나지 않게 함
                if (!ok) setAlertOn(!next);
              });
            }}
          />
        </HStack>
      ) : null}

      {canManage ? (
        searching ? (
          <VStack align="stretch" gap="x2">
            <ActionButton variant="neutralWeak" size="large" asChild>
              <Link href={`/mine/lost/${reportId}`}>
                <Icon svg={<IconMagnifyingglassSparkleFill />} />
                확인할 후보 보기
              </Link>
            </ActionButton>
            {/* 온라인에 닿지 않는 이웃에게는 종이가 유일한 경로라 찾는 중에만 띄움 */}
            <ActionButton variant="neutralWeak" size="large" asChild>
              <Link href={`/r/${reportId}/poster`}>
                <Icon svg={<IconDocumentLine />} />
                전단 만들기
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
        // 관리 주소를 잃어도 계정으로 다시 열 수 있음. 막다른 길을 두지 않음
        <VStack align="stretch" gap="x2">
          <Callout
            tone="informative"
            description="이 브라우저에는 관리 권한이 없어요. 내 신고가 맞으면 바로 열 수 있어요"
          />
          <ActionButton
            variant="neutralSolid"
            size="large"
            loading={startPending}
            onClick={() => {
              setError(null);
              startManage(async () => {
                const ok = await startManaging(reportId);
                if (!ok) setError("권한을 열지 못했어요. 로그인 상태를 확인해 주세요");
              });
            }}
          >
            <Icon svg={<IconLockLine />} />
            내 신고 관리 열기
          </ActionButton>
          {error ? <Callout tone="critical" description={error} /> : null}
        </VStack>
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
