import clsx from "clsx";
import type { CSSProperties } from "react";

import styles from "./skeleton.module.css";

// 값이 오는 동안 같은 자리를 채워 두는 뼈대
// SEED 레지스트리에 없어 앱 안에 두고 색과 모서리는 토큰에서만 가져옴
// 읽을 것이 없는 장식이라 스스로 알리지 않음. 무엇을 기다리는지는 감싸는 쪽이 말함

export type SkeletonProps = {
  /** 채울 폭. 들어올 글자만큼 주면 값이 와도 줄이 들썩이지 않음 */
  width?: string;
  /** 줄 높이. 기본값은 t3 한 줄, 다른 크기의 글자를 덮을 때만 줌 */
  height?: string;
  className?: string;
};

export function Skeleton({ width, height, className }: SkeletonProps) {
  return (
    <span
      aria-hidden
      className={clsx(styles.bar, className)}
      style={
        {
          "--skeleton-width": width,
          "--skeleton-height": height,
        } as CSSProperties
      }
    />
  );
}
