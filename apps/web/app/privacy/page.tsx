import { findPublishedLegalDocument } from "@rebirth/db";

import { LegalDocument, LegalNotPublished } from "@/components/legal/legal-document";

// WEB-22. 발행된 개인정보 처리방침 원문만 보여줌
// 운영 주체·책임자·문의처가 미정이라 화면에서 문구를 지어내지 않음

export const metadata = { title: "개인정보 처리방침" };

// 개정이 즉시 반영돼야 해 캐시하지 않음
export const dynamic = "force-dynamic";

export default async function PrivacyPage() {
  const document = await findPublishedLegalDocument("privacy");

  if (!document) return <LegalNotPublished label="개인정보 처리방침" />;

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
