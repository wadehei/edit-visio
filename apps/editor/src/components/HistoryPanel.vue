<template>
  <div class="border-t border-gray-200 dark:border-gray-700 p-4">
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300">操作历史</h3>
      <span class="text-xs text-gray-500 dark:text-gray-400">
        {{ history.past.length }} / 20
      </span>
    </div>

    <!-- 时间线 -->
    <div class="space-y-2 max-h-64 overflow-y-auto">
      <!-- 过去的操作 -->
      <div
        v-for="(item, index) in history.past.slice().reverse()"
        :key="'past-' + index"
        class="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-400 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
        @click="restoreTo(index)"
      >
        <div class="w-2 h-2 rounded-full bg-gray-400" />
        <span class="flex-1 truncate">{{ item.name || '编辑操作' }}</span>
        <span class="text-gray-400">{{ formatTime(item.timestamp) }}</span>
      </div>

      <!-- 当前状态 -->
      <div class="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs text-blue-600 dark:text-blue-400 border-2 border-blue-500">
        <div class="w-2 h-2 rounded-full bg-blue-500" />
        <span class="flex-1 truncate font-medium">当前状态</span>
        <span class="text-blue-400">现在</span>
      </div>

      <!-- 未来的操作（重做） -->
      <div
        v-for="(item, index) in history.future"
        :key="'future-' + index"
        class="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded text-xs text-gray-400 dark:text-gray-500 opacity-50 cursor-pointer hover:opacity-100 transition-opacity"
        @click="redoTo(index)"
      >
        <div class="w-2 h-2 rounded-full bg-gray-300" />
        <span class="flex-1 truncate">{{ item.name || '编辑操作' }}</span>
        <span class="text-gray-400">{{ formatTime(item.timestamp) }}</span>
      </div>
    </div>

    <!-- 控制按钮 -->
    <div class="flex gap-2 mt-3">
      <button
        @click="undo"
        :disabled="history.past.length === 0"
        class="flex-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        撤销
      </button>
      <button
        @click="redo"
        :disabled="history.future.length === 0"
        class="flex-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        重做
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useEditorStore } from '../stores/editorStore';

const { history, undo, redo } = useEditorStore();

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  return date.toLocaleDateString();
};

const restoreTo = (index: number) => {
  // 恢复到指定历史版本
  const steps = history.value.past.length - index;
  for (let i = 0; i < steps; i++) {
    undo();
  }
};

const redoTo = (index: number) => {
  // 重做到指定版本
  for (let i = 0; i <= index; i++) {
    redo();
  }
};
</script>
