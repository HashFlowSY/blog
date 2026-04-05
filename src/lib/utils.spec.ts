import { describe, it, expect } from "vitest";

import { cn } from "./utils";

describe("cn 工具函数", () => {
  describe("基本合并", () => {
    it("合并多个 className 字符串", () => {
      expect(cn("px-2", "py-1")).toBe("px-2 py-1");
    });

    it("合并三个及以上 className", () => {
      expect(cn("flex", "items-center", "gap-4")).toBe(
        "flex items-center gap-4",
      );
    });

    it("空字符串输入返回空字符串", () => {
      expect(cn("")).toBe("");
    });

    it("无参数调用返回空字符串", () => {
      expect(cn()).toBe("");
    });
  });

  describe("Tailwind 类名冲突处理", () => {
    it("后者覆盖前者的 padding 类名", () => {
      expect(cn("px-2", "px-4")).toBe("px-4");
    });

    it("后者覆盖前者的 margin 类名", () => {
      expect(cn("mx-2", "mx-auto")).toBe("mx-auto");
    });

    it("后者覆盖前者的文字大小类名", () => {
      expect(cn("text-sm", "text-lg")).toBe("text-lg");
    });

    it("后者覆盖前者的颜色类名", () => {
      expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
    });

    it("不冲突的类名保留两者", () => {
      const result = cn("px-2", "py-1", "text-sm", "font-bold");
      expect(result).toBe("px-2 py-1 text-sm font-bold");
    });

    it("条件类名变更时正确切换", () => {
      const active = true;
      expect(cn("bg-gray-100", active && "bg-blue-500")).toBe("bg-blue-500");

      const inactive = false;
      expect(cn("bg-gray-100", inactive && "bg-blue-500")).toBe("bg-gray-100");
    });
  });

  describe("falsy 值过滤", () => {
    it("过滤 false", () => {
      expect(cn("px-2", false && "py-1")).toBe("px-2");
    });

    it("过滤 null", () => {
      expect(cn("px-2", null)).toBe("px-2");
    });

    it("过滤 undefined", () => {
      expect(cn("px-2", undefined)).toBe("px-2");
    });

    it("过滤 0", () => {
      expect(cn("px-2", 0)).toBe("px-2");
    });

    it("过滤空字符串", () => {
      expect(cn("px-2", "")).toBe("px-2");
    });

    it("保留有效类名并过滤所有 falsy 值", () => {
      expect(cn("a", null, "b", undefined, "c", false, "", 0)).toBe(
        "a b c",
      );
    });
  });

  describe("数组输入", () => {
    it("接受数组形式的类名", () => {
      expect(cn(["px-2", "py-1"])).toBe("px-2 py-1");
    });

    it("接受嵌套数组", () => {
      expect(cn(["px-2", ["py-1", "text-sm"]])).toBe("px-2 py-1 text-sm");
    });

    it("数组中的 falsy 值被过滤", () => {
      expect(cn(["px-2", null, "py-1", undefined])).toBe("px-2 py-1");
    });
  });

  describe("对象输入", () => {
    it("接受对象形式的条件类名", () => {
      expect(cn({ "px-2": true, "py-1": false })).toBe("px-2");
    });

    it("所有 key 为 false 时返回空字符串", () => {
      expect(cn({ "px-2": false, "py-1": false })).toBe("");
    });
  });

  describe("复杂混合输入", () => {
    it("混合字符串、数组、对象和 falsy 值", () => {
      const isActive = true;
      const isDisabled = false;
      expect(
        cn(
          "base-class",
          ["array-class"],
          { conditional: isActive, disabled: isDisabled },
          null,
          undefined,
          "trailing-class",
        ),
      ).toBe("base-class array-class conditional trailing-class");
    });

    it("Tailwind 变体与冲突同时存在时正确处理", () => {
      expect(
        cn(
          "rounded",
          "rounded-lg",
          "bg-white",
          "dark:bg-gray-800",
          false && "bg-red-500",
        ),
      ).toBe("rounded-lg bg-white dark:bg-gray-800");
    });
  });
});
