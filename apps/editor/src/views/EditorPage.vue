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
            v-for="page in pages"
            :key="page.pageId"
            @click="currentPageTitle = page.title"
            class="px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200"
            :class="currentPageTitle === page.title
              ? 'bg-white text-gray-700 shadow-sm'
              : 'text-gray-400 hover:text-gray-600'"
          >
            {{ page.title }}
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

          <!-- 页面选中状态 -->
          <div v-else class="bg-white rounded-2xl shadow-sm border border-gray-100 w-full max-w-[375px] min-h-[500px] overflow-hidden">
            <!-- 手机模拟框顶部 -->
            <div class="h-8 bg-gray-50 border-b border-gray-100 flex items-center justify-center">
              <div class="w-16 h-1 bg-gray-200 rounded-full" />
            </div>
            <div class="p-6 flex flex-col items-center justify-center min-h-[450px]">
              <svg class="w-12 h-12 text-indigo-100 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p class="text-sm font-medium text-gray-600">{{ currentPageTitle }}</p>
              <p class="text-xs text-gray-400 mt-1">编辑器画布（待实现）</p>
            </div>
          </div>
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
import ComponentPanel from '../components/ComponentPanel.vue';
import PropertyPanel from '../components/PropertyPanel.vue';

const route = useRoute();
const router = useRouter();

const projectId = route.params.projectId as string;
const projectName = ref('');
const pages = ref<PageVO[]>([]);
const loadingPages = ref(true);
const currentPageTitle = ref('');

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
      currentPageTitle.value = pages.value[0].title;
    }
  } catch {
    console.error('加载页面列表失败');
  } finally {
    loadingPages.value = false;
  }
});

async function handleCreatePage() {
  const title = prompt('页面名称:', '新页面');
  if (!title) return;
  try {
    const { data } = await pageApi.createPage(projectId, { title, isHome: true });
    pages.value.push(data.data);
    currentPageTitle.value = data.data.title;
  } catch (err: unknown) {
    const error = err as Error;
    alert('创建失败: ' + error.message);
  }
}
</script>
