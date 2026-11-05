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
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/**/*.test.ts', 'src/**/*.spec.ts'],
      // 覆盖率门槛：略低于当前基线（stmts 92.0 / branch 80.0 / funcs 95.2 / lines 92.6），
      // 用于防止覆盖率倒退，同时留出小幅波动空间。
      thresholds: {
        statements: 88,
        branches: 75,
        functions: 90,
        lines: 88,
      },
    },
  },
});
