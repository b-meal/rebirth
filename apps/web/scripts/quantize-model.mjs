// tfjs 그래프 모델의 float32 가중치를 정수로 줄임
// tfjs 로더가 weightSpecs 의 quantization 을 보고 읽을 때 되돌려 놓음
//
//   node quantize.mjs <원본 폴더> <결과 폴더> <uint8|uint16>

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const SRC = process.argv[2];
const OUT = process.argv[3];
const DTYPE = process.argv[4] ?? "uint8";
const LEVELS = DTYPE === "uint8" ? 255 : 65535;
const Typed = DTYPE === "uint8" ? Uint8Array : Uint16Array;

mkdirSync(OUT, { recursive: true });

const model = JSON.parse(readFileSync(join(SRC, "model.json"), "utf8"));
const source = Buffer.concat(
  model.weightsManifest.flatMap((group) => group.paths).map((p) => readFileSync(join(SRC, p))),
);

const chunks = [];
let offset = 0;
let kept = 0;

for (const group of model.weightsManifest) {
  for (const spec of group.weights) {
    const count = (spec.shape ?? []).reduce((a, b) => a * b, 1);
    const bytes = count * (spec.dtype === "float32" || spec.dtype === "int32" ? 4 : 1);
    const slice = source.subarray(offset, offset + bytes);
    offset += bytes;

    // 정수 가중치는 그대로 둠. 줄여도 이득이 없고 값이 깨짐
    if (spec.dtype !== "float32") {
      chunks.push(Buffer.from(slice));
      kept += bytes;
      continue;
    }

    const values = new Float32Array(slice.buffer, slice.byteOffset, count);
    let min = Infinity;
    let max = -Infinity;
    for (const value of values) {
      if (value < min) min = value;
      if (value > max) max = value;
    }
    // 값이 하나뿐인 텐서는 나눌 폭이 없어 배율을 1 로 두고 전부 0 으로 적음
    const scale = max > min ? (max - min) / LEVELS : 1;
    const packed = new Typed(count);
    for (let i = 0; i < count; i += 1) {
      packed[i] = Math.round((values[i] - min) / scale);
    }
    spec.quantization = { dtype: DTYPE, scale, min };
    chunks.push(Buffer.from(packed.buffer));
  }
}

const packed = Buffer.concat(chunks);
model.weightsManifest = [{ paths: ["weights.bin"], weights: model.weightsManifest.flatMap((g) => g.weights) }];

writeFileSync(join(OUT, "model.json"), JSON.stringify(model));
writeFileSync(join(OUT, "weights.bin"), packed);

const before = source.length;
const after = packed.length;
console.log(`${DTYPE}  ${(before / 1024 / 1024).toFixed(2)}MB → ${(after / 1024 / 1024).toFixed(2)}MB  (${(after / before * 100).toFixed(1)}%)`);
console.log(`  그대로 둔 정수 가중치 ${(kept / 1024).toFixed(0)}KB`);
