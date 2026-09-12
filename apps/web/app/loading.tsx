import { VStack } from "@seed-design/react";
import { ProgressCircle } from "seed-design/ui/progress-circle";

import { Screen } from "@/components/ui/screen";

// 화면이 서버에서 그려지는 동안 대신 서 있는 자리
// 루트에 하나만 두어 모든 경로가 물려받음. 화면마다 같은 파일을 만들지 않음

// 앱바를 세우지 않는 이유는 여기서는 어느 화면으로 가는지 알 수 없기 때문
// 제목을 지어내면 도착하는 순간 글자가 바뀌고, 빈 앱바는 그 자리만 덜컥임
// 가운데 표시 하나만 두면 어느 화면에 붙어도 어긋나지 않음

export default function Loading() {
  return (
    <Screen>
      {/* 글자는 두지 않음. 한두 번 깜박이고 사라질 자리라 읽을 틈이 없음 */}
      <VStack grow={1} align="center" justify="center" aria-busy>
        <ProgressCircle size="24" tone="neutral" />
      </VStack>
    </Screen>
  );
}
