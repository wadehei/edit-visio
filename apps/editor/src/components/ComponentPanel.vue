<template>
  <div class="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
    <div class="p-4 border-b border-gray-200 dark:border-gray-700">
      <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">组件库</h2>

      <!-- 搜索框 -->
      <div class="relative">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索组件..."
          class="w-full px-3 py-2 pl-9 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-gray-200"
        />
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" :size="16" />
        <button
          v-if="searchQuery"
          @click="searchQuery = ''"
          class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          ×
        </button>
      </div>

      <!-- 分类筛选 -->
      <div class="flex gap-2 mt-3">
        <button
          v-for="category in categories"
          :key="category.value"
          @click="selectedCategory = category.value"
          class="px-3 py-1 text-xs rounded transition-colors"
          :class="selectedCategory === category.value
            ? 'bg-blue-500 text-white'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'"
        >
          {{ category.label }}
        </button>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto p-4">
      <!-- 收藏的组件 -->
      <div v-if="favoriteComponents.length > 0 && !searchQuery" class="mb-6">
        <h3 class="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3 flex items-center gap-1">
          <Star :size="14" class="text-yellow-500" />
          收藏的组件
        </h3>
        <div class="grid grid-cols-2 gap-3">
          <ComponentItem
            v-for="component in favoriteComponents"
            :key="component.type"
            :component="component"
            :is-favorite="true"
            @dragstart="handleDragStart($event, component.type)"
            @dragend="handleDragEnd"
            @toggle-favorite="toggleFavorite(component.type)"
          />
        </div>
      </div>

      <!-- 搜索结果 -->
      <div v-if="searchQuery">
        <h3 class="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">
          搜索结果 ({{ filteredComponents.length }})
        </h3>
        <div v-if="filteredComponents.length === 0" class="text-center py-8">
          <p class="text-sm text-gray-400">未找到匹配的组件</p>
        </div>
        <div v-else class="grid grid-cols-2 gap-3">
          <ComponentItem
            v-for="component in filteredComponents"
            :key="component.type"
            :component="component"
            :is-favorite="isFavorite(component.type)"
            @dragstart="handleDragStart($event, component.type)"
            @dragend="handleDragEnd"
            @toggle-favorite="toggleFavorite(component.type)"
          />
        </div>
      </div>

      <!-- 分类组件 -->
      <div v-else>
        <div v-for="category in componentCategories" :key="category.name">
          <h3 class="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">
            {{ category.name }}
          </h3>
          <div class="grid grid-cols-2 gap-3 mb-6">
            <ComponentItem
              v-for="component in category.components"
              :key="component.type"
              :component="component"
              :is-favorite="isFavorite(component.type)"
              @dragstart="handleDragStart($event, component.type)"
              @dragend="handleDragEnd"
              @toggle-favorite="toggleFavorite(component.type)"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Search, Star } from 'lucide-vue-next';
import { getAllMetas } from '../registry/componentRegistry';
import type { ComponentMeta } from '@page-builder/shared';
import { useEditorStore } from '../stores/editorStore';
import ComponentItem from './ComponentItem.vue';
import { logger } from '../utils/logger';

const allComponents: ComponentMeta[] = getAllMetas();

const { setDragging } = useEditorStore();

const searchQuery = ref('');
const selectedCategory = ref('all');
const favoriteComponents = ref<string[]>(loadFavorites());

const categories = [
  { value: 'all', label: '全部' },
  { value: 'basic', label: '基础' },
  { value: 'media', label: '媒体' },
  { value: 'form', label: '表单' },
];

const componentCategories = computed(() => {
  const filtered = selectedCategory.value === 'all'
    ? allComponents
    : allComponents.filter(c => {
        if (selectedCategory.value === 'basic') {
          return ['text', 'button', 'image', 'container', 'divider', 'spacer', 'card', 'badge'].includes(c.type);
        }
        if (selectedCategory.value === 'media') {
          return ['video', 'audio', 'map', 'image'].includes(c.type);
        }
        if (selectedCategory.value === 'form') {
          return ['input', 'button'].includes(c.type);
        }
        return true;
      });

  return [
    {
      name: '基础组件',
      components: filtered.filter(c => ['text', 'button', 'image', 'container'].includes(c.type)),
    },
    {
      name: '布局组件',
      components: filtered.filter(c => ['divider', 'spacer', 'card'].includes(c.type)),
    },
    {
      name: '表单组件',
      components: filtered.filter(c => ['input', 'badge'].includes(c.type)),
    },
    {
      name: '内容组件',
      components: filtered.filter(c => ['richText'].includes(c.type)),
    },
    {
      name: '媒体组件',
      components: filtered.filter(c => ['video', 'audio', 'map'].includes(c.type)),
    },
  ].filter(cat => cat.components.length > 0);
});

const filteredComponents = computed(() => {
  if (!searchQuery.value) return [];
  const query = searchQuery.value.toLowerCase();
  return allComponents.filter(c =>
    c.label.toLowerCase().includes(query) ||
    c.type.toLowerCase().includes(query)
  );
});

const handleDragStart = (event: DragEvent, componentType: string) => {
  if (event.dataTransfer) {
    event.dataTransfer.setData('componentType', componentType);
    event.dataTransfer.effectAllowed = 'copy';
    setDragging(true);
  }
};

const handleDragEnd = () => {
  setDragging(false);
};

const isFavorite = (type: string) => {
  return favoriteComponents.value.includes(type);
};

const toggleFavorite = (type: string) => {
  const index = favoriteComponents.value.indexOf(type);
  if (index > -1) {
    favoriteComponents.value.splice(index, 1);
  } else {
    favoriteComponents.value.push(type);
  }
  saveFavorites();
};

function loadFavorites(): string[] {
  try {
    const stored = localStorage.getItem('favorite-components');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveFavorites() {
  try {
    localStorage.setItem('favorite-components', JSON.stringify(favoriteComponents.value));
  } catch (error) {
    logger.error('ComponentPanel', 'Failed to save favorites', error);
  }
}
</script>
