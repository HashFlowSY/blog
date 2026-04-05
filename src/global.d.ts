import type { Messages } from "@/i18n/types";

interface AppConfig extends Record<string, unknown> {
  Messages: Messages;
  Locale: "zh-CN" | "en-US";
}
