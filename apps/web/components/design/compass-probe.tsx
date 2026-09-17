"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Box, HStack, Text, VStack } from "@seed-design/react";
import { ActionButton } from "seed-design/ui/action-button";

// 폰에서 나침반이 왜 안 뜨는지 눈으로 보는 자리
// 브라우저가 무엇을 주는지 그대로 적음, 화살을 감추는 판단은 여기서 하지 않음

type Reading = {
  count: number;
  absolute: boolean | null;
  alpha: number | null;
  webkitHeading: number | null;
  webkitAccuracy: number | null;
};

type CompassEvent = DeviceOrientationEvent & {
  webkitCompassHeading?: number;
  webkitCompassAccuracy?: number;
};

// 이벤트 대신 쓰는 최신 경로. 실패하면 이유를 말해 줘 무엇이 막혔는지 알 수 있음
type OrientationSensor = {
  quaternion: number[] | null;
  start: () => void;
  stop: () => void;
  addEventListener: (type: string, handler: (event: { error?: DOMException }) => void) => void;
};

type SensorCtor = new (options?: { frequency?: number }) => OrientationSensor;

const SENSOR_PERMISSIONS = ["accelerometer", "gyroscope", "magnetometer"] as const;

/** 쿼터니언에서 북쪽 기준 시계 방향 각도, 이벤트의 alpha 와 같은 값이 나옴 */
function headingOf(quaternion: number[]): number {
  const [x, y, z, w] = quaternion;
  const yaw = Math.atan2(2 * (w * z + x * y), 1 - 2 * (y * y + z * z));
  const alpha = ((yaw * 180) / Math.PI + 360) % 360;
  return (360 - alpha) % 360;
}

const EMPTY: Reading = {
  count: 0,
  absolute: null,
  alpha: null,
  webkitHeading: null,
  webkitAccuracy: null,
};

const TYPES = ["deviceorientationabsolute", "deviceorientation"] as const;

function round(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "없음";
  return value.toFixed(1);
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <HStack justify="space-between" gap="x4" align="flex-start">
      <Text textStyle="t3Regular" color="fg.neutralMuted">
        {label}
      </Text>
      <Text textStyle="t3Bold" color="fg.neutral">
        {value}
      </Text>
    </HStack>
  );
}

export function CompassProbe() {
  const [env, setEnv] = useState<string[]>([]);
  const [readings, setReadings] = useState<Record<string, Reading>>({});
  const [permission, setPermission] = useState("아직 묻지 않음");
  const [sensor, setSensor] = useState("아직 켜지 않음");
  const [course, setCourse] = useState("아직 없음");
  const watching = useRef(0);

  useEffect(() => {
    const api = DeviceOrientationEvent as unknown as { requestPermission?: unknown };
    // 서버에서는 알 수 없는 값이라 마운트 뒤에 한 번 채움
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEnv([
      `보안 컨텍스트 ${window.isSecureContext ? "예" : "아니오"}`,
      `주소 ${window.location.protocol}//${window.location.host}`,
      `손에 드는 기기 ${window.matchMedia("(pointer: coarse)").matches ? "예" : "아니오"}`,
      `방향 이벤트 ${typeof DeviceOrientationEvent === "undefined" ? "없음" : "있음"}`,
      `허락 물어보기 ${typeof api.requestPermission === "function" ? "필요" : "필요 없음"}`,
      `절대 방향 이벤트 ${"ondeviceorientationabsolute" in window ? "있음" : "없음"}`,
    ]);
  }, []);

  // 값을 그대로 적기만 함, 판단이 섞이면 무엇이 문제인지 알 수 없음
  useEffect(() => {
    const handle = (event: Event) => {
      const orientation = event as CompassEvent;
      setReadings((prev) => ({
        ...prev,
        [event.type]: {
          count: (prev[event.type]?.count ?? 0) + 1,
          absolute: orientation.absolute ?? null,
          alpha: orientation.alpha ?? null,
          webkitHeading: orientation.webkitCompassHeading ?? null,
          webkitAccuracy: orientation.webkitCompassAccuracy ?? null,
        },
      }));
    };
    for (const type of TYPES) window.addEventListener(type, handle);
    return () => {
      for (const type of TYPES) window.removeEventListener(type, handle);
    };
  }, []);

  const ask = useCallback(() => {
    const api = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<string>;
    };
    if (typeof api.requestPermission !== "function") {
      setPermission("물어볼 필요 없는 브라우저");
      return;
    }
    api
      .requestPermission()
      .then((state) => setPermission(state))
      .catch((error: Error) => setPermission(`실패 ${error.name}`));
  }, []);

  const sensorRef = useRef<OrientationSensor | null>(null);
  const startSensor = useCallback(async () => {
    const Ctor = (window as unknown as { AbsoluteOrientationSensor?: SensorCtor })
      .AbsoluteOrientationSensor;
    if (!Ctor) {
      setSensor("이 브라우저에는 없음");
      return;
    }
    const states = await Promise.all(
      SENSOR_PERMISSIONS.map((name) =>
        navigator.permissions
          .query({ name: name as PermissionName })
          .then((permission) => `${name} ${permission.state}`)
          .catch(() => `${name} 모름`),
      ),
    );
    const instance = new Ctor({ frequency: 20 });
    sensorRef.current = instance;
    instance.addEventListener("error", (event) =>
      setSensor(`${event.error?.name ?? "오류"} · ${states.join(" · ")}`),
    );
    instance.addEventListener("reading", () => {
      const quaternion = instance.quaternion;
      if (!quaternion) return;
      setSensor(`방향 ${headingOf(quaternion).toFixed(1)} · ${states.join(" · ")}`);
    });
    instance.start();
  }, []);

  useEffect(
    () => () => {
      sensorRef.current?.stop();
    },
    [],
  );

  const follow = useCallback(() => {
    if (watching.current || !navigator.geolocation) return;
    watching.current = navigator.geolocation.watchPosition(
      ({ coords }) =>
        setCourse(`진행 방향 ${round(coords.heading)} · 속도 ${round(coords.speed)}m/s`),
      (error) => setCourse(`실패 ${error.message}`),
      { enableHighAccuracy: true, maximumAge: 1000 },
    );
  }, []);

  useEffect(
    () => () => {
      if (watching.current) navigator.geolocation.clearWatch(watching.current);
    },
    [],
  );

  return (
    <VStack px="spacingX.globalGutter" py="x6" gap="x5" align="stretch">
      <Text textStyle="t7Bold" color="fg.neutral">
        나침반 진단
      </Text>

      <VStack gap="x2" align="stretch">
        <Text textStyle="t5Bold" color="fg.neutral">
          환경
        </Text>
        {env.map((line) => (
          <Text key={line} textStyle="t3Regular" color="fg.neutralMuted">
            {line}
          </Text>
        ))}
      </VStack>

      <VStack gap="x2" align="stretch">
        <Text textStyle="t5Bold" color="fg.neutral">
          허락
        </Text>
        <Row label="결과" value={permission} />
        <ActionButton onClick={ask}>나침반 허락 묻기</ActionButton>
      </VStack>

      {TYPES.map((type) => {
        const reading = readings[type] ?? EMPTY;
        return (
          <VStack key={type} gap="x2" align="stretch">
            <Text textStyle="t5Bold" color="fg.neutral">
              {type}
            </Text>
            <Box bg="bg.neutralWeak" borderRadius="r3" p="x4">
              <VStack gap="x1" align="stretch">
                <Row label="받은 횟수" value={`${reading.count}`} />
                <Row
                  label="absolute"
                  value={reading.absolute === null ? "없음" : reading.absolute ? "true" : "false"}
                />
                <Row label="alpha" value={round(reading.alpha)} />
                <Row label="webkitCompassHeading" value={round(reading.webkitHeading)} />
                <Row label="webkitCompassAccuracy" value={round(reading.webkitAccuracy)} />
              </VStack>
            </Box>
          </VStack>
        );
      })}

      <VStack gap="x2" align="stretch">
        <Text textStyle="t5Bold" color="fg.neutral">
          AbsoluteOrientationSensor
        </Text>
        <Row label="결과" value={sensor} />
        <ActionButton variant="neutralWeak" onClick={() => void startSensor()}>
          센서로 읽어 보기
        </ActionButton>
      </VStack>

      <VStack gap="x2" align="stretch">
        <Text textStyle="t5Bold" color="fg.neutral">
          위치가 주는 진행 방향
        </Text>
        <Row label="값" value={course} />
        <ActionButton variant="neutralWeak" onClick={follow}>
          위치 따라가기
        </ActionButton>
      </VStack>
    </VStack>
  );
}
