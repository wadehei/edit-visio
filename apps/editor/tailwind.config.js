/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx,vue}'],
  // 主题切换由 ThemeSwitcher 在 <html> 上增删 .dark 类控制（配合 useTheme）
  darkMode: 'class',
  theme: {
    extend: {
      // 设计 token：统一品牌色 / 圆角 / 阴影，供各面板复用
      colors: {
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
      },
      borderRadius: {
        token: '0.5rem',
      },
      boxShadow: {
        panel: '0 1px 3px rgba(0, 0, 0, 0.04)',
        floating: '0 8px 25px -5px rgba(0, 0, 0, 0.08), 0 4px 10px -5px rgba(0, 0, 0, 0.04)',
      },
    },
  },
  plugins: [],
};
