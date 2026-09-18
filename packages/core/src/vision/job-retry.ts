// 분석 작업 행을 되살려 다시 돌릴지 판정. server-only 를 쓰지 않아 단위 테스트가 그대로 읽음
//
// 같은 사진의 같은 revision 은 행이 하나뿐이라(유일 제약) 실패한 행을 그대로 돌려주면
// 그 사진은 다시 찍기 전까지 영영 분석되지 않음. 서버가 도중에 꺼져 running 으로 굳은 행도 같음

// 모델 상한 20초 × 재시도 1회에 다운로드 시간을 더한 값보다 넉넉히
export const STALE_RUNNING_MS = 60_000;

export function isRetryableAnalysisJob(
  job: { status: string; createdAt: Date },
  now: Date = new Date(),
): boolean {
  if (job.status === "failed") return true;
  return job.status === "running" && now.getTime() - job.createdAt.getTime() > STALE_RUNNING_MS;
}
