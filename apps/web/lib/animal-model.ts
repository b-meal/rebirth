"use client";

import type { GraphModel } from "@tensorflow/tfjs-converter";
import type { Tensor, Tensor3D } from "@tensorflow/tfjs-core";

// 기기에서 동물 유무만 재는 모델
// 서버 선검사와 같은 판정을 네트워크 없이 함. 모델이 없거나 늦으면 null 을 돌려주고 부르는 쪽이 서버로 물러섬
//
// MobileNet v1 α0.50 224 를 uint16 으로 줄인 것
// 표본 58장에서 오거부 0, 오입력 검출 20/21. 안전 구간은 0.322~0.379

const MODEL_URL = "/models/animal/model.json";

// 모델 입력 크기. 넣기 전에 여기로 줄임
const MODEL_EDGE = 224;

/** 이 값 미만이면 동물이 안 보이는 것으로 봄. 안전 구간 한가운데 */
export const ANIMAL_THRESHOLD = 0.35;

// ImageNet 1000 클래스 중 0~397 번이 동물. 398 번부터 사물
const ANIMAL_MAX_INDEX = 397;

type Runtime = {
  tf: typeof import("@tensorflow/tfjs-core");
  model: GraphModel;
};

let pending: Promise<Runtime | null> | null = null;

async function start(): Promise<Runtime | null> {
  try {
    const [tf, converter] = await Promise.all([
      import("@tensorflow/tfjs-core"),
      import("@tensorflow/tfjs-converter"),
      import("@tensorflow/tfjs-backend-webgl"),
    ]);

    // CPU 커널은 넣지 않음. WebGL 이 없는 기기는 서버 선검사가 그대로 받음
    await tf.setBackend("webgl");
    await tf.ready();

    const model = await converter.loadGraphModel(MODEL_URL);
    // 첫 추론은 셰이더를 컴파일하느라 느려 미리 한 번 돌려 둠
    tf.tidy(() => {
      (model.predict(tf.zeros([1, MODEL_EDGE, MODEL_EDGE, 3])) as Tensor).dataSync();
    });
    return { tf, model };
  } catch {
    // 내려받기 실패, WebGL 없음, 메모리 부족이 모두 여기로 옴
    return null;
  }
}

/** 모델을 미리 받아 둠. 사진을 고르기 전에 불러 두면 판정이 기다림 없이 끝남 */
export function warmAnimalModel(): void {
  pending ??= start();
}

function ready(waitMs: number): Promise<Runtime | null> {
  warmAnimalModel();
  if (waitMs <= 0) return Promise.resolve(null);
  return Promise.race([
    pending as Promise<Runtime | null>,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), waitMs)),
  ]);
}

/**
 * 사진의 동물 점수를 잼. 0~1 이고 클수록 동물이 보인다는 뜻
 * 모델이 waitMs 안에 준비되지 않거나 판정에 실패하면 null
 */
export async function scoreAnimal(
  source: Blob,
  { waitMs = 0 }: { waitMs?: number } = {},
): Promise<number | null> {
  const runtime = await ready(waitMs);
  if (!runtime) return null;

  const { tf, model } = runtime;
  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(source);
    const pixels = tf.browser.fromPixels(bitmap);
    try {
      return tf.tidy(() => {
        // TFHub 의 MobileNet 은 입력 범위가 [0,1]. [-1,1] 로 넣으면 점수가 0.08 까지 어긋남
        const normalized = tf.mul<Tensor3D>(tf.cast(pixels, "float32"), 1 / 255);
        const resized = tf.image.resizeBilinear(normalized, [MODEL_EDGE, MODEL_EDGE], true);
        const batched = tf.reshape(resized, [-1, MODEL_EDGE, MODEL_EDGE, 3]);
        // 첫 칸은 배경 잡음이라 떼고 1000 개만 씀
        const logits = tf.slice(model.predict(batched) as Tensor, [0, 1], [-1, 1000]);
        const probs = tf.softmax(logits).dataSync();
        let animal = 0;
        for (let i = 0; i <= ANIMAL_MAX_INDEX; i += 1) animal += probs[i];
        return animal;
      });
    } finally {
      pixels.dispose();
    }
  } catch {
    return null;
  } finally {
    bitmap?.close();
  }
}
