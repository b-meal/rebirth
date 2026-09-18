// 기기 선검사 모델을 평가 세트에 돌림. 양자화 전후를 같은 기준으로 비교할 때도 씀
//
//   pnpm --filter @rebirth/web eval:animal <표본 폴더> <모델 폴더> [<모델 폴더> ...]
//
// 표본 폴더는 packages/core 의 eval:precheck 와 같은 구조를 씀
//   <폴더>/animal/*      실제 제보 사진. 여기서 문턱 아래로 떨어지면 오거부
//   <폴더>/not-animal/*  오입력. 여기서 문턱 아래로 떨어져야 검출
//
// 오거부 0 을 유지하는 문턱 구간을 먼저 보고, 그 한가운데를
// lib/animal-model.ts 의 ANIMAL_THRESHOLD 로 둠

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, basename } from "node:path";
import * as tf from "@tensorflow/tfjs-core";
import "@tensorflow/tfjs-backend-cpu";
import { loadGraphModel } from "@tensorflow/tfjs-converter";
import sharp from "sharp";

const ROOT = process.argv[2];
const DIRS = process.argv.slice(3);
const ANIMAL_MAX_INDEX = 397;

// 자르는 자리와 집계는 lib/animal-model.ts 와 같아야 함. 한쪽만 고치면 평가가 배포본을 말하지 않음
const CROP_BOXES = [
  [0, 0, 1, 1],
  [0, 0, 0.5, 0.5],
  [0, 0.5, 0.5, 1],
  [0.5, 0, 1, 0.5],
  [0.5, 0.5, 1, 1],
];

await tf.setBackend("cpu");
await tf.ready();

const cases = [...list(join(ROOT, "animal"), true), ...list(join(ROOT, "not-animal"), false)];
const inputs = [];
for (const item of cases) inputs.push({ ...item, tensor: await toTensor(item.path) });
console.log(`표본 ${inputs.length}장 (동물 ${inputs.filter((i) => i.expected).length} / 그 외 ${inputs.filter((i) => !i.expected).length})\n`);

const runs = [];
for (const dir of DIRS) {
  const model = await loadFrom(dir);
  const scores = inputs.map((item) => ({
    name: item.name,
    expected: item.expected,
    score: score(model, item.tensor),
  }));
  runs.push({ dir, bytes: folderBytes(dir), scores });
  report(runs.at(-1));
  model.dispose();
}

// 양자화가 점수를 얼마나 흔들었는지. 안전 구간 폭과 견주어 보는 값
if (runs.length > 1) {
  const base = runs[0];
  console.log(`\n## ${basename(base.dir)} 대비 점수 차이`);
  for (const run of runs.slice(1)) {
    let max = 0;
    let where = "";
    let sum = 0;
    for (const [i, row] of run.scores.entries()) {
      const diff = Math.abs(row.score - base.scores[i].score);
      sum += diff;
      if (diff > max) { max = diff; where = row.name; }
    }
    console.log(`  ${basename(run.dir).padEnd(14)} 평균 ${(sum / run.scores.length).toExponential(2)}  최대 ${max.toExponential(2)}  (${where})`);
  }
}

for (const item of inputs) item.tensor.dispose();

function report(run) {
  const animals = run.scores.filter((s) => s.expected);
  const others = run.scores.filter((s) => !s.expected);
  const lowest = Math.min(...animals.map((s) => s.score));
  const passed = others.filter((s) => s.score < lowest);
  const highest = Math.max(...passed.map((s) => s.score), 0);
  console.log(`## ${basename(run.dir)}  ${(run.bytes / 1024 / 1024).toFixed(2)}MB`);
  console.log(`   오거부 0 유지 검출 ${passed.length}/${others.length} (${((passed.length / others.length) * 100).toFixed(1)}%)`);
  console.log(`   안전 구간 ${highest.toFixed(4)} ~ ${lowest.toFixed(4)}  (폭 ${(lowest - highest).toFixed(4)})`);
  const missed = others.filter((s) => s.score >= lowest);
  if (missed.length > 0) console.log(`   못 거른 것 ${missed.map((s) => s.name).join(", ")}`);
}

function centerSquare(width, height) {
  if (width > height) {
    const margin = (width - height) / 2 / width;
    return [0, margin, 1, 1 - margin];
  }
  const margin = (height - width) / 2 / height;
  return [margin, 0, 1 - margin, 1];
}

function score(model, pixels) {
  return tf.tidy(() => {
    const [height, width] = pixels.shape;
    const boxes = [...CROP_BOXES, centerSquare(width, height)];
    const normalized = tf.mul(tf.cast(tf.expandDims(pixels, 0), "float32"), 1 / 255);
    const patches = tf.image.cropAndResize(normalized, boxes, boxes.map(() => 0), [224, 224]);
    const probs = tf.softmax(tf.slice(model.predict(patches), [0, 1], [-1, 1000])).dataSync();
    let best = 0;
    for (let patch = 0; patch < boxes.length; patch += 1) {
      let sum = 0;
      const offset = patch * 1000;
      for (let i = 0; i <= ANIMAL_MAX_INDEX; i += 1) sum += probs[offset + i];
      if (sum > best) best = sum;
    }
    return best;
  });
}

async function loadFrom(dir) {
  const json = JSON.parse(readFileSync(join(dir, "model.json"), "utf8"));
  const data = Buffer.concat(json.weightsManifest.flatMap((g) => g.paths).map((p) => readFileSync(join(dir, p))));
  return loadGraphModel(
    tf.io.fromMemory({
      modelTopology: json.modelTopology,
      weightSpecs: json.weightsManifest.flatMap((g) => g.weights),
      weightData: data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
      format: json.format,
      generatedBy: json.generatedBy,
      convertedBy: json.convertedBy,
    }),
  );
}

function folderBytes(dir) {
  return readdirSync(dir).reduce((sum, name) => sum + statSync(join(dir, name)).size, 0);
}

async function toTensor(path) {
  const { data, info } = await sharp(path)
    .resize({ width: 384, height: 384, fit: "inside", withoutEnlargement: true })
    .removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return tf.tensor3d(new Uint8Array(data), [info.height, info.width, 3], "int32");
}

function list(dir, expected) {
  let names = [];
  try { names = readdirSync(dir); } catch { return []; }
  return names
    .filter((n) => /\.(jpe?g|png|webp)$/i.test(n))
    .map((n) => ({ path: join(dir, n), name: basename(n), expected }));
}
