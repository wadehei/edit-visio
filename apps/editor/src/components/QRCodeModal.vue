<template>
  <div
    v-if="showModal"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    @click.self="closeModal"
  >
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200">扫码预览</h2>
        <button @click="closeModal" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          ×
        </button>
      </div>

      <div class="flex flex-col items-center">
        <div v-if="qrCodeUrl" class="mb-4">
          <img :src="qrCodeUrl" alt="QR Code" class="border border-gray-200 dark:border-gray-700 rounded" />
        </div>
        <div v-else class="w-64 h-64 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded">
          <span class="text-gray-400">生成中...</span>
        </div>

        <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
          使用手机扫描二维码预览页面
        </p>

        <div class="w-full">
          <label class="block text-sm text-gray-700 dark:text-gray-300 mb-2">预览地址</label>
          <input
            type="text"
            :value="previewUrl"
            readonly
            class="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-sm text-gray-600 dark:text-gray-400"
          />
        </div>

        <div class="flex gap-2 mt-4 w-full">
          <button
            @click="copyUrl"
            class="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            复制地址
          </button>
          <button
            @click="openInNewTab"
            class="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            新窗口打开
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import QRCode from 'qrcode';
import { useEditorStore } from '../stores/editorStore';
import { toast } from '../utils/toast';
import { logger } from '../utils/logger';

const { page } = useEditorStore();

const showModal = ref(false);
const qrCodeUrl = ref('');
const previewUrl = ref('');

const openModal = async () => {
  showModal.value = true;
  await generateQRCode();
};

const closeModal = () => {
  showModal.value = false;
};

const generateQRCode = async () => {
  try {
    // 生成预览 URL（实际项目中应该是真实的预览地址）
    const previewData = JSON.stringify(page.value);
    const encodedData = encodeURIComponent(previewData);
    const url = `${window.location.origin}/preview?data=${encodedData}`;
    previewUrl.value = url;

    // 生成二维码
    const qrCode = await QRCode.toDataURL(url, {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
    qrCodeUrl.value = qrCode;
  } catch (error) {
    logger.error('QRCode', '生成二维码失败', error);
  }
};

const copyUrl = async () => {
  try {
    await navigator.clipboard.writeText(previewUrl.value);
    toast('地址已复制到剪贴板', 'success');
  } catch (error) {
    logger.error('QRCode', '复制失败', error);
  }
};

const openInNewTab = () => {
  window.open(previewUrl.value, '_blank');
};

watch(() => page.value, generateQRCode, { deep: true });

defineExpose({ openModal });
</script>
