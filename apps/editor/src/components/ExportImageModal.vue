<template>
  <div
    v-if="showModal"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    @click.self="closeModal"
  >
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
      <h2 class="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">导出为图片</h2>

      <div class="space-y-4">
        <div>
          <label class="block text-sm text-gray-700 dark:text-gray-300 mb-2">导出格式</label>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="format in formats"
              :key="format.value"
              @click="selectedFormat = format.value"
              class="px-4 py-3 border-2 rounded-lg text-sm transition-all"
              :class="selectedFormat === format.value
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'"
            >
              {{ format.label }}
            </button>
          </div>
        </div>

        <div v-if="selectedFormat === 'png' || selectedFormat === 'jpeg'">
          <label class="block text-sm text-gray-700 dark:text-gray-300 mb-2">
            质量: {{ quality }}%
          </label>
          <input
            v-model.number="quality"
            type="range"
            min="10"
            max="100"
            step="10"
            class="w-full"
          />
        </div>

        <div>
          <label class="block text-sm text-gray-700 dark:text-gray-300 mb-2">背景</label>
          <select
            v-model="background"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded"
          >
            <option value="white">白色背景</option>
            <option value="transparent">透明背景</option>
            <option value="page">页面背景色</option>
          </select>
        </div>
      </div>

      <div class="flex gap-2 mt-6">
        <button
          @click="closeModal"
          class="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
        >
          取消
        </button>
        <button
          @click="exportImage"
          :disabled="exporting"
          class="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {{ exporting ? '导出中...' : '导出' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useEditorStore } from '../stores/editorStore';
import { toast } from '../utils/toast';
import { logger } from '../utils/logger';

const { page } = useEditorStore();

const showModal = ref(false);
const selectedFormat = ref<'png' | 'jpeg' | 'svg'>('png');
const quality = ref(90);
const background = ref<'white' | 'transparent' | 'page'>('white');
const exporting = ref(false);

const formats = [
  { value: 'png' as const, label: 'PNG' },
  { value: 'jpeg' as const, label: 'JPEG' },
  { value: 'svg' as const, label: 'SVG' },
];

const openModal = () => {
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
};

const exportImage = async () => {
  exporting.value = true;

  try {
    // 这里应该使用 html2canvas 或类似库
    // 为了简化，我们使用一个模拟的导出
    toast(`导出功能开发中... 格式: ${selectedFormat.value.toUpperCase()}, 质量: ${quality.value}%`, 'info');

    // 实际实现需要：
    // 1. 使用 html2canvas 捕获画布
    // 2. 转换为指定格式
    // 3. 下载文件
  } catch (error) {
    logger.error('ExportImage', '导出失败', error);
    toast('导出失败，请重试', 'error');
  } finally {
    exporting.value = false;
    closeModal();
  }
};

defineExpose({ openModal });
</script>
