import type { IconName } from "@/components/ui/icons";

// 디자인 시스템 카탈로그의 분류와 절 목록, 각 catalog-*.tsx 의 Spec id 가 여기와 일치해야 함

export type SectionMeta = { id: string; label: string };

export type CategoryMeta = {
  id: CategoryId;
  label: string;
  description: string;
  icon: IconName;
  sections: SectionMeta[];
};

export type CategoryId =
  | "foundations"
  | "elements"
  | "forms"
  | "overlays"
  | "navigation"
  | "data"
  | "feedback"
  | "charts"
  | "layout"
  | "shells";

export const CATEGORIES: CategoryMeta[] = [
  {
    id: "foundations",
    label: "Foundations",
    description: "색, 글자, 간격, 모서리, 움직임, 아이콘의 기준값",
    icon: "grid",
    sections: [
      { id: "overview", label: "Overview" },
      { id: "brand", label: "Brand" },
      { id: "colors", label: "Colors" },
      { id: "typography", label: "Typography" },
      { id: "spacing", label: "Spacing & Layout" },
      { id: "radius", label: "Radius & Elevation" },
      { id: "motion", label: "Motion" },
      { id: "icons", label: "Icons" },
    ],
  },
  {
    id: "elements",
    label: "Elements",
    description: "혼자 쓰이는 가장 작은 단위",
    icon: "star",
    sections: [
      { id: "button", label: "Button" },
      { id: "icon-button", label: "Icon Button" },
      { id: "button-group", label: "Button Group" },
      { id: "split-button", label: "Split Button" },
      { id: "copy-button", label: "Copy Button" },
      { id: "chip", label: "Chip" },
      { id: "badge", label: "Badge & Tag" },
      { id: "avatar", label: "Avatar" },
      { id: "progress", label: "Progress" },
      { id: "spinner", label: "Spinner" },
      { id: "skeleton", label: "Skeleton" },
      { id: "separator", label: "Separator" },
      { id: "status", label: "Status" },
      { id: "kbd", label: "Kbd" },
    ],
  },
  {
    id: "forms",
    label: "Forms",
    description: "입력, 선택, 슬라이더, 파일",
    icon: "edit",
    sections: [
      { id: "field", label: "Field" },
      { id: "input", label: "Input" },
      { id: "textarea", label: "Textarea" },
      { id: "number-input", label: "Number Input" },
      { id: "pin-input", label: "PIN Input" },
      { id: "search-bar", label: "Search Bar" },
      { id: "password-input", label: "Password Input" },
      { id: "tags-input", label: "Tags Input" },
      { id: "select", label: "Select" },
      { id: "combobox", label: "Combobox" },
      { id: "multi-select", label: "Multi Select" },
      { id: "checkbox", label: "Checkbox" },
      { id: "radio", label: "Radio" },
      { id: "switch", label: "Switch" },
      { id: "toggle", label: "Toggle" },
      { id: "segmented", label: "Segmented" },
      { id: "slider", label: "Slider" },
      { id: "rating", label: "Rating" },
      { id: "color-picker", label: "Color Picker" },
      { id: "date-time", label: "Date & Time" },
      { id: "calendar", label: "Calendar" },
      { id: "file-upload", label: "File Upload" },
      { id: "attachment-list", label: "Attachment List" },
      { id: "avatar-uploader", label: "Avatar Uploader" },
      { id: "editable", label: "Editable" },
      { id: "fieldset", label: "Fieldset" },
    ],
  },
  {
    id: "overlays",
    label: "Overlays",
    description: "화면 위에 겹쳐 뜨는 것",
    icon: "copy",
    sections: [
      { id: "dialog", label: "Dialog" },
      { id: "alert-dialog", label: "Alert Dialog" },
      { id: "bottom-sheet", label: "Bottom Sheet" },
      { id: "action-sheet", label: "Action Sheet" },
      { id: "menu-drawer", label: "Menu Drawer" },
      { id: "menu", label: "Dropdown Menu" },
      { id: "popover", label: "Popover" },
      { id: "confirm-popover", label: "Confirm Popover" },
      { id: "tooltip", label: "Tooltip" },
      { id: "toast", label: "Toast" },
      { id: "notification-center", label: "Notification Center" },
      { id: "action-bar", label: "Action Bar" },
      { id: "lightbox", label: "Lightbox" },
      { id: "tour", label: "Tour" },
      { id: "loader-overlay", label: "Loader Overlay" },
    ],
  },
  {
    id: "navigation",
    label: "Navigation",
    description: "화면 사이와 화면 안을 오가는 것",
    icon: "navigation",
    sections: [
      { id: "app-bar", label: "App Bar" },
      { id: "tab-bar", label: "Tab Bar" },
      { id: "tabs", label: "Tabs" },
      { id: "scroll-nav", label: "Scroll Nav" },
      { id: "breadcrumb", label: "Breadcrumb" },
      { id: "command-palette", label: "Command Palette" },
      { id: "tree-view", label: "Tree View" },
      { id: "steps", label: "Steps" },
      { id: "pagination", label: "Pagination" },
      { id: "link", label: "Link" },
      { id: "collapsible", label: "Collapsible" },
      { id: "back-to-top", label: "Back to Top" },
      { id: "page-indicator", label: "Page Indicator" },
    ],
  },
  {
    id: "data",
    label: "Data Display",
    description: "내용을 보여주는 틀",
    icon: "list",
    sections: [
      { id: "card", label: "Card" },
      { id: "list-item", label: "List Item" },
      { id: "data-list", label: "Data List" },
      { id: "table", label: "Table" },
      { id: "accordion", label: "Accordion" },
      { id: "timeline", label: "Timeline" },
      { id: "activity-feed", label: "Activity Feed" },
      { id: "user-card", label: "User Card" },
      { id: "comparison-table", label: "Comparison Table" },
      { id: "code-block", label: "Code Block" },
      { id: "stat", label: "Stat" },
      { id: "carousel", label: "Carousel" },
      { id: "marquee", label: "Marquee" },
      { id: "image", label: "Image" },
      { id: "qr-code", label: "QR Code" },
      { id: "avatar-group", label: "Avatar Group" },
      { id: "clipboard", label: "Clipboard" },
    ],
  },
  {
    id: "feedback",
    label: "Feedback",
    description: "상태와 결과를 알리는 것",
    icon: "bell",
    sections: [
      { id: "section-message", label: "Section Message" },
      { id: "banner", label: "Banner" },
      { id: "empty-state", label: "Empty State" },
      { id: "callout", label: "Callout" },
      { id: "result-view", label: "Result View" },
      { id: "error-view", label: "Error View" },
      { id: "progress-ring", label: "Progress Ring" },
      { id: "gauge", label: "Gauge" },
      { id: "loading", label: "Loading Pattern" },
    ],
  },
  {
    id: "charts",
    label: "Charts",
    description: "좁은 폭에서 읽히는 최소 차트",
    icon: "sliders",
    sections: [
      { id: "sparkline", label: "Sparkline" },
      { id: "bar-chart", label: "Bar Chart" },
      { id: "line-chart", label: "Line Chart" },
      { id: "donut-chart", label: "Donut Chart" },
      { id: "heatmap", label: "Heatmap Calendar" },
    ],
  },
  {
    id: "layout",
    label: "Layout",
    description: "배치와 스크롤을 다루는 도구",
    icon: "grid",
    sections: [
      { id: "aspect-ratio", label: "Aspect Ratio" },
      { id: "scroll-area", label: "Scroll Area" },
      { id: "sticky", label: "Sticky" },
      { id: "masonry", label: "Masonry" },
      { id: "overflow-menu", label: "Overflow Menu" },
      { id: "safe-area", label: "Safe Area" },
      { id: "pull-refresh", label: "Pull to Refresh" },
    ],
  },
  {
    id: "shells",
    label: "Shells",
    description: "화면 전체를 짜는 틀과 조합 예시",
    icon: "home",
    sections: [
      { id: "screen", label: "Screen" },
      { id: "page-header", label: "Page Header" },
      { id: "section-header", label: "Section Header" },
      { id: "cta-bar", label: "CTA Bar" },
      { id: "fab", label: "FAB" },
      { id: "shell-home", label: "홈 화면" },
      { id: "shell-form", label: "단계 폼" },
      { id: "shell-detail", label: "상세 화면" },
      { id: "shell-settings", label: "설정 화면" },
      { id: "shell-onboarding", label: "온보딩" },
      { id: "shell-auth", label: "인증 화면" },
      { id: "shell-list", label: "목록 화면" },
      { id: "shell-map", label: "지도 화면" },
    ],
  },
];

export const CATEGORY_IDS = CATEGORIES.map((category) => category.id);

export function isCategoryId(value: string | undefined): value is CategoryId {
  return (CATEGORY_IDS as string[]).includes(value ?? "");
}
