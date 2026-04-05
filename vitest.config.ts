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
        // 规范要求的排除项
        "src/**/types/**",
        "src/**/*.d.ts",
        "src/**/*.config.ts",
        "src/**/layout.tsx",
        "src/**/loading.tsx",
        "src/**/error.tsx",
        "src/**/not-found.tsx",
        "src/**/middleware.ts",
        // 测试文件自身
        "src/**/*.spec.{ts,tsx}",
        "src/**/*.test-utils.{ts,tsx}",
        // Next.js 特殊文件
        "src/app/robots.ts",
        "src/app/sitemap.ts",
        // i18n 配置（通过集成测试验证）
        "src/i18n/routing.ts",
        "src/i18n/request.ts",
        "src/i18n/navigation.ts",
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
