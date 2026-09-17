// design-system-allow:color satori 가 CSS 변수를 풀지 못해 스플래시와 같은 고정값 사용

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// 첫 화면 공유 카드, 제보 상세와 달리 사진 없이 서비스만 알림

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "다시집, 길에서 만난 보호자 없는 동물을 사진 한 장으로 제보합니다";

export default async function OpengraphImage() {
  const logo = await readFile(join(process.cwd(), "public/logo/logo-house.png"));

  return new ImageResponse(
    (
      <div
        style={{
          width: size.width,
          height: size.height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 64,
          background: "#ffffff",
          color: "#14311f",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`data:image/png;base64,${logo.toString("base64")}`}
          width={300}
          height={300}
          alt=""
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 88, fontWeight: 700, letterSpacing: -2 }}>다시집</div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              fontSize: 36,
              opacity: 0.68,
            }}
          >
            <div>길에서 만난 보호자 없는 동물을</div>
            <div>사진 한 장으로 제보합니다</div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
