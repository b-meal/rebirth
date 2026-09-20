"use client";

import { useFormStatus } from "react-dom";
import { Flex } from "@seed-design/react";
import { ActionButton } from "seed-design/ui/action-button";

import { signOut } from "@/app/sign-out/actions";

// 로그아웃 버튼. form 으로 감싸 자바스크립트가 없어도 눌림

export type SignOutButtonProps = {
  /** 자동 익명 로그인이 켜진 체험 계정. 나가면 곧바로 새 계정이 생기므로 그렇게 부름 */
  restartsGuest?: boolean;
};

export function SignOutButton({ restartsGuest = false }: SignOutButtonProps) {
  return (
    <form action={signOut}>
      <Flex align="stretch">
        <SubmitButton label={restartsGuest ? "체험 계정 새로 시작" : "로그아웃"} />
      </Flex>
    </form>
  );
}

/** useFormStatus 는 form 안에서만 값을 읽으므로 버튼을 따로 둠 */
function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <ActionButton
      type="submit"
      variant="neutralWeak"
      size="large"
      flexGrow={1}
      loading={pending}
      disabled={pending}
    >
      {label}
    </ActionButton>
  );
}
