import "server-only";

import { logFailure } from "../http";

// Supabase Storage REST 직접 호출. SDK 를 넣지 않아 번들과 의존성을 늘리지 않음
// 버킷은 비공개이고 service role 키로만 쓰기 때문에 이 모듈은 서버에서만 돎

export const PHOTO_BUCKET = "report-photos";

// 한 시간이면 탭을 열어 둔 채 한 번만 자리를 비워도 사진이 한꺼번에 깨짐
export const SIGNED_URL_TTL_SECONDS = 12 * 60 * 60;

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

/** 저장된 사진을 서버로 다시 읽어옴. 분석 입력을 브라우저에서 다시 받지 않기 위함 */
export async function downloadPhoto(
  path: string,
): Promise<{ body: ArrayBuffer; contentType: string }> {
  const response = await call(`/object/${PHOTO_BUCKET}/${path}`, {
    method: "GET",
  });
  return {
    body: await response.arrayBuffer(),
    contentType: response.headers.get("content-type") ?? "image/jpeg",
  };
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

/** 목록 카드와 지도 핀이 쓰는 축소 크기. 원본은 장변 1568px 이라 그대로 쓰면 과함 */
export const THUMB_SIZE = 400;
const THUMB_QUALITY = 70;

/** 한 경로를 축소해 서명함. 정사각 크롭이라 카드와 원형 핀에 그대로 들어감 */
async function createSignedThumbUrl(
  path: string,
  expiresIn: number,
): Promise<string> {
  const response = await call(`/object/sign/${PHOTO_BUCKET}/${path}`, {
    method: "POST",
    body: JSON.stringify({
      expiresIn,
      transform: {
        width: THUMB_SIZE,
        height: THUMB_SIZE,
        resize: "cover",
        quality: THUMB_QUALITY,
      },
    }),
    headers: { "content-type": "application/json" },
  });

  const body = (await response.json()) as { signedURL?: string };
  if (!body.signedURL) {
    throw new StorageError("http", "서명 URL 응답에 signedURL 이 없습니다");
  }
  const { base } = config();
  return `${base}${body.signedURL.startsWith("/") ? "" : "/"}${body.signedURL}`;
}

// 서명 하나가 왕복 하나라 지도는 한 번에 수백 번을 오감
// 같은 사진은 유효기간 안에서 다시 서명하지 않고 프로세스에 들고 있음
const thumbCache = new Map<string, { url: Promise<string>; expiresAt: number }>();

// 화면에 떠 있는 동안 만료되지 않도록 남은 시간이 이보다 적으면 새로 서명함
const RENEW_BEFORE_MS = 10 * 60_000;

// 오래 도는 프로세스에서 항목이 무한히 쌓이지 않게 두는 상한
const THUMB_CACHE_MAX = 2000;

function cachedThumbUrl(path: string, expiresIn: number): Promise<string> {
  const key = `${expiresIn}:${path}`;
  const hit = thumbCache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.url;

  const url = createSignedThumbUrl(path, expiresIn);
  // 실패한 약속을 남겨 두면 다음 요청까지 같은 실패를 돌려줌
  void url.catch(() => thumbCache.delete(key));
  thumbCache.set(key, { url, expiresAt: Date.now() + expiresIn * 1000 - RENEW_BEFORE_MS });

  // 넣은 순서대로 도는 Map 이라 앞에서부터 덜어 내면 오래된 것이 먼저 빠짐
  for (const old of thumbCache.keys()) {
    if (thumbCache.size <= THUMB_CACHE_MAX) break;
    thumbCache.delete(old);
  }
  return url;
}

/**
 * 화면 하나가 스토리지로 한 번에 띄우는 서명 요청 수의 상한
 *
 * 경로 수만큼 그대로 띄우면 목록 한 장이 예순 번을 동시에 오가고, 스토리지가 느려진 순간에는
 * 예순 개가 같은 10초를 함께 태운 뒤 한꺼번에 비어 돌아옴
 * 실제로 60장을 여러 동시 수로 재 보면 16 과 60 의 소요가 다르지 않아 이 상한은 값을 잃지 않음
 */
const SIGN_CONCURRENCY = 16;

/**
 * 축소 사진 서명 URL 묶음. 일괄 서명 경로가 transform 을 무시해 경로마다 따로 서명함
 */
export async function createSignedThumbUrls(
  paths: string[],
  expiresIn: number = SIGNED_URL_TTL_SECONDS,
): Promise<Map<string, string>> {
  if (paths.length === 0) return new Map();

  const signed = new Map<string, string>();
  // 한 장이 실패해도 나머지 카드는 사진을 보여 줌
  const failures: unknown[] = [];
  let next = 0;

  async function sign(): Promise<void> {
    while (next < paths.length) {
      const path = paths[next++];
      try {
        signed.set(path, await cachedThumbUrl(path, expiresIn));
      } catch (error) {
        failures.push(error);
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(SIGN_CONCURRENCY, paths.length) }, sign),
  );

  // 조용히 두면 사진이 통째로 빠진 화면과 사진이 없는 제보를 구별할 수 없음
  // 장마다 한 줄씩 남기면 목록 한 장이 표를 예순 줄로 채우므로 묶음마다 한 줄만 남김
  // 몇 장 중 몇 장인지와 어떤 종류인지가 없으면 기록을 봐도 할 수 있는 일이 없음
  if (failures.length > 0) {
    const first = failures[0];
    logFailure("storage.signThumb", first, {
      failed: failures.length,
      total: paths.length,
      ...(first instanceof StorageError && { kind: first.kind }),
      ...(first instanceof StorageError && first.status !== undefined && { status: first.status }),
    });
  }

  return signed;
}

/** 여러 경로를 한 번에 서명함. 목록 화면이 사진 수만큼 요청을 보내지 않게 함 */
export async function createSignedUrls(
  paths: string[],
  expiresIn: number = SIGNED_URL_TTL_SECONDS,
): Promise<Map<string, string>> {
  if (paths.length === 0) return new Map();

  const response = await call(`/object/sign/${PHOTO_BUCKET}`, {
    method: "POST",
    body: JSON.stringify({ expiresIn, paths }),
    headers: { "content-type": "application/json" },
  });

  const rows = (await response.json()) as {
    path?: string;
    signedURL?: string;
    error?: string | null;
  }[];

  const { base } = config();
  const signed = new Map<string, string>();
  for (const row of rows) {
    // 일부 경로만 실패해도 나머지는 그대로 씀
    if (!row.path || !row.signedURL || row.error) continue;
    signed.set(row.path, `${base}${row.signedURL.startsWith("/") ? "" : "/"}${row.signedURL}`);
  }
  return signed;
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
