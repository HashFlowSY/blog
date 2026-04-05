import path from "path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.spec.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        // 纯类型和 barrel 文件
        "src/**/types/**",
        "src/**/*.d.ts",
        "src/i18n/types.ts",
        "src/components/tag/index.ts",
        // 配置文件
        "src/**/*.config.ts",
        // Next.js 服务端组件和特殊文件
        "src/**/layout.tsx",
        "src/**/loading.tsx",
        "src/**/error.tsx",
        "src/**/not-found.tsx",
        "src/**/page.tsx",
        "src/**/middleware.ts",
        "src/app/global-error.tsx",
        "src/app/robots.ts",
        "src/app/sitemap.ts",
        // i18n 配置（通过集成测试验证）
        "src/i18n/routing.ts",
        "src/i18n/request.ts",
        "src/i18n/navigation.ts",
        // 第三方 shadcn/ui 组件（无自定义逻辑）
        "src/components/ui/**",
        // 测试文件自身
        "src/**/*.spec.{ts,tsx}",
        "src/**/*.test-utils.{ts,tsx}",
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
