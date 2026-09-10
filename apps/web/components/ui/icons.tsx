import type { ReactNode, SVGProps } from "react";

// 24 그리드 stroke 2 의 자체 아이콘 세트, currentColor 로 그려 버튼 색을 그대로 따름

export type IconProps = Omit<SVGProps<SVGSVGElement>, "name"> & { size?: number | string };

type Glyph = { node: ReactNode; filled?: boolean };

const GLYPHS = {
  // 내비게이션
  back: { node: <path d="m15 5-7 7 7 7" /> },
  forward: { node: <path d="m9 5 7 7-7 7" /> },
  chevronDown: { node: <path d="m5 9 7 7 7-7" /> },
  chevronUp: { node: <path d="m5 15 7-7 7 7" /> },
  arrowLeft: { node: <path d="M19 12H5m7-7-7 7 7 7" /> },
  arrowRight: { node: <path d="M5 12h14m-7-7 7 7-7 7" /> },
  arrowUp: { node: <path d="M12 19V5m-7 7 7-7 7 7" /> },
  close: { node: <path d="M6 6l12 12M18 6L6 18" /> },
  menu: { node: <path d="M4 7h16M4 12h16M4 17h16" /> },
  more: { node: <><circle cx="5" cy="12" r="1.2" /><circle cx="12" cy="12" r="1.2" /><circle cx="19" cy="12" r="1.2" /></>, filled: true },
  moreVertical: { node: <><circle cx="12" cy="5" r="1.2" /><circle cx="12" cy="12" r="1.2" /><circle cx="12" cy="19" r="1.2" /></>, filled: true },
  home: { node: <><path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" /></> },
  list: { node: <path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" /> },
  grid: { node: <><rect x="4" y="4" width="6.5" height="6.5" rx="1.5" /><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" /><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" /><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" /></> },
  search: { node: <><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.3-4.3" /></> },
  filter: { node: <path d="M4 6h16M7 12h10m-7 6h4" /> },
  sliders: { node: <><path d="M5 20v-6M5 10V4M12 20v-9M12 7V4M19 20v-4m0-4V4" /><path d="M3 14h4M10 11h4M17 16h4" /></> },
  settings: { node: <><circle cx="12" cy="12" r="3" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" /></> },
  externalLink: { node: <><path d="M14 4h6v6" /><path d="M20 4 11 13" /><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" /></> },
  link: { node: <><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></> },
  // 상태와 알림
  check: { node: <path d="m5 12 5 5L20 7" /> },
  checkCircle: { node: <><circle cx="12" cy="12" r="9" /><path d="m8.5 12 2.5 2.5 5-5" /></> },
  info: { node: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></> },
  help: { node: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7M12 17h.01" /></> },
  warning: { node: <><path d="M10.3 4.2 2.7 17.5A2 2 0 0 0 4.4 20.5h15.2a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0z" /><path d="M12 9v4M12 17h.01" /></> },
  error: { node: <><circle cx="12" cy="12" r="9" /><path d="m9 9 6 6M15 9l-6 6" /></> },
  bell: { node: <><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2H4.5z" /><path d="M10 20a2 2 0 0 0 4 0" /></> },
  bellOff: { node: <><path d="M8.5 5.6A6 6 0 0 1 18 11v5l1.5 2M6 16V11c0-.5 0-1 .2-1.5M4 4l16 16M6 16l-1.5 2h11" /><path d="M10 20a2 2 0 0 0 4 0" /></> },
  flag: { node: <path d="M5 21V4h11l-1 4 4 0v9H9l1-4H5" /> },
  // 행동
  plus: { node: <path d="M12 5v14M5 12h14" /> },
  minus: { node: <path d="M5 12h14" /> },
  edit: { node: <><path d="M4 20h4l11-11a2 2 0 0 0 0-2.8l-1.2-1.2a2 2 0 0 0-2.8 0L4 16z" /><path d="m13 7 4 4" /></> },
  trash: { node: <><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /><path d="M10 11v6M14 11v6" /></> },
  copy: { node: <><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V6a2 2 0 0 1 2-2h9" /></> },
  share: { node: <><path d="M12 15V4" /><path d="m8 8 4-4 4 4" /><path d="M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7" /></> },
  send: { node: <path d="m21 3-9 18-2-8-8-2z" /> },
  download: { node: <><path d="M12 4v11" /><path d="m8 11 4 4 4-4" /><path d="M5 19h14" /></> },
  upload: { node: <><path d="M12 15V4" /><path d="m8 8 4-4 4 4" /><path d="M5 19h14" /></> },
  refresh: { node: <><path d="M20 12a8 8 0 1 1-2.3-5.7" /><path d="M20 4v5h-5" /></> },
  logout: { node: <><path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" /><path d="M15 16l4-4-4-4M19 12H9" /></> },
  qr: { node: <><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><path d="M14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z" /></> },
  // 사물
  camera: { node: <><path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2.4a1 1 0 0 0 .83-.45l.94-1.4A1 1 0 0 1 9.5 4.7h5a1 1 0 0 1 .83.45l.94 1.4a1 1 0 0 0 .83.45h2.4A1.5 1.5 0 0 1 21 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z" /><circle cx="12" cy="12.8" r="3.2" /></> },
  image: { node: <><rect x="3" y="4.5" width="18" height="15" rx="2" /><circle cx="8.5" cy="9.5" r="1.5" /><path d="m4 17 4.5-4.5a1.5 1.5 0 0 1 2 0L14 16" /><path d="m13 14 2-2a1.5 1.5 0 0 1 2 0l3 3" /></> },
  phone: { node: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" /> },
  mail: { node: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></> },
  chat: { node: <path d="M4 5h16v11H9l-5 4z" /> },
  calendar: { node: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></> },
  clock: { node: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></> },
  eye: { node: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></> },
  eyeOff: { node: <><path d="M3 3l18 18" /><path d="M10.6 5.2A11 11 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 3.9M6.6 6.6C3.6 8.6 2 12 2 12s3.5 7 10 7a10 10 0 0 0 4.4-1" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></> },
  lock: { node: <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></> },
  heart: { node: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" /> },
  heartFilled: { node: <path d="M12 21s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6-8 11-8 11z" />, filled: true },
  star: { node: <path d="m12 3 2.8 5.8 6.2.9-4.5 4.4 1 6.3L12 17.5 6.5 20.4l1-6.3L3 9.7l6.2-.9z" /> },
  starFilled: { node: <path d="m12 2.5 3 6.1 6.7 1-4.9 4.7 1.2 6.7L12 17.8 6 21l1.2-6.7-4.9-4.7 6.7-1z" />, filled: true },
  bookmark: { node: <path d="M6 4h12v17l-6-4-6 4z" /> },
  user: { node: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></> },
  users: { node: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M15 4.5a3.5 3.5 0 0 1 0 7M17 13.5a6.5 6.5 0 0 1 4.5 6.5" /></> },
  map: { node: <><path d="m3 6 6-2 6 2 6-2v14l-6 2-6-2-6 2z" /><path d="M9 4v14M15 6v14" /></> },
  pin: { node: <path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7m0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5" />, filled: true },
  pinOutline: { node: <><path d="M12 21s7-7.5 7-12.5a7 7 0 0 0-14 0C5 13.5 12 21 12 21z" /><circle cx="12" cy="8.5" r="2.5" /></> },
  location: { node: <><circle cx="12" cy="12" r="3.5" /><path d="M12 2v3.5M12 18.5V22M22 12h-3.5M5.5 12H2" /></> },
  navigation: { node: <path d="m3 11 18-8-8 18-2-8z" /> },
  globe: { node: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></> },
  sun: { node: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></> },
  moon: { node: <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" /> },
  mic: { node: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></> },
  paw: { node: <><circle cx="7" cy="9" r="2" /><circle cx="12" cy="6.5" r="2" /><circle cx="17" cy="9" r="2" /><path d="M12 11.5c-3 0-6 2.5-6 5.5a2.5 2.5 0 0 0 3.5 2.3c1.5-.6 3.5-.6 5 0A2.5 2.5 0 0 0 18 17c0-3-3-5.5-6-5.5z" /></> },
  tag: { node: <><path d="M3 12V4h8l9 9-8 8z" /><circle cx="7.5" cy="8.5" r="1" /></> },
  wifiOff: { node: <><path d="M3 3l18 18" /><path d="M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 4.3-2.6M15 10.5a10 10 0 0 1 4 2.5M1.5 9.5A15 15 0 0 1 6 6.6M12 5a15 15 0 0 1 10.5 4.5" /><path d="M12 20h.01" /></> },
} satisfies Record<string, Glyph>;

export type IconName = keyof typeof GLYPHS;

export const ICON_NAMES = Object.keys(GLYPHS) as IconName[];

export function Icon({ name, size = "1em", ...rest }: IconProps & { name: IconName }) {
  const glyph: Glyph = GLYPHS[name];
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={glyph.filled ? "currentColor" : "none"}
      stroke={glyph.filled ? "none" : "currentColor"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {glyph.node}
    </svg>
  );
}

// 기존 호출부 호환용 이름 붙은 아이콘
export const IconCamera = (props: IconProps) => <Icon name="camera" {...props} />;
export const IconImage = (props: IconProps) => <Icon name="image" {...props} />;
export const IconClose = (props: IconProps) => <Icon name="close" {...props} />;
export const IconPlus = (props: IconProps) => <Icon name="plus" {...props} />;
export const IconMinus = (props: IconProps) => <Icon name="minus" {...props} />;
export const IconPin = (props: IconProps) => <Icon name="pin" {...props} />;
export const IconLocation = (props: IconProps) => <Icon name="location" {...props} />;
