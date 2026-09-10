// MapLibre 워커를 public 으로 복사, 번들러가 모듈 워커를 못 만들어 정적 파일로 넘김

import { createRequire } from "node:module";
import { copyFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const dist = path.join(path.dirname(require.resolve("maplibre-gl/package.json")), "dist");
const target = path.join(import.meta.dirname, "..", "public", "maplibre");

mkdirSync(target, { recursive: true });
for (const file of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  copyFileSync(path.join(dist, file), path.join(target, file));
}
process.stdout.write(`maplibre 워커를 ${path.relative(process.cwd(), target)} 로 복사했습니다\n`);
