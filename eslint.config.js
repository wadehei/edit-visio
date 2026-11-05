// ESLint 10 扁平配置（flat config）
// 原 .eslintrc.cjs / apps/editor/.eslintrc.cjs 的规则已在此等价迁移
import js from '@eslint/js';
import pluginVue from 'eslint-plugin-vue';
import {
  configureVueProject,
  defineConfigWithVueTs,
  vueTsConfigs,
} from '@vue/eslint-config-typescript';
import prettier from 'eslint-config-prettier';

// monorepo 下根级共享配置的 files 基准是「仓库根目录」，而 @vue/eslint-config-typescript
// 默认以 process.cwd()（各包目录）为 rootDir 生成「精确相对路径」来区分可/不可类型检查的
// .vue 文件，两者基准不一致会导致这些精确路径全部匹配失败：可类型检查的 .vue 拿不到
// projectService（类型感知规则报 “don't have parserOptions set to generate type
// information”），无 <script lang="ts"> 的 .vue 又关不掉类型感知规则。
// 显式把 rootDir 指向仓库根目录，与 files 基准对齐即可。
configureVueProject({ rootDir: import.meta.dirname });

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
  // recommendedTypeChecked：启用类型感知规则（如 no-floating-promises），可捕获漏 await 的 Promise
  vueTsConfigs.recommendedTypeChecked,

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
      // 默认禁止 v-html（防 XSS），仅 RichText.vue 例外：其内容已过 DOMPurify 消毒
      'vue/no-v-html': 'error',
      'no-console': 'off',
      'no-debugger': 'warn',
      'prefer-const': 'warn',
      'no-var': 'error',
    },
  },

  // RichText.vue 内部使用 DOMPurify.sanitize 消毒后再 v-html，允许其使用 v-html
  {
    files: ['packages/components/src/basic/RichText.vue'],
    rules: {
      'vue/no-v-html': 'off',
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
