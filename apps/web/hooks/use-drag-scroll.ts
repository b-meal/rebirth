"use client";

import { useCallback, useRef, type DragEvent, type MouseEvent, type PointerEvent } from "react";

// 가로로 넘겨 보는 줄을 마우스로 끌어 옮기는 자리
// 손가락과 트랙패드는 브라우저가 밀어 주지만 마우스에는 가로로 굴릴 바퀴가 없음
// 끌고 손을 뗀 자리에 링크가 있으면 열리지 않아야 함

/** 끌기로 볼 최소 거리. 누를 때 손이 떨린 정도로 링크가 막히지 않게 함 */
const THRESHOLD = 4;

/** 가로줄에 그대로 펴 넣는 손잡이. 줄 자체가 스크롤 상자여야 함 */
export function useDragScroll<T extends HTMLElement>() {
  // 누른 지점과 그때의 스크롤 위치. 손을 떼면 비움
  const from = useRef<{ x: number; left: number } | null>(null);
  // 문턱을 넘겨 실제로 끌었는지. 뒤따라 오는 click 을 막을지 가름
  const moved = useRef(false);

  const onPointerDown = useCallback((event: PointerEvent<T>) => {
    // 손가락은 브라우저가 이미 밀어 줘 가로채면 오히려 뻑뻑해짐
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    from.current = { x: event.clientX, left: event.currentTarget.scrollLeft };
    moved.current = false;
  }, []);

  const onPointerMove = useCallback((event: PointerEvent<T>) => {
    const start = from.current;
    if (!start) return;
    const dx = event.clientX - start.x;
    if (!moved.current) {
      if (Math.abs(dx) < THRESHOLD) return;
      moved.current = true;
      // 줄 밖으로 벗어나도 끝까지 따라오게 함
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    event.currentTarget.scrollLeft = start.left - dx;
  }, []);

  const onPointerUp = useCallback((event: PointerEvent<T>) => {
    from.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  // click 은 pointerup 뒤에 오므로 여기서 한 번 삼켜 카드가 열리지 않게 함
  const onClickCapture = useCallback((event: MouseEvent<T>) => {
    if (!moved.current) return;
    moved.current = false;
    event.preventDefault();
    event.stopPropagation();
  }, []);

  // 사진을 잡아 끌면 브라우저가 이미지 끌어 놓기를 시작해 줄이 따라오지 않음
  const onDragStart = useCallback((event: DragEvent<T>) => {
    event.preventDefault();
  }, []);

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: onPointerUp,
    onClickCapture,
    onDragStart,
  };
}
