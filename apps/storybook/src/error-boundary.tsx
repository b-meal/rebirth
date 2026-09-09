import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { name: string; children: ReactNode };
type State = { failed: boolean; message: string };

// 단독 렌더가 불가한 컴포넌트를 카탈로그 전체 중단 없이 표시
export class RenderProbe extends Component<Props, State> {
  state: State = { failed: false, message: "" };

  static getDerivedStateFromError(error: Error): State {
    return { failed: true, message: error.message };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // 콘솔 소음을 줄이기 위해 의도적으로 비움
  }

  render() {
    if (this.state.failed) {
      return (
        <div
          style={{
            padding: "8px 10px",
            borderRadius: "6px",
            border: "1px dashed rgba(0,0,0,0.2)",
            fontSize: "12px",
            color: "rgba(0,0,0,0.55)",
          }}
        >
          부모 컨텍스트 또는 필수 prop 필요
          <div style={{ fontSize: "11px", marginTop: "2px" }}>
            {this.state.message.slice(0, 80)}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
