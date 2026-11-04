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
      // 覆盖率门槛：略低于当前基线（stmts 22.48 / branch 10 / funcs 17.1 / lines 23.26），
      // 用于防止覆盖率倒退，同时留出小幅波动空间。
      thresholds: {
        statements: 20,
        branches: 9,
        functions: 15,
        lines: 20,
      },
    },
  },
});
