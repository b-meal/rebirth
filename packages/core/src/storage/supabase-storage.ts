import "server-only";

// Supabase Storage REST 직접 호출. SDK 를 넣지 않아 번들과 의존성을 늘리지 않음
// 버킷은 비공개이고 service role 키로만 쓰기 때문에 이 모듈은 서버에서만 돎

export const PHOTO_BUCKET = "report-photos";

// 조회용 서명 URL 유효기간. 상세 화면 체류와 공유 클릭까지 감당하는 길이
export const SIGNED_URL_TTL_SECONDS = 60 * 60;

export type StorageErrorKind =
  | "no-config"
  | "unauthorized"
  | "not-found"
  | "payload-too-large"
  | "timeout"
  | "network"
  | "http";

export class StorageError extends Error {
  readonly kind: StorageErrorKind;
  readonly status?: number;

  constructor(kind: StorageErrorKind, message: string, status?: number) {
    super(message);
    this.name = "StorageError";
    this.kind = kind;
    this.status = status;
  }
}

const TIMEOUT_MS = 10_000;

function config() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new StorageError(
      "no-config",
      "SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 가 없습니다",
    );
  }
  return { base: `${url.replace(/\/$/, "")}/storage/v1`, key };
}

function mapStatus(status: number): StorageErrorKind {
  if (status === 401 || status === 403) return "unauthorized";
  if (status === 404) return "not-found";
  if (status === 413) return "payload-too-large";
  return "http";
}

// lib 에 DOM 이 없어 RequestInit·BodyInit 을 쓰지 않고 필요한 것만 받음
type CallInit = {
  method: string;
  body?: ArrayBuffer | Uint8Array | string;
  headers?: Record<string, string>;
};

async function call(path: string, init: CallInit): Promise<Response> {
  const { base, key } = config();
  const { body, headers, method } = init;

  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      method,
      body: body as never,
      headers: {
        authorization: `Bearer ${key}`,
        ...headers,
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new StorageError("timeout", "스토리지 응답이 지연됐습니다");
    }
    throw new StorageError("network", "스토리지에 연결하지 못했습니다");
  }

  if (!response.ok) {
    // 본문에 키가 섞일 수 있어 상태와 짧은 텍스트만 남김
    const detail = await response.text().catch(() => "");
    throw new StorageError(
      mapStatus(response.status),
      detail.slice(0, 200),
      response.status,
    );
  }
  return response;
}

/** 제보 사진 오브젝트 키. 제보 단위로 묶어 삭제와 조회를 함께 다룸 */
export function photoObjectPath(reportId: string, index: number): string {
  return `${reportId}/${index}.jpg`;
}

export async function uploadPhoto(input: {
  path: string;
  body: ArrayBuffer | Uint8Array;
  contentType: string;
}): Promise<void> {
  await call(`/object/${PHOTO_BUCKET}/${input.path}`, {
    method: "POST",
    body: input.body,
    headers: {
      "content-type": input.contentType,
      // 같은 키로 다시 올리면 덮어씀. 재시도가 사본을 남기지 않게 함
      "x-upsert": "true",
    },
  });
}

export async function createSignedUrl(
  path: string,
  expiresIn: number = SIGNED_URL_TTL_SECONDS,
): Promise<{ url: string; expiresAt: Date }> {
  const response = await call(`/object/sign/${PHOTO_BUCKET}/${path}`, {
    method: "POST",
    body: JSON.stringify({ expiresIn }),
    headers: { "content-type": "application/json" },
  });

  const body = (await response.json()) as { signedURL?: string };
  if (!body.signedURL) {
    throw new StorageError("http", "서명 URL 응답에 signedURL 이 없습니다");
  }

  const { base } = config();
  // signedURL 은 /object/sign/... 형태의 상대 경로로 옴
  return {
    url: `${base}${body.signedURL.startsWith("/") ? "" : "/"}${body.signedURL}`,
    expiresAt: new Date(Date.now() + expiresIn * 1000),
  };
}

/** 제보 삭제 시 사진도 함께 지움. 실패해도 호출자가 제보 삭제를 되돌리지 않음 */
export async function removePhotos(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  await call(`/object/${PHOTO_BUCKET}`, {
    method: "DELETE",
    body: JSON.stringify({ prefixes: paths }),
    headers: { "content-type": "application/json" },
  });
}
