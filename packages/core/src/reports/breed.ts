// 품종 표기를 한 곳에서 다룸, server-only 를 쓰지 않아 화면에서도 그대로 씀

// 모델이 breedGuess 에 함께 적어 보내는 꼬리말, 화면이 계열 추정을 다시 붙이므로 떼어 냄
const BREED_TAIL = /[,\s]*(계열\s*)?추정\s*$/;

/** 품종명만 남김, 남는 글자가 없으면 null */
export function bareBreed(value: string | null | undefined): string | null {
  if (!value) return null;
  const bare = value.replace(BREED_TAIL, "").trim();
  return bare.length > 0 ? bare : null;
}
