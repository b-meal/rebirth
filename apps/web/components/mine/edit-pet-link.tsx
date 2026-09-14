"use client";

import Link, { useLinkStatus } from "next/link";
import { ActionButton } from "seed-design/ui/action-button";
import { LoadingIndicator } from "seed-design/ui/loading-indicator";

// 수정 화면으로 가는 버튼
//
// 그 화면은 force-dynamic 이라 서버가 기록과 사진 주소를 읽어 올 때까지 아무 일도 일어나지 않음
// loading.tsx 도 없어 화면이 그대로 멎은 것처럼 보이고 사용자는 버튼을 한 번 더 누름
// useLinkStatus 로 그 사이를 버튼 안에서 알림

/**
 * 누른 뒤 화면이 바뀌기까지를 버튼 안에서 알림
 * pending 은 Link 자손에서만 읽을 수 있어 글자를 이 조각으로 감쌈
 * ActionButton 은 asChild 일 때 로딩 표시를 직접 감싸 주지 않아 여기서 겹침
 */
function PendingLabel({ children }: { children: string }) {
  const { pending } = useLinkStatus();
  // LoadingIndicator 는 켜고 끄는 prop 이 없어 도는 동안에만 씌움
  return pending ? <LoadingIndicator>{children}</LoadingIndicator> : <>{children}</>;
}

export type EditPetLinkProps = {
  petId: string;
  children: string;
};

export function EditPetLink({ petId, children }: EditPetLinkProps) {
  return (
    <ActionButton variant="brandSolid" size="large" asChild>
      {/* 미리 받아 두면 pending 없이 바로 넘어감. 그때는 기다림 자체가 없어 표시도 필요 없음 */}
      <Link href={`/mine/pets/${petId}/edit`}>
        <PendingLabel>{children}</PendingLabel>
      </Link>
    </ActionButton>
  );
}
