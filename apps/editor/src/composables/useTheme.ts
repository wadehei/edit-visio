import { ref, computed, onUnmounted } from 'vue';
import { logger } from '../utils/logger';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeConfig {
  mode: ThemeMode;
  primaryColor: string;
}

const STORAGE_KEY = 'theme-config';

export function useTheme() {
  const themeConfig = ref<ThemeConfig>(loadThemeConfig());

  const isDark = computed(() => {
    if (themeConfig.value.mode === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return themeConfig.value.mode === 'dark';
  });

  function loadThemeConfig(): ThemeConfig {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      logger.error('Theme', 'Failed to load theme config', error);
    }
    return {
      mode: 'light',
      primaryColor: '#3b82f6',
    };
  }

  function saveThemeConfig() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(themeConfig.value));
    } catch (error) {
      logger.error('Theme', 'Failed to save theme config', error);
    }
  }

  function setThemeMode(mode: ThemeMode) {
    themeConfig.value = { ...themeConfig.value, mode };
    saveThemeConfig();
    applyTheme();
  }

  function setPrimaryColor(color: string) {
    themeConfig.value = { ...themeConfig.value, primaryColor: color };
    saveThemeConfig();
    applyTheme();
  }

  function applyTheme() {
    const root = document.documentElement;
    if (isDark.value) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    root.style.setProperty('--primary-color', themeConfig.value.primaryColor);
  }

  // 监听系统主题变化（组件卸载时清理，防止内存泄漏）
  const mediaQuery = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null;

  const handleSystemThemeChange = () => {
    if (themeConfig.value.mode === 'system') {
      applyTheme();
    }
  };

  if (mediaQuery) {
    mediaQuery.addEventListener('change', handleSystemThemeChange);
  }

  onUnmounted(() => {
    if (mediaQuery) {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    }
  });

  // 初始化时应用主题
  applyTheme();

  return {
    themeConfig,
    isDark,
    setThemeMode,
    setPrimaryColor,
    applyTheme,
  };
}
