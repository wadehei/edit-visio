<template>
  <div class="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4">
    <div class="flex items-center gap-2">
      <h1 class="text-lg font-semibold text-gray-800">页面装修平台</h1>
      <span v-if="autoSaveStatus" class="text-xs text-gray-400">{{ autoSaveStatus }}</span>
    </div>

    <div class="flex items-center gap-2">
      <button
        @click="undo"
        :disabled="history.past.length === 0"
        class="p-2 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title="撤销 (Ctrl+Z)"
      >
        <Undo :size="18" />
      </button>

      <button
        @click="redo"
        :disabled="history.future.length === 0"
        class="p-2 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title="重做 (Ctrl+Y)"
      >
        <Redo :size="18" />
      </button>

      <div class="w-px h-6 bg-gray-300 mx-2" />

      <button
        @click="handleDeleteSelected"
        :disabled="!selectedId"
        class="p-2 hover:bg-red-50 text-red-600 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title="删除组件 (Delete)"
      >
        <Trash2 :size="18" />
      </button>

      <button
        @click="$emit('openTemplateModal')"
        class="p-2 hover:bg-purple-50 text-purple-600 rounded transition-colors"
        title="使用模板"
      >
        <Layout :size="18" />
      </button>

      <div class="w-px h-6 bg-gray-300 mx-2" />

      <button
        @click="handleSave"
        class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors flex items-center gap-1"
        title="保存 (Ctrl+S)"
      >
        <Save :size="14" />
        保存
      </button>

      <button
        @click="handleExportCode"
        class="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm font-medium transition-colors flex items-center gap-1"
        title="导出代码"
      >
        <Code :size="14" />
        导出
      </button>

      <button
        @click="handlePreview"
        class="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium transition-colors flex items-center gap-1"
        title="预览"
      >
        <Eye :size="14" />
        预览
      </button>

      <div class="w-px h-6 bg-gray-300 mx-2" />

      <span class="text-sm text-gray-600 px-2">{{ authStore.username }}</span>

      <button
        @click="handleLogout"
        class="p-2 hover:bg-red-50 text-red-600 rounded transition-colors"
        title="退出登录"
      >
        <LogOut :size="18" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useEditorStore } from '../stores/editorStore';
import { useAuthStore } from '../stores/authStore';
import { saveAsJSON } from '@page-builder/shared';
import { Undo, Redo, Trash2, Save, Eye, Layout, Code, LogOut } from 'lucide-vue-next';
import { exportToHTML, exportToVue } from '../utils/codeExport';
import { toast } from '../utils/toast';
import { logger } from '../utils/logger';

const router = useRouter();
const { undo, redo, history, page, selectedId, deleteComponent } = useEditorStore();
const authStore = useAuthStore();

const autoSaveStatus = ref('');

defineEmits<{
  (e: 'openTemplateModal'): void;
}>();

const handleDeleteSelected = () => {
  if (selectedId.value && confirm('确定要删除选中的组件吗？')) {
    deleteComponent(selectedId.value);
  }
};

const handleSave = () => {
  saveAsJSON(page.value);
};

const handleExportCode = () => {
  const format = prompt('请选择导出格式（输入数字）：\n1. HTML\n2. Vue 组件');
  if (!format) return;

  let content = '';
  let filename = '';
  let mimeType = '';

  if (format === '1') {
    content = exportToHTML(page.value);
    filename = `${page.value.name}.html`;
    mimeType = 'text/html';
  } else if (format === '2') {
    content = exportToVue(page.value);
    filename = `${page.value.name}.vue`;
    mimeType = 'text/plain';
  } else {
    toast('无效的导出选项', 'warning');
    return;
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const handlePreview = () => {
  const json = JSON.stringify(page.value);
  localStorage.setItem('preview-page', json);
  window.open('/preview', '_blank');
};

const handleLogout = async () => {
  try {
    await authStore.logout();
  } catch (error) {
    logger.error('Toolbar', 'Failed to logout', error);
  } finally {
    router.push('/login');
    toast('已退出登录', 'info');
  }
};
</script>
