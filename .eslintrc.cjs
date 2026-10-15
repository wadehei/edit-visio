module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    es2020: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:vue/vue3-recommended',
    '@vue/eslint-config-typescript',
    'prettier',
  ],
  parser: 'vue-eslint-parser',
  parserOptions: {
    parser: '@typescript-eslint/parser',
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  rules: {
    // TypeScript 规则
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],

    // Vue 规则
    'vue/multi-word-component-names': 'off',
    'vue/no-v-html': 'off',

    // 通用规则
    'no-console': 'off',
    'no-debugger': 'warn',
    'prefer-const': 'warn',
    'no-var': 'error',
  },
  ignorePatterns: ['dist', 'node_modules', 'coverage', '*.config.js', '*.config.ts'],
};
