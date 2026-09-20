import { fitRescueField } from "@rebirth/core/support/rescue";
import { findPublicReport } from "@rebirth/db";

import { CTA } from "@/lib/cta-label";
import { breedLabel, describeAnimal } from "@/lib/report-label";
import { RescueRequest, type RescuePrefill } from "@/components/guide/rescue-request";

// 다친 동물을 봤을 때 쓰는 화면
// 안내문 대신 접수 폼을 둠. 급한 사람은 읽지 않고 바로 행동함

export const metadata = {
  title: CTA.rescue,
  robots: { index: false },
};

/**
 * 제보 상세에서 왔으면 세 칸을 채워 둠
 * 화면에 이미 있던 값을 처음부터 다시 치게 하면
 * 요청 이라는 말과 실제로 하는 일이 어긋나 무엇을 하는 버튼인지 알 수 없게 됨
 */
async function loadPrefill(reportId: string): Promise<RescuePrefill | null> {
  // 없는 제보나 조회 실패는 빈 폼으로 떨어뜨림. 급한 사람을 오류 화면에 세우지 않음
  const report = await findPublicReport(reportId).catch(() => undefined);
  // 실종 신고에서는 구조할 대상이 이 화면에 없음
  if (!report || report.kind === "lost") return null;
  // 보호 중인 기록의 장소는 동물이 있는 곳이 아니라 보호소의 공고 정보임
  // 그대로 채우면 어디에 있나요 에 공고 번호가 들어가 빈 폼보다 못함
  if (report.careSituation === "in_care") return null;

  // 격자 좌표도 정확 좌표도 넣지 않음. 지역명과 제보자가 적은 표지물만 씀. POL-09
  const where = [report.areaName, report.landmarkNote].filter(Boolean).join(" ");
  // AI 가 채운 값이라 품종은 계열 추정 표기를 그대로 달고 감
  const what = [describeAnimal(report), breedLabel(report.breedGuess)]
    .filter(Boolean)
    .join(", ");
  const condition = [
    ...report.conditionTags,
    report.injury === true ? "부상 있어 보임" : null,
  ]
    .filter(Boolean)
    .join(", ");

  return {
    reportId: report.id,
    where: fitRescueField(where, "where"),
    what: fitRescueField(what, "what"),
    condition: fitRescueField(condition, "condition"),
  };
}

export default async function InjuredGuidePage({
  searchParams,
}: PageProps<"/guide/injured">) {
  const { from } = await searchParams;
  const prefill = typeof from === "string" ? await loadPrefill(from) : null;

  return <RescueRequest prefill={prefill} />;
}
