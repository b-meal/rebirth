// 카탈로그 절 목록, 좌측 이동과 본문이 같은 배열을 봄

export type CatalogSection = {
  id: string;
  title: string;
  /** SEED 문서에서 대응하는 항목 경로 */
  doc?: string;
};

export type CatalogGroup = {
  id: string;
  title: string;
  sections: CatalogSection[];
};

export const CATALOG: CatalogGroup[] = [
  {
    id: "foundations",
    title: "파운데이션",
    sections: [
      { id: "color", title: "색", doc: "foundations/color" },
      { id: "typography", title: "타이포그래피", doc: "foundations/typography" },
      { id: "spacing", title: "간격", doc: "foundations/spacing" },
      { id: "radius", title: "모서리", doc: "foundations/radius" },
      { id: "elevation", title: "그림자", doc: "foundations/elevation" },
      { id: "iconography", title: "아이콘", doc: "foundations/iconography" },
    ],
  },
  {
    id: "action",
    title: "액션",
    sections: [
      { id: "action-button", title: "ActionButton", doc: "react/components/action-button" },
      {
        id: "floating-action-button",
        title: "FloatingActionButton",
        doc: "react/components/floating-action-button",
      },
      {
        id: "contextual-floating-button",
        title: "ContextualFloatingButton",
        doc: "react/components/contextual-floating-button",
      },
      { id: "toggle-button", title: "ToggleButton", doc: "react/components/toggle-button" },
      { id: "reaction-button", title: "ReactionButton", doc: "react/components/reaction-button" },
      { id: "quantity-picker", title: "QuantityPicker", doc: "react/components/quantity-picker" },
    ],
  },
  {
    id: "form",
    title: "입력",
    sections: [
      { id: "text-field", title: "TextField", doc: "react/components/text-field-input" },
      {
        id: "segmented-control",
        title: "SegmentedControl",
        doc: "react/components/segmented-control",
      },
      { id: "chip", title: "Chip", doc: "react/components/chip" },
      { id: "checkbox", title: "Checkbox", doc: "react/components/checkbox" },
      { id: "radio-group", title: "RadioGroup", doc: "react/components/radio-group" },
      { id: "switch", title: "Switch", doc: "react/components/switch" },
      { id: "select", title: "Select", doc: "react/components/select" },
      { id: "select-box", title: "SelectBox", doc: "react/components/select-box" },
      { id: "slider", title: "Slider", doc: "react/components/slider" },
      { id: "field-button", title: "FieldButton", doc: "react/components/field-button" },
      { id: "attachment-field", title: "AttachmentField", doc: "react/components/attachment-field" },
    ],
  },
  {
    id: "display",
    title: "표시",
    sections: [
      { id: "badge", title: "Badge", doc: "react/components/badge" },
      { id: "tag-group", title: "TagGroup", doc: "react/components/tag-group" },
      { id: "avatar", title: "Avatar", doc: "react/components/avatar" },
      { id: "image-frame", title: "ImageFrame", doc: "react/components/image-frame" },
      {
        id: "content-placeholder",
        title: "ContentPlaceholder",
        doc: "react/components/content-placeholder",
      },
      {
        id: "identity-placeholder",
        title: "IdentityPlaceholder",
        doc: "react/components/identity-placeholder",
      },
      { id: "skeleton", title: "Skeleton", doc: "react/components/skeleton" },
      { id: "progress-circle", title: "ProgressCircle", doc: "react/components/progress-circle" },
      { id: "manner-temp", title: "MannerTemp", doc: "react/components/manner-temp" },
      { id: "list", title: "List", doc: "react/components/list" },
      { id: "accordion", title: "Accordion", doc: "react/components/accordion" },
    ],
  },
  {
    id: "feedback",
    title: "피드백",
    sections: [
      { id: "callout", title: "Callout", doc: "react/components/callout" },
      { id: "page-banner", title: "PageBanner", doc: "react/components/page-banner" },
      { id: "snackbar", title: "Snackbar", doc: "react/components/snackbar" },
      { id: "result-section", title: "ResultSection", doc: "react/components/result-section" },
      { id: "help-bubble", title: "HelpBubble", doc: "react/components/help-bubble" },
    ],
  },
  {
    id: "overlay",
    title: "오버레이",
    sections: [
      { id: "dialog", title: "Dialog", doc: "react/components/dialog" },
      { id: "alert-dialog", title: "AlertDialog", doc: "react/components/alert-dialog" },
      { id: "bottom-sheet", title: "BottomSheet", doc: "react/components/bottom-sheet" },
      {
        id: "swipeable-menu-sheet",
        title: "SwipeableMenuSheet",
        doc: "react/components/swipeable-menu-sheet",
      },
      { id: "menu", title: "Menu", doc: "react/components/menu" },
      { id: "side-panel", title: "SidePanel", doc: "react/components/side-panel" },
    ],
  },
  {
    id: "navigation",
    title: "탐색",
    sections: [
      { id: "tabs", title: "Tabs", doc: "react/components/tabs" },
      { id: "chip-tabs", title: "ChipTabs", doc: "react/components/chip-tabs" },
      { id: "pagination", title: "Pagination", doc: "react/components/pagination" },
      { id: "scroll-fog", title: "ScrollFog", doc: "react/components/scroll-fog" },
    ],
  },
];

export const SEED_DOCS_ORIGIN = "https://seed-design.io";
