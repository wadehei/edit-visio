<template>
  <div class="relative">
    <button
      @click="showDropdown = !showDropdown"
      class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
      :title="isDark ? '切换到亮色模式' : '切换到暗色模式'"
    >
      <Moon v-if="!isDark" :size="18" />
      <Sun v-else :size="18" />
    </button>

    <div
      v-if="showDropdown"
      class="absolute right-0 top-full mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg py-2 min-w-[160px] z-50"
    >
      <div class="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
        <p class="text-xs text-gray-500 dark:text-gray-400">主题模式</p>
      </div>
      <button
        v-for="mode in themeModes"
        :key="mode.value"
        @click="selectMode(mode.value)"
        class="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
        :class="{ 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400': themeConfig.mode === mode.value }"
      >
        <component :is="mode.icon" :size="16" />
        {{ mode.label }}
      </button>

      <div class="border-t border-gray-200 dark:border-gray-700 mt-2 pt-2 px-4 py-2">
        <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">主题色</p>
        <div class="flex gap-2 flex-wrap">
          <button
            v-for="color in presetColors"
            :key="color"
            @click="selectColor(color)"
            class="w-6 h-6 rounded-full border-2 transition-all"
            :style="{ backgroundColor: color }"
            :class="{ 'border-gray-800 dark:border-white scale-110': themeConfig.primaryColor === color }"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Sun, Moon, Monitor } from 'lucide-vue-next';
import { useTheme } from '../composables/useTheme';
import type { ThemeMode } from '../composables/useTheme';

const { themeConfig, isDark, setThemeMode, setPrimaryColor } = useTheme();

const showDropdown = ref(false);

const themeModes = [
  { value: 'light' as ThemeMode, label: '亮色模式', icon: Sun },
  { value: 'dark' as ThemeMode, label: '暗色模式', icon: Moon },
  { value: 'system' as ThemeMode, label: '跟随系统', icon: Monitor },
];

const presetColors = [
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
];

const selectMode = (mode: ThemeMode) => {
  setThemeMode(mode);
};

const selectColor = (color: string) => {
  setPrimaryColor(color);
};

// 点击外部关闭下拉菜单
const handleClickOutside = (e: MouseEvent) => {
  const target = e.target as HTMLElement;
  if (!target.closest('.relative')) {
    showDropdown.value = false;
  }
};

if (typeof window !== 'undefined') {
  window.addEventListener('click', handleClickOutside);
}
</script>
