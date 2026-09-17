import "server-only";

import { insertReportEmbedding } from "@rebirth/db";

import { buildEmbedText, isEmbeddable, EMBEDDING_MODEL, type EmbedSource } from "./embed-text.ts";
import { embedOne } from "./embed.ts";

// 제보가 저장된 뒤 벡터를 남김, 실패해도 저장을 되돌리지 않음

export async function embedReport(reportId: string, source: EmbedSource): Promise<void> {
  if (!isEmbeddable(source)) return;
  const text = buildEmbedText(source);
  const vector = await embedOne(text);
  await insertReportEmbedding({
    reportId,
    embedding: vector,
    sourceText: text,
    model: EMBEDDING_MODEL,
  });
}
