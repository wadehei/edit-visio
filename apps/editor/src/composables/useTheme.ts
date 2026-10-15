import { ref, computed, watch } from 'vue';

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
      console.error('Failed to load theme config:', error);
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
      console.error('Failed to save theme config:', error);
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

  // 监听系统主题变化
  if (typeof window !== 'undefined') {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (themeConfig.value.mode === 'system') {
        applyTheme();
      }
    });
  }

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
