<template>
  <div v-if="hasError" class="flex flex-col items-center justify-center min-h-[300px] p-8 text-center">
    <div class="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mb-4">
      <svg class="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    </div>
    <h3 class="text-sm font-medium text-gray-900 mb-1">组件渲染出错</h3>
    <p class="text-xs text-gray-500 mb-4">{{ errorMessage }}</p>
    <button
      @click="reset"
      class="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
    >
      重试
    </button>
  </div>
  <slot v-else />
</template>

<script setup lang="ts">
import { ref, onErrorCaptured } from 'vue';
import { logger } from '../utils/logger';

const hasError = ref(false);
const errorMessage = ref('');

onErrorCaptured((err: Error) => {
  hasError.value = true;
  errorMessage.value = err.message || '未知错误';
  logger.error('ErrorBoundary', err.message, err);
  // 返回 false 阻止错误继续向上传播
  return false;
});

function reset() {
  hasError.value = false;
  errorMessage.value = '';
}
</script>
