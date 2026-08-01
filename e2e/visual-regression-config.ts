import type { ViewportSize } from "@playwright/test";

const VISUAL_PIXEL_COMPARISON = {
  maxDiffPixelRatio: 0,
  maxDiffPixels: 0,
  threshold: 0,
} as const;

const VISUAL_USE_OPTIONS = {
  colorScheme: "light" as const,
  contextOptions: { reducedMotion: "reduce" as const },
  deviceScaleFactor: 1,
  locale: "zh-CN",
  timezoneId: "Asia/Shanghai",
} as const;

const VISUAL_SCREENSHOT_OPTIONS = {
  ...VISUAL_PIXEL_COMPARISON,
  animations: "disabled" as const,
  caret: "hide" as const,
  fullPage: false,
  scale: "css" as const,
};

const VISUAL_DESKTOP_VIEWPORT: ViewportSize = {
  height: 900,
  width: 1440,
};

const VISUAL_MOBILE_VIEWPORT: ViewportSize = {
  height: 667,
  width: 375,
};

export {
  VISUAL_DESKTOP_VIEWPORT,
  VISUAL_MOBILE_VIEWPORT,
  VISUAL_PIXEL_COMPARISON,
  VISUAL_SCREENSHOT_OPTIONS,
  VISUAL_USE_OPTIONS,
};
