<template>
  <div class="absolute top-4 right-4 z-30 bg-white rounded-lg shadow-lg p-2 flex gap-2">
    <button
      v-for="device in deviceList"
      :key="device.type"
      @click="setDevice(device.type)"
      class="px-3 py-1.5 rounded text-sm transition-all"
      :class="currentDevice === device.type
        ? 'bg-blue-500 text-white'
        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
      :title="device.name"
    >
      <span class="mr-1">{{ device.icon }}</span>
      {{ device.name }}
    </button>

    <button
      v-if="currentDevice === 'custom'"
      @click="showCustomSizeDialog = true"
      class="px-3 py-1.5 rounded text-sm bg-gray-100 text-gray-700 hover:bg-gray-200"
      title="自定义尺寸"
    >
      ⚙️
    </button>

    <!-- 自定义尺寸对话框 -->
    <div
      v-if="showCustomSizeDialog"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      @click.self="showCustomSizeDialog = false"
    >
      <div class="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
        <h3 class="text-lg font-semibold mb-4">自定义尺寸</h3>
        <div class="space-y-4">
          <div>
            <label class="block text-sm text-gray-700 mb-1">宽度 (px)</label>
            <input
              type="number"
              v-model="tempWidth"
              class="w-full px-3 py-2 border border-gray-300 rounded"
            />
          </div>
          <div>
            <label class="block text-sm text-gray-700 mb-1">高度 (px)</label>
            <input
              type="number"
              v-model="tempHeight"
              class="w-full px-3 py-2 border border-gray-300 rounded"
            />
          </div>
        </div>
        <div class="flex gap-2 mt-6">
          <button
            @click="showCustomSizeDialog = false"
            class="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            取消
          </button>
          <button
            @click="applyCustomSize"
            class="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            应用
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useDevicePreview } from '../composables/useDevicePreview';
import type { DeviceType } from '../composables/useDevicePreview';

const { currentDevice, devices, setDevice, setCustomSize } = useDevicePreview();

const deviceList = Object.values(devices);
const showCustomSizeDialog = ref(false);
const tempWidth = ref(375);
const tempHeight = ref(667);

const applyCustomSize = () => {
  setCustomSize(tempWidth.value, tempHeight.value);
  showCustomSizeDialog.value = false;
};
</script>
