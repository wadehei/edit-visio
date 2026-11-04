// ESLint 10 扁平配置（flat config）
// 原 .eslintrc.cjs / apps/editor/.eslintrc.cjs 的规则已在此等价迁移
import js from '@eslint/js';
import pluginVue from 'eslint-plugin-vue';
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript';
import prettier from 'eslint-config-prettier';

export default defineConfigWithVueTs(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/coverage/**',
      '**/*.config.js',
      '**/*.config.ts',
    ],
  },

  // JS 基础规则（原 eslint:recommended）
  js.configs.recommended,

  // Vue 3 推荐规则（原 plugin:vue/vue3-recommended）
  ...pluginVue.configs['flat/recommended'],

  // TypeScript + Vue 推荐规则（原 plugin:@typescript-eslint/recommended + @vue/eslint-config-typescript）
  vueTsConfigs.recommended,

  // 关闭与 Prettier 冲突的格式化规则（原 prettier）
  prettier,

  // 通用规则（原根 .eslintrc.cjs）
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'vue/multi-word-component-names': 'off',
      'vue/no-v-html': 'off',
      'no-console': 'off',
      'no-debugger': 'warn',
      'prefer-const': 'warn',
      'no-var': 'error',
    },
  },

  // apps/editor 专属规则（原 apps/editor/.eslintrc.cjs）
  {
    files: ['apps/editor/**/*.{ts,tsx,vue}'],
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
);
