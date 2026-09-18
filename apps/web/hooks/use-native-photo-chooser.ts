"use client";

import { useEffect, useState } from "react";

// 기기 파일 선택기가 촬영까지 함께 묻는 곳인지 가림
//
// iOS 와 안드로이드는 accept="image/*" 입력 하나를 열면
// 사진 보관함, 사진 찍기, 파일 선택 을 스스로 묻는다
// 그 앞에서 촬영이냐 앨범이냐를 먼저 물으면 같은 물음이 두 번 나오고
// 앨범을 고른 사람이 바로 다음 화면에서 사진 찍기 를 또 보게 된다
//
// 손가락으로 가리키는 기기인지로 가름. 화면 폭으로 보면 창을 줄인 데스크톱이 걸림

const COARSE = "(pointer: coarse)";

/** 서버는 가리키는 장치를 몰라 false 로 시작하고 마운트 뒤에만 확정함 */
export function useNativePhotoChooser(): boolean {
  const [native, setNative] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(COARSE);
    const sync = () => setNative(query.matches);
    sync();
    // 키보드를 붙였다 떼는 기기는 가리키는 방법이 도중에 바뀜
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  return native;
}
