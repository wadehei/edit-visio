<template>
  <div class="flex flex-col h-screen bg-gray-50">
    <!-- 顶栏 -->
    <header class="h-14 bg-white border-b border-gray-200/80 flex items-center justify-between px-4 shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div class="flex items-center gap-3">
        <button
          @click="router.push('/')"
          class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-200"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          返回
        </button>
        <div class="w-px h-5 bg-gray-200" />
        <div class="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-sm shadow-indigo-500/20">
          <svg class="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
          </svg>
        </div>
        <div class="flex flex-col">
          <span class="text-sm font-semibold text-gray-800 leading-tight">{{ projectName || '加载中...' }}</span>
          <span class="text-[11px] text-gray-400 leading-tight">ID: {{ projectId }}</span>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <!-- 页面切换 -->
        <div v-if="pages.length > 0" class="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
          <button
            v-for="pg in pages"
            :key="pg.pageId"
            @click="handleSelectPage(pg)"
            class="px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200"
            :class="currentPageId === pg.pageId
              ? 'bg-white text-gray-700 shadow-sm'
              : 'text-gray-400 hover:text-gray-600'"
          >
            {{ pg.title }}
          </button>
        </div>

        <!-- 创建页面 -->
        <button
          @click="handleCreatePage"
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-500 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors duration-200"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          新建页面
        </button>

        <div class="w-px h-5 bg-gray-200" />

        <!-- 保存状态 -->
        <span v-if="autoSaveStatus" class="text-xs text-gray-400">{{ autoSaveStatus }}</span>

        <div class="flex items-center gap-1.5 text-xs text-gray-400">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {{ pages.length }} 个页面
        </div>
      </div>
    </header>

    <!-- 编辑器主体 -->
    <div class="flex flex-1 overflow-hidden">
      <!-- 左侧组件面板 -->
      <ComponentPanel />

      <!-- 画布区域 -->
      <div class="flex-1 bg-[#f1f5f9] relative overflow-auto">
        <!-- 网格背景 -->
        <div class="absolute inset-0 opacity-30"
          style="background-image: radial-gradient(circle, #94a3b8 0.8px, transparent 0.8px); background-size: 20px 20px;" />

        <div class="relative z-10 flex items-center justify-center min-h-full p-8">
          <!-- 加载中 -->
          <div v-if="loadingPages" class="flex flex-col items-center gap-3">
            <div class="w-10 h-10 rounded-full border-[3px] border-indigo-200 border-t-indigo-500 animate-spin" />
            <span class="text-sm text-gray-400">加载页面中...</span>
          </div>

          <!-- 空状态 -->
          <div v-else-if="!pages.length" class="text-center">
            <div class="w-16 h-16 rounded-2xl bg-white shadow-sm border border-gray-100 flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <p class="text-sm text-gray-500 font-medium mb-1">还没有页面</p>
            <p class="text-xs text-gray-400 mb-5">创建一个页面开始搭建</p>
            <button
              @click="handleCreatePage"
              class="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-medium rounded-xl shadow-md shadow-indigo-500/20 hover:shadow-lg hover:from-indigo-400 hover:to-violet-400 transition-all duration-200"
            >
              创建页面
            </button>
          </div>

          <!-- 编辑器画布 -->
          <ErrorBoundary v-else>
            <Canvas />
          </ErrorBoundary>
        </div>
      </div>

      <!-- 右侧属性面板 -->
      <PropertyPanel />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import * as projectApi from '../api/project';
import * as pageApi from '../api/page';
import type { PageVO } from '../api/page';
import { toPageSchema } from '../api/page';
import { useEditorStore } from '../stores/editorStore';
import { useAutoSave } from '../composables/useAutoSave';
import { useKeyboardShortcuts } from '../composables/useKeyboardShortcuts';
import { toast } from '../utils/toast';
import { logger } from '../utils/logger';
import ComponentPanel from '../components/ComponentPanel.vue';
import PropertyPanel from '../components/PropertyPanel.vue';
import Canvas from '../components/Canvas.vue';
import ErrorBoundary from '../components/ErrorBoundary.vue';

const route = useRoute();
const router = useRouter();
const editorStore = useEditorStore();

const projectId = route.params.projectId as string;
const projectName = ref('');
const pages = ref<PageVO[]>([]);
const loadingPages = ref(true);
const currentPageId = ref<number | null>(null);
const autoSaveStatus = ref('');

// 启用快捷键和自动保存
useKeyboardShortcuts();
useAutoSave();

onMounted(async () => {
  try {
    const { data } = await projectApi.getProject(projectId);
    projectName.value = data.data.name;
  } catch {
    projectName.value = '项目加载失败';
  }

  try {
    const { data } = await pageApi.getPages(projectId);
    pages.value = data.data.list;
    if (pages.value.length > 0) {
      // 选择首页或第一个页面
      const homePage = pages.value.find(p => p.isHome) || pages.value[0];
      handleSelectPage(homePage);
    }
  } catch {
    logger.error('EditorPage', '加载页面列表失败');
  } finally {
    loadingPages.value = false;
  }
});

function handleSelectPage(pg: PageVO) {
  currentPageId.value = pg.pageId;
  if (pg.schema && typeof pg.schema === 'object') {
    editorStore.setPage(toPageSchema(pg.schema));
  }
}

async function handleCreatePage() {
  const title = prompt('页面名称:', '新页面');
  if (!title) return;
  try {
    const { data } = await pageApi.createPage(projectId, { title, isHome: true });
    pages.value.push(data.data);
    handleSelectPage(data.data);
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : '未知错误';
    toast('创建失败: ' + error, 'error');
  }
}
</script>
