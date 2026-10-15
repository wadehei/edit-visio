<template>
  <div
    class="flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 rounded-lg transition-colors cursor-move relative group"
    draggable="true"
    @dragstart="$emit('dragstart', $event)"
    @dragend="$emit('dragend', $event)"
  >
    <!-- 收藏按钮 -->
    <button
      @click.stop="$emit('toggle-favorite')"
      class="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
      :class="isFavorite ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'"
    >
      <Star :size="12" :fill="isFavorite ? 'currentColor' : 'none'" />
    </button>

    <div class="w-8 h-8 mb-2 flex items-center justify-center text-2xl">
      <span v-if="component.type === 'text'">📝</span>
      <span v-else-if="component.type === 'button'">🔘</span>
      <span v-else-if="component.type === 'image'">🖼️</span>
      <span v-else-if="component.type === 'container'">📦</span>
      <span v-else-if="component.type === 'divider'">➖</span>
      <span v-else-if="component.type === 'spacer'">↕️</span>
      <span v-else-if="component.type === 'card'">🎴</span>
      <span v-else-if="component.type === 'badge'">🏷️</span>
      <span v-else-if="component.type === 'richText'">📄</span>
      <span v-else-if="component.type === 'input'">⌨️</span>
      <span v-else-if="component.type === 'video'">📹</span>
      <span v-else-if="component.type === 'audio'">🎵</span>
      <span v-else-if="component.type === 'map'">🗺️</span>
    </div>
    <span class="text-xs text-gray-700 dark:text-gray-300">{{ component.label }}</span>
  </div>
</template>

<script setup lang="ts">
import { Star } from 'lucide-vue-next';
import type { ComponentMeta } from '@page-builder/shared';

interface Props {
  component: ComponentMeta;
  isFavorite: boolean;
}

defineProps<Props>();

defineEmits<{
  (e: 'dragstart', event: DragEvent): void;
  (e: 'dragend', event: DragEvent): void;
  (e: 'toggle-favorite'): void;
}>();
</script>
