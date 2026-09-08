import type { Meta, StoryObj } from "@storybook/react-vite";
import * as WDS from "@wanteddev/wds";
import { RenderProbe } from "./error-boundary";

// 컴포넌트가 아닌 export 는 카탈로그 대상 아님
const NOT_COMPONENTS = new Set([
  "ThemeProvider",
  "CacheProvider",
  "ClassNames",
  "Global",
  "ForceTheme",
  "RegionConfig",
  "NoSsr",
  "Portal",
  "Slot",
  "Slottable",
  "RemoveScroll",
  "FocusScope",
  "DismissableLayer",
  "AnimationPresence",
  "WithInteraction",
  "DateType",
  "DateRangeType",
  "FramedStyleParams",
]);

type AnyComponent = (props: Record<string, unknown>) => unknown;

const entries = Object.entries(WDS as Record<string, unknown>)
  .filter(([name, value]) => {
    if (NOT_COMPONENTS.has(name)) return false;
    if (!/^[A-Z]/.test(name)) return false;
    return typeof value === "function" || typeof value === "object";
  })
  .sort(([a], [b]) => a.localeCompare(b));

function Catalog() {
  return (
    <div style={{ display: "grid", gap: "16px" }}>
      <div style={{ fontSize: "13px", color: "rgba(0,0,0,0.6)" }}>
        @wanteddev/wds 3.12.0 · 카탈로그 대상 {entries.length}개
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: "12px",
        }}
      >
        {entries.map(([name, value]) => {
          const Component = value as AnyComponent;
          return (
            <div
              key={name}
              style={{
                border: "1px solid rgba(0,0,0,0.08)",
                borderRadius: "8px",
                padding: "12px",
                display: "grid",
                gap: "8px",
                minWidth: 0,
              }}
            >
              <code style={{ fontSize: "12px" }}>{name}</code>
              <RenderProbe name={name}>
                {/* 최소 children 만 넘겨 단독 렌더 가능 여부를 판별 */}
                {/* @ts-expect-error 카탈로그는 임의 컴포넌트를 동적으로 렌더 */}
                <Component>{name}</Component>
              </RenderProbe>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const meta = {
  title: "Montage/전체 카탈로그",
  component: Catalog,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Catalog>;

export default meta;

export const 전체: StoryObj<typeof meta> = {};
