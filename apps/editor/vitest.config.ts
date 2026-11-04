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
    environment: 'node',
    globals: true,
    include: ['src/**/*.{test,spec}.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/**/*.test.ts', 'src/**/*.spec.ts'],
      // 覆盖率门槛：略低于当前基线（stmts 16.09 / branch 5.65 / funcs 12.28 / lines 16.64），
      // 用于防止覆盖率倒退，同时留出小幅波动空间。
      thresholds: {
        statements: 15,
        branches: 5,
        functions: 11,
        lines: 15,
      },
    },
  },
});
