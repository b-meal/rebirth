"use client";

import type { GraphModel } from "@tensorflow/tfjs-converter";
import type { Tensor, Tensor4D } from "@tensorflow/tfjs-core";

// 기기에서 동물 유무만 재는 모델
// 서버 선검사와 같은 판정을 네트워크 없이 함. 모델이 없거나 늦으면 null 을 돌려주고 부르는 쪽이 서버로 물러섬
//
// MobileNet v1 α0.50 224 를 uint16 으로 줄인 것
// 실제 제보 사진 81 장과 오입력 27 장에서 오거부 0, 오입력 검출 27/27
// 안전 구간은 0.2317~0.2553 이고 문턱은 그 한가운데에서 통과 쪽으로 조금 기울여 둠
// 잘못 거르면 제보하러 온 사람을 막고, 잘못 통과시키면 2 단계 초안 분석이 한 번 더 봄

const MODEL_URL = "/models/animal/model.json";

// 모델 입력 크기. 넣기 전에 여기로 줄임
const MODEL_EDGE = 224;

/** 이 값 미만이면 동물이 안 보이는 것으로 봄. 안전 구간 한가운데 */
export const ANIMAL_THRESHOLD = 0.24;

// ImageNet 1000 클래스 중 0~397 번이 동물. 398 번부터 사물
const ANIMAL_MAX_INDEX = 397;

// 한 장을 이 여섯 자리로 잘라 한 번에 넣고 가장 높은 점수를 씀. 값은 [y1, x1, y2, x2] 비율
// 전체 한 장만 보면 대야 속 강아지처럼 동물이 큰 사물에 담긴 사진에서 확률이 사물 쪽으로 쏠려
// 동물 구간 합이 문턱 아래로 무너짐. 조각을 따로 보면 동물만 든 조각이 제 점수를 냄
// 실측으로 이 사진들의 점수가 0.03~0.29 에서 0.80~0.99 로 올라가고 안전 구간은 25 배 넓어짐
const CROP_BOXES: readonly [number, number, number, number][] = [
  [0, 0, 1, 1],
  [0, 0, 0.5, 0.5],
  [0, 0.5, 0.5, 1],
  [0.5, 0, 1, 0.5],
  [0.5, 0.5, 1, 1],
];

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
    // 실제로 넣는 조각 수와 같은 배치로 돌려야 그 모양의 셰이더가 미리 만들어짐
    tf.tidy(() => {
      const batch = CROP_BOXES.length + 1;
      (model.predict(tf.zeros([batch, MODEL_EDGE, MODEL_EDGE, 3])) as Tensor).dataSync();
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

/** 긴 쪽을 잘라 만든 가운데 정사각형. 세로로 긴 폰 사진이 눌려 찌그러지는 것을 덜어 냄 */
function centerSquare(width: number, height: number): [number, number, number, number] {
  if (width > height) {
    const margin = (width - height) / 2 / width;
    return [0, margin, 1, 1 - margin];
  }
  const margin = (height - width) / 2 / height;
  return [margin, 0, 1 - margin, 1];
}

/**
 * 사진의 동물 점수를 잼. 0~1 이고 클수록 동물이 보인다는 뜻
 * 여섯 조각을 한 배치로 넣어 그중 가장 높은 값을 돌려줌
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
    const boxes = [...CROP_BOXES, centerSquare(bitmap.width, bitmap.height)];
    const pixels = tf.browser.fromPixels(bitmap);
    try {
      return tf.tidy(() => {
        // TFHub 의 MobileNet 은 입력 범위가 [0,1]. [-1,1] 로 넣으면 점수가 0.08 까지 어긋남
        const normalized = tf.mul<Tensor4D>(
          tf.cast(tf.expandDims(pixels, 0), "float32"),
          1 / 255,
        );
        // 조각마다 따로 돌리면 왕복이 여섯 번이라 한 배치로 묶어 한 번만 부름
        const patches = tf.image.cropAndResize(
          normalized,
          boxes,
          boxes.map(() => 0),
          [MODEL_EDGE, MODEL_EDGE],
        );
        // 첫 칸은 배경 잡음이라 떼고 1000 개만 씀
        const logits = tf.slice(model.predict(patches) as Tensor, [0, 1], [-1, 1000]);
        const probs = tf.softmax(logits).dataSync();

        let best = 0;
        for (let patch = 0; patch < boxes.length; patch += 1) {
          let animal = 0;
          const offset = patch * 1000;
          for (let i = 0; i <= ANIMAL_MAX_INDEX; i += 1) animal += probs[offset + i];
          if (animal > best) best = animal;
        }
        return best;
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
