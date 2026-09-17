import "server-only";

import { embed, embedMany } from "ai";

import { EMBEDDING_DIMENSIONS } from "./embed-text.ts";

// 벡터를 만드는 자리, Vercel AI Gateway 로 불러 런타임에 모델 파일을 두지 않음

/** 게이트웨이 모델 이름, 차원을 줄여 받아 기존 vector 열을 그대로 씀 */
export const GATEWAY_EMBEDDING_MODEL = "openai/text-embedding-3-small";

/** 한 번에 보내는 문장 수, 게이트웨이 한 요청의 상한을 넘지 않게 둠 */
const BATCH = 64;

function assertDimensions(vector: number[]): number[] {
  if (vector.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(`벡터 차원이 ${vector.length} 로 왔습니다`);
  }
  return vector;
}

const providerOptions = { openai: { dimensions: EMBEDDING_DIMENSIONS } } as const;

/** 문장 하나를 벡터로, 제보가 저장된 뒤에 부름 */
export async function embedOne(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: GATEWAY_EMBEDDING_MODEL,
    value: text,
    providerOptions,
  });
  return assertDimensions(embedding);
}

/** 여러 문장을 한 번에, 배치 스크립트가 씀 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  const out: number[][] = [];
  for (let from = 0; from < texts.length; from += BATCH) {
    const { embeddings } = await embedMany({
      model: GATEWAY_EMBEDDING_MODEL,
      values: texts.slice(from, from + BATCH),
      maxParallelCalls: 2,
      providerOptions,
    });
    for (const vector of embeddings) out.push(assertDimensions(vector));
  }
  return out;
}
