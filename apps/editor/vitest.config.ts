import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.{test,spec}.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,vue}'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'src/main.ts', // 应用入口，不做单元测试
      ],
      // 覆盖率门槛：
      // - 全局为 .ts 与 .vue 的合计基线（stmts 95.1 / branch 89.2 / funcs 91.0 / lines 95.8），
      //   视图层与组件层补齐用例后整体已较高，用于防止整体倒退；
      // - src/**/*.ts 单独维持更高门槛（基线 96.8 / 88.4 / 96.1），保持纯 TS 代码的强约束；
      // - src/components/**/*.vue 单独设门槛（基线 94.9 / 90.5 / 89.3），防止组件用例倒退；
      // - src/views/**/*.vue 单独设门槛（基线 89.6 / 87.3 / 73.8），防止视图用例倒退。
      // 说明：v8 覆盖率报告不输出行级明细，各行门槛按略低于对应 statements 基线取值。
      thresholds: {
        statements: 93,
        branches: 87,
        functions: 89,
        lines: 93,
        'src/**/*.ts': {
          statements: 95,
          branches: 86,
          functions: 95,
          lines: 95,
        },
        'src/components/**/*.vue': {
          statements: 93,
          branches: 88,
          functions: 87,
          lines: 93,
        },
        'src/views/**/*.vue': {
          statements: 87,
          branches: 85,
          functions: 71,
          lines: 87,
        },
      },
    },
  },
});
