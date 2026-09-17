import { findPublishedLegalDocument } from "@rebirth/db";

import { LegalDocument, LegalNotPublished } from "@/components/legal/legal-document";

// 로그인 화면이 동의 대상으로 말하는 문서라 주소가 살아 있어야 함

export const metadata = { title: "이용약관" };

// 개정이 즉시 반영돼야 해 캐시하지 않음
export const dynamic = "force-dynamic";

export default async function TermsPage() {
  const document = await findPublishedLegalDocument("terms");

  if (!document) return <LegalNotPublished label="이용약관" />;

  return (
    <LegalDocument
      title={document.title}
      body={document.body}
      version={document.version}
      effectiveAt={document.effectiveAt}
      changeSummary={document.changeSummary}
    />
  );
}
