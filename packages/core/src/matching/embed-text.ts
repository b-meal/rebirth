// 임베딩에 넣을 문장을 만듦. 외부 호출이 없어 스크립트와 서버 양쪽에서 그대로 씀
// 같은 개체를 다르게 쓴 두 제보가 가까워지도록 구조화 값과 자유 문장을 함께 넣음

/** 벡터를 만드는 모델. 바꾸면 저장된 벡터를 전부 다시 만들어야 함 */
export const EMBEDDING_MODEL = "openai/text-embedding-3-small";

/** report_embeddings 의 vector 열과 같은 값이라 한쪽만 바꾸면 저장이 막힘 */
export const EMBEDDING_DIMENSIONS = 384;

export type EmbedSource = {
  animalType: string;
  breedGuess: string | null;
  colors: string[];
  size: string;
  conditionTags: string[];
  appearance: string | null;
};

const ANIMAL: Record<string, string> = {
  dog: "개",
  cat: "고양이",
  other: "그 외 동물",
  unknown: "종류 확인 어려움",
};

const SIZE: Record<string, string> = {
  small: "소형",
  medium: "중형",
  large: "대형",
  unknown: "",
};

/**
 * 제보 하나를 한 문단으로 폄. 빈 값은 자리를 만들지 않음
 * 품종은 계열 추정으로만 넣어 확정 표현이 벡터에 섞이지 않게 함
 */
export function buildEmbedText(source: EmbedSource): string {
  const parts = [
    ANIMAL[source.animalType] ?? source.animalType,
    SIZE[source.size] ?? "",
    source.colors.join(" "),
    source.breedGuess ? `${source.breedGuess} 계열 추정` : "",
    source.conditionTags.join(" "),
    source.appearance ?? "",
  ];

  return parts
    .map((part) => part.trim())
    .filter((part) => part !== "")
    .join(", ")
    .replace(/\s+/g, " ")
    .slice(0, 1000);
}

/** 넣을 말이 종류밖에 없으면 벡터를 만들어도 이웃을 고르지 못함 */
export function isEmbeddable(source: EmbedSource): boolean {
  const meaningful = [
    source.appearance?.trim(),
    source.colors.join("").trim(),
    source.breedGuess?.trim(),
    source.conditionTags.join("").trim(),
  ].filter((part) => part !== undefined && part !== "");
  return meaningful.length > 0;
}
