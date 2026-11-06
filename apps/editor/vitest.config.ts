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
      // - 全局为 .ts 与 .vue 的合计基线（stmts 51.7 / branch 36.1 / funcs 49.2 / lines 51.7），
      //   因大量视图/重型组件尚未覆盖而偏低，仅用于防止整体倒退；
      // - src/**/*.ts 单独维持更高门槛（基线 96.1 / 87.9 / 96.1 / 96.6），保持纯 TS 代码的强约束；
      // - src/components/**/*.vue 单独设门槛（基线 15.2 / 12.7 / 14.7 / 15.3，含 property-panel 子目录），
      //   防止组件用例倒退。
      thresholds: {
        statements: 50,
        branches: 34,
        functions: 47,
        lines: 50,
        'src/**/*.ts': {
          statements: 94,
          branches: 85,
          functions: 94,
          lines: 94,
        },
        'src/components/**/*.vue': {
          statements: 14,
          branches: 11,
          functions: 13,
          lines: 14,
        },
      },
    },
  },
});
