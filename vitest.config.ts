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
        // Next.js 服务端组件和特殊文件
        "src/**/layout.tsx",
        "src/**/not-found.tsx",
        "src/**/page.tsx",
        "src/app/robots.ts",
        "src/app/sitemap.ts",
        "src/app/**/route.ts",
        // 测试文件自身
        "src/**/*.spec.{ts,tsx}",
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
        "src/lib/content-catalog.ts": {
          branches: 85,
        },
        "src/lib/content-contracts.ts": {
          branches: 85,
        },
        "src/lib/site.ts": {
          branches: 90,
        },
        "src/lib/url-path.ts": {
          branches: 90,
        },
      },
    },
  },
});
