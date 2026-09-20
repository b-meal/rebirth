// 1단계 선검사에 쓰는 모델과 지시문, server-only 를 쓰지 않아 평가 스크립트도 같은 값을 씀

// 판정이 이진이라 초안 모델을 쓸 이유가 없음. 같은 사진에서 haiku 가 sonnet 의 절반 시간에 답함
export const PRECHECK_MODEL = "claude-haiku-4-5";

/** 선검사에 보내는 긴 변 상한. 초안용 1600px 은 토큰과 시간이 네 배로 듦 */
export const PRECHECK_MAX_EDGE = 384;

/** 이 시간을 넘기면 판정을 버리고 통과시킴. 1단계에서 사용자를 세워 두지 않음 */
export const PRECHECK_TIMEOUT_MS = 2500;

/** 한 단어만 받으므로 출력 상한을 최소로 둠 */
export const PRECHECK_MAX_TOKENS = 4;

// 오거부가 오검출보다 훨씬 비쌈. 제보를 막으면 이 서비스가 할 일이 없어짐
// 그래서 애매한 것은 전부 통과로 기울이고, 확실히 아닌 것만 걸러냄
export const PRECHECK_SYSTEM = `사진에 동물이 찍혀 있는지만 봅니다. yes 또는 no 한 단어로만 답합니다.

yes 로 답하는 경우
- 개, 고양이, 새, 토끼, 페럿, 그 밖의 어떤 동물이든 조금이라도 보일 때
- 멀리 있거나 어둡거나 흔들렸거나 몸의 일부만 보여도 yes
- 차 밑, 풀숲, 상자 안처럼 가려져 있어도 yes
- 동물인지 아닌지 헷갈리면 yes

no 로 답하는 경우
- 사람만 있는 사진, 풍경, 음식, 사물, 화면 캡처, 문서처럼 동물이 전혀 없을 때
- 동물 그림, 인형, 캐릭터처럼 살아 있는 동물이 아닐 때`;

export const PRECHECK_PROMPT = "동물이 보입니까?";

export type PrecheckImage = {
  base64: string;
  mediaType: "image/jpeg" | "image/png" | "image/webp";
};

/** 요청 본문. 평가 스크립트와 서버가 같은 것을 보내야 측정값이 배포와 맞음 */
export function precheckRequest(image: PrecheckImage) {
  return {
    model: PRECHECK_MODEL,
    max_tokens: PRECHECK_MAX_TOKENS,
    system: PRECHECK_SYSTEM,
    messages: [
      {
        role: "user" as const,
        content: [
          {
            type: "image" as const,
            source: {
              type: "base64" as const,
              media_type: image.mediaType,
              data: image.base64,
            },
          },
          { type: "text" as const, text: PRECHECK_PROMPT },
        ],
      },
    ],
  };
}

/**
 * 모델 응답을 통과 여부로 읽음
 * 판정을 못 읽으면 통과로 둠. 선검사가 애매해서 제보를 막는 일이 없어야 함
 */
export function readVerdict(text: string): boolean {
  // 마침표나 따옴표가 붙어 와도 같은 판정이 되도록 글자만 남겨 비교함
  return text.toLowerCase().replace(/[^a-z]/g, "") !== "no";
}
