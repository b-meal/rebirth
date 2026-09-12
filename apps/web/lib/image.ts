// 브라우저 전용 이미지 처리. 캔버스 재인코딩으로 EXIF(GPS 포함) 제거와 용량 축소를 함께 수행
// design-system-allow:color 캔버스 픽셀 값이라 CSS 토큰을 쓸 수 없음

export type PhotoItem = {
  id: string;
  // 재인코딩된 JPEG. 업로드에 그대로 사용
  file: File;
  // 고른 원본을 가리키는 열쇠. 같은 사진을 두 번 고르는지 보는 데만 씀
  // 재인코딩하면 이름이 바뀌어 file 로는 같은 사진인지 알 수 없음
  sourceKey?: string;
  // 훅이 살아 있는 동안만 유효한 미리보기 URL
  previewUrl: string;
  width: number;
  height: number;
};

export type PhotoErrorCode = "invalid-type" | "too-large" | "decode-failed";

export class PhotoProcessError extends Error {
  readonly code: PhotoErrorCode;

  constructor(code: PhotoErrorCode, message: string) {
    super(message);
    this.name = "PhotoProcessError";
    this.code = code;
  }
}

export const PHOTO_ACCEPT = "image/*";

// 디코딩 전에 거절하는 원본 상한
export const MAX_SOURCE_BYTES = 25 * 1024 * 1024;

export type ProcessPhotoOptions = {
  // 긴 변 상한(px)
  maxEdge?: number;
  // JPEG 품질 0~1
  quality?: number;
};

const DEFAULT_OPTIONS: Required<ProcessPhotoOptions> = { maxEdge: 1600, quality: 0.85 };

// iOS 앨범의 HEIC 는 type 이 비어 오는 경우가 있어 확장자로 보조 판별
const HEIC_EXTENSION = /\.(heic|heif)$/i;

export function isImageFile(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  return file.type === "" && HEIC_EXTENSION.test(file.name);
}

export async function processPhotoFile(
  file: File,
  options?: ProcessPhotoOptions,
): Promise<PhotoItem> {
  // undefined 로 넘어온 옵션이 기본값을 덮지 않도록 개별 병합
  const maxEdge = options?.maxEdge ?? DEFAULT_OPTIONS.maxEdge;
  const quality = options?.quality ?? DEFAULT_OPTIONS.quality;

  if (!isImageFile(file)) {
    throw new PhotoProcessError("invalid-type", "이미지 파일만 올릴 수 있습니다");
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new PhotoProcessError("too-large", "25MB 이하의 사진만 올릴 수 있습니다");
  }

  const source = await decodeImage(file);
  try {
    const { width: sourceWidth, height: sourceHeight } = sizeOf(source);
    const { width, height } = fitWithin(sourceWidth, sourceHeight, maxEdge);
    const blob = await drawToJpeg(source, width, height, quality);
    const output = new File([blob], toJpegName(file.name), {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
    return {
      id: createId(),
      file: output,
      previewUrl: URL.createObjectURL(output),
      width,
      height,
    };
  } finally {
    if ("close" in source) source.close();
  }
}

export function revokePhotoPreview(item: PhotoItem): void {
  URL.revokeObjectURL(item.previewUrl);
}

export function describePhotoError(error: unknown): string {
  if (error instanceof PhotoProcessError) return error.message;
  return "사진을 처리하지 못했습니다. 다른 사진을 선택하세요";
}

type DecodedImage = ImageBitmap | HTMLImageElement;

async function decodeImage(file: File): Promise<DecodedImage> {
  // 회전 정보를 반영해 디코딩. 실패하면 img 요소로 폴백
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // 폴백 진행
    }
  }
  return decodeWithImageElement(file);
}

function decodeWithImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(
        new PhotoProcessError(
          "decode-failed",
          "사진을 읽을 수 없습니다. 다른 사진을 선택하거나 JPEG 로 저장해 다시 시도하세요",
        ),
      );
    };
    image.src = url;
  });
}

function sizeOf(source: DecodedImage): { width: number; height: number } {
  if (source instanceof HTMLImageElement) {
    return { width: source.naturalWidth, height: source.naturalHeight };
  }
  return { width: source.width, height: source.height };
}

export function fitWithin(
  width: number,
  height: number,
  maxEdge: number,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return { width, height };
  const scale = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function drawToJpeg(
  source: DecodedImage,
  width: number,
  height: number,
  quality: number,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new PhotoProcessError("decode-failed", "이 브라우저에서는 사진을 처리할 수 없습니다");
  }
  // 투명 PNG 의 알파 영역이 검게 남지 않도록 흰 배경 선채움
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(source, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new PhotoProcessError("decode-failed", "사진을 저장 형식으로 바꾸지 못했습니다"));
      },
      "image/jpeg",
      quality,
    );
  });
}

function toJpegName(name: string): string {
  const base = name.replace(/\.[^.]+$/, "").trim();
  return `${base || "photo"}.jpg`;
}

function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
