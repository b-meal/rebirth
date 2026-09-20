"use client";

import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import { animate, useDragControls, useMotionValue, useReducedMotion, useTransform } from "motion/react";

// 바닥에 붙은 시트를 끌어 단계에 붙이는 손잡이
// 자리는 MotionValue 하나가 쥐고 있어 끄는 동안 React 는 다시 그리지 않고 합성만 일어남
// 상태로 남는 것은 손을 뗀 뒤 붙은 단계뿐이고 글자와 aria 가 그 값을 읽음

/** 이보다 빠르게 뗐으면 끈 거리와 상관없이 튕긴 방향으로 한 단계 넘김, px/s */
const FLICK_VELOCITY = 400;

/**
 * 걷은 단계에서 시트 대신 뜨는 알약이 앉을 자리, 떠 있는 단추는 이만큼 덜 내려감
 * 탭바 위 여백(x16 + x7)에 알약 높이와 단추 사이 간격을 더한 값
 */
const PILL_ROOM_PX = 128;

const SPRING = { type: "spring", stiffness: 420, damping: 44 } as const;

type SheetSnapOptions = {
  /** 손을 떼면 붙는 단계들, 화면 높이에 대한 시트 노출 비율이고 오름차순 */
  stops: readonly number[];
  /** 쉬는 단계. 이 자리를 0 으로 두어 스크립트가 돌기 전 첫 화면이 그대로 맞음 */
  rest: number;
  /** 끌어올릴 수 있는 천장, 시트 요소의 실제 높이이기도 함 */
  ceiling: number;
};

export function useSheetSnap({ stops, rest, ceiling }: SheetSnapOptions) {
  const [viewport, setViewport] = useState(0);
  const [stop, setStop] = useState(rest);

  // 쉬는 단계에서 0, 끌어올리면 음수, 걷으면 양수인 px
  const y = useMotionValue(0);
  const dragControls = useDragControls();
  const reduceMotion = useReducedMotion();

  // 끈 뒤에 따라오는 click 은 탭이 아니므로 한 번 걸러냄
  const dragged = useRef(false);

  // 튕김은 끈 거리가 아니라 잡기 전 단계를 기준으로 한 단계씩 넘김
  const grabbed = useRef(rest);

  useEffect(() => {
    const read = () => setViewport(window.innerHeight);
    read();
    window.addEventListener("resize", read);
    return () => {
      window.removeEventListener("resize", read);
    };
  }, []);

  // 화면이 바뀌면 같은 단계라도 px 이 달라져 자리를 다시 잡음
  // 단계만 바뀐 때는 건너뛰어야 붙는 애니메이션을 시작하자마자 끊지 않음
  const lastViewport = useRef(0);
  useEffect(() => {
    if (lastViewport.current === viewport) return;
    lastViewport.current = viewport;
    y.set((rest - stop) * viewport);
  }, [y, rest, stop, viewport]);

  const offsetOf = (value: number) => (rest - value) * viewport;

  const snapTo = (next: number, velocity = 0) => {
    setStop(next);
    animate(y, offsetOf(next), reduceMotion ? { duration: 0 } : { ...SPRING, velocity });
  };

  // 한 단계 위나 아래로, 끝에서는 더 가지 않음
  const step = (direction: 1 | -1) => {
    const at = stops.indexOf(stop);
    const index = Math.min(stops.length - 1, Math.max(0, (at < 0 ? 0 : at) + direction));
    snapTo(stops[index]);
  };

  const dragProps = {
    drag: "y" as const,
    dragControls,
    // 손잡이에서만 시작하고 시트 본문은 탭과 스크롤을 그대로 받음
    dragListener: false,
    dragConstraints: { top: offsetOf(ceiling), bottom: offsetOf(stops[0]) },
    dragElastic: 0.03,
    // 관성은 단계에 붙이는 쪽에서 속도까지 넘겨 직접 씀
    dragMomentum: false,
    onDragStart: () => {
      dragged.current = true;
      grabbed.current = stop;
    },
    onDragEnd: (_event: unknown, info: { velocity: { y: number } }) => {
      const velocity = info.velocity.y;
      // 튕겼으면 잡기 전 단계에서 그 방향으로 한 단계, 조금만 옮겼어도 넘어감
      if (Math.abs(velocity) > FLICK_VELOCITY) {
        const at = stops.indexOf(grabbed.current);
        const next = Math.min(
          stops.length - 1,
          Math.max(0, (at < 0 ? 0 : at) + (velocity > 0 ? -1 : 1)),
        );
        snapTo(stops[next], velocity);
        return;
      }
      // 천천히 놓았으면 손을 뗀 자리에서 가장 가까운 단계에 둠
      const at = y.get();
      const nearest = stops.reduce((best, candidate) =>
        Math.abs(offsetOf(candidate) - at) < Math.abs(offsetOf(best) - at) ? candidate : best,
      );
      snapTo(nearest, velocity);
    },
  };

  // 떠 있는 단추는 시트를 따라 내려오다 알약 자리에서 멈춤
  const followLimit = viewport === 0 ? null : offsetOf(stops[0]) - PILL_ROOM_PX;
  const followY = useTransform(y, (value) =>
    followLimit === null ? value : Math.min(value, followLimit),
  );

  /**
   * 시트 안 스크롤 상자의 손짓 넘김
   * 시트가 끝까지 열리지 않았으면 목록을 어느 쪽으로 끌어도 시트가 움직이고
   * 끝까지 열린 뒤에는 목록이 스크롤되되 맨 위에서 아래로 끌면 시트가 접힘
   * 첫 움직임에서 둘 중 하나를 정하고, 시트 쪽이면 touchmove 를 막아 브라우저가 스크롤을 가져가지 않게 함
   * React 의 touch 리스너는 passive 라 막을 수 없어 요소에 직접 붙임
   */
  const [content, setContent] = useState<HTMLElement | null>(null);
  // 터치 리스너가 최신 단계를 읽는 자리. 렌더 중에는 ref 를 만지지 않음
  const stopRef = useRef(stop);
  useEffect(() => {
    stopRef.current = stop;
  }, [stop]);
  const topStop = stops[stops.length - 1];
  useEffect(() => {
    if (!content) return;
    let lastPointer: PointerEvent | null = null;
    let gesture: { startY: number; mode: "idle" | "sheet" | "scroll" } | null = null;

    // 포인터 이벤트가 같은 터치보다 먼저 오므로 touchmove 시점에는 직전 포인터를 갖고 있음
    const remember = (event: PointerEvent) => {
      lastPointer = event;
    };
    const onTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch || event.touches.length > 1) return;
      gesture = { startY: touch.clientY, mode: "idle" };
    };
    const onTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!gesture || !touch) return;
      if (gesture.mode === "idle") {
        const dy = touch.clientY - gesture.startY;
        // 몇 px 은 손이 떨린 것으로 보고 방향이 드러날 때까지 기다림
        if (Math.abs(dy) < 6) return;
        const open = stopRef.current === topStop;
        const atTop = content.scrollTop <= 0;
        if (!open || (dy > 0 && atTop)) {
          gesture.mode = "sheet";
          if (lastPointer) {
            dragged.current = true;
            dragControls.start(lastPointer);
          }
        } else {
          gesture.mode = "scroll";
        }
      }
      if (gesture.mode === "sheet" && event.cancelable) event.preventDefault();
    };
    const onTouchEnd = () => {
      gesture = null;
    };

    content.addEventListener("pointerdown", remember);
    content.addEventListener("pointermove", remember);
    content.addEventListener("touchstart", onTouchStart, { passive: true });
    content.addEventListener("touchmove", onTouchMove, { passive: false });
    content.addEventListener("touchend", onTouchEnd);
    content.addEventListener("touchcancel", onTouchEnd);
    return () => {
      content.removeEventListener("pointerdown", remember);
      content.removeEventListener("pointermove", remember);
      content.removeEventListener("touchstart", onTouchStart);
      content.removeEventListener("touchmove", onTouchMove);
      content.removeEventListener("touchend", onTouchEnd);
      content.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [content, dragControls, topStop]);

  /**
   * 시트 요소 자체에 얹는 끌기 면. 제목 줄, 타일, 여백 어디를 잡아도 시트가 따라옴
   * touch-action none 이 없으면 브라우저가 같은 손짓을 문서 스크롤로 받아 iOS 에서 페이지가 고무줄처럼 늘어남
   * 스크롤 상자 안은 위의 손짓 넘김이 첫 움직임을 보고 정하고, 손잡이는 제 핸들러가 시작하므로 여기서 잡지 않음
   */
  const sheetProps = {
    onPointerDown: (event: ReactPointerEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (content && target && content.contains(target)) return;
      if (target?.closest("[data-sheet-handle]")) return;
      dragged.current = false;
      dragControls.start(event);
    },
    style: { touchAction: "none" } as const,
  };

  const handleProps = {
    "data-sheet-handle": "",
    onPointerDown: (event: ReactPointerEvent) => {
      dragged.current = false;
      dragControls.start(event);
    },
    // 탭과 Enter, Space 가 같은 길로 들어와 손가락과 키보드가 같은 동작을 함
    onClick: () => {
      if (dragged.current) return;
      const at = stops.indexOf(stop);
      snapTo(at === stops.length - 1 ? rest : stops[Math.max(0, at) + 1]);
    },
    onKeyDown: (event: ReactKeyboardEvent) => {
      if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
      event.preventDefault();
      step(event.key === "ArrowUp" ? 1 : -1);
    },
    style: { touchAction: "none", cursor: "grab" } as const,
  };

  return {
    y,
    followY,
    stop,
    viewport,
    snapTo,
    dragProps,
    sheetProps,
    handleProps,
    /** 시트 안 스크롤 상자에 넘겨 손짓 넘김을 붙이는 ref */
    contentRef: setContent,
  };
}
