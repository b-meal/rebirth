import path from "node:path";
import type { StorybookConfig } from "@storybook/react-vite";
import type { PluginOption } from "vite";

// 루트 .env.local 을 스토리북 프로세스에 올림. Vite 는 NEXT_PUBLIC_ 접두사를 모름
try {
  process.loadEnvFile(path.resolve(process.cwd(), "../../.env.local"));
} catch {
  // 키가 없으면 컴포넌트가 지도를 접고 검색만 남김
}

const WEB_ORIGIN = process.env.STORYBOOK_WEB_ORIGIN ?? "http://localhost:3000";

// Storybook 은 Vite 를 middleware 모드로 띄워 server.proxy 가 무시됨. 미들웨어로 직접 넘김
function webApiProxy(): PluginOption {
  return {
    name: "rebirth-web-api-proxy",
    configureServer(server) {
      server.middlewares.use("/api", async (request, response) => {
        const target = `${WEB_ORIGIN}/api${request.url ?? ""}`;
        try {
          const upstream = await fetch(target, {
            method: request.method,
            headers: { "content-type": request.headers["content-type"] ?? "application/json" },
            body: await readBody(request),
          });
          const text = await upstream.text();
          response.statusCode = upstream.status;
          response.setHeader(
            "content-type",
            upstream.headers.get("content-type") ?? "application/json",
          );
          response.end(text);
        } catch {
          // web dev 서버가 꺼져 있으면 컴포넌트의 실패 문구로 흐름
          response.statusCode = 502;
          response.setHeader("content-type", "application/json");
          response.end(
            JSON.stringify({
              message: `위치 API 를 부르지 못했습니다. ${WEB_ORIGIN} 에서 web 을 띄워 주십시오`,
            }),
          );
        }
      });
    },
  };
}

async function readBody(request: {
  method?: string;
  on: (event: string, handler: (chunk?: Buffer) => void) => void;
}): Promise<Buffer | undefined> {
  if (request.method === "GET" || request.method === "HEAD") return undefined;
  const chunks: Buffer[] = [];
  await new Promise<void>((resolve) => {
    request.on("data", (chunk) => {
      if (chunk) chunks.push(chunk);
    });
    request.on("end", () => resolve());
  });
  return chunks.length > 0 ? Buffer.concat(chunks) : undefined;
}

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  framework: { name: "@storybook/react-vite", options: {} },
  addons: [],
  viteFinal: async (config) => {
    config.plugins = [...(config.plugins ?? []), webApiProxy()];
    config.define = {
      ...config.define,
      // Next 전용 접두사라 Vite 가 자동으로 넣어 주지 않음
      "process.env.NEXT_PUBLIC_KAKAO_JS_KEY": JSON.stringify(
        process.env.NEXT_PUBLIC_KAKAO_JS_KEY ?? "",
      ),
    };
    return config;
  },
};

export default config;
