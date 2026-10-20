<template>
  <div class="min-h-screen bg-[#f8fafc]">
    <!-- 顶栏 -->
    <header class="sticky top-0 z-30 glass border-b border-gray-200/60">
      <div class="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-md shadow-indigo-500/20">
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
          </div>
          <span class="text-[15px] font-semibold text-gray-800 tracking-tight">Page Builder</span>
        </div>
        <div class="flex items-center gap-5">
          <div class="flex items-center gap-2.5">
            <div class="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-violet-400 flex items-center justify-center text-white text-xs font-semibold uppercase shadow-sm">
              {{ authStore.username.charAt(0) }}
            </div>
            <span class="text-sm text-gray-500 font-medium hidden sm:block">{{ authStore.username }}</span>
          </div>
          <button
            @click="handleLogout"
            class="flex items-center gap-1.5 text-sm text-gray-400 hover:text-red-500 transition-colors duration-200"
            title="退出登录"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </header>

    <!-- 主体 -->
    <main class="max-w-7xl mx-auto px-6 lg:px-8 py-8">
      <!-- 操作栏 -->
      <div class="flex items-center justify-between mb-8">
        <div>
          <h2 class="text-xl font-bold text-gray-800 tracking-tight">我的项目</h2>
          <p class="text-sm text-gray-400 mt-0.5">管理和创建你的页面项目</p>
        </div>
        <button
          @click="showCreateDialog = true"
          class="group flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-medium rounded-xl shadow-md shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/30 hover:from-indigo-400 hover:to-violet-400 active:scale-[0.97] transition-all duration-200"
        >
          <svg class="w-4 h-4 group-hover:rotate-90 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          新建项目
        </button>
      </div>

      <!-- 加载骨架 -->
      <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <div v-for="i in 6" :key="i" class="rounded-2xl bg-white border border-gray-100 overflow-hidden">
          <div class="h-40 skeleton" />
          <div class="p-5 space-y-3">
            <div class="h-4 skeleton w-2/3" />
            <div class="h-3 skeleton w-full" />
            <div class="h-3 skeleton w-1/2" />
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else-if="!projects.length" class="flex flex-col items-center justify-center py-24">
        <div class="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-50 to-violet-50 flex items-center justify-center mb-6">
          <svg class="w-10 h-10 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 class="text-base font-semibold text-gray-700 mb-1">还没有项目</h3>
        <p class="text-sm text-gray-400 mb-6">创建你的第一个项目，开始搭建页面</p>
        <button
          @click="showCreateDialog = true"
          class="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-medium rounded-xl shadow-md shadow-indigo-500/20 hover:shadow-lg transition-all duration-200"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          创建项目
        </button>
      </div>

      <!-- 项目网格 -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <div
          v-for="(project, index) in projects"
          :key="project.projectId"
          class="stagger-item card-lift bg-white rounded-2xl border border-gray-100 overflow-hidden cursor-pointer group"
          @click="openProject(project)"
        >
          <!-- 封面 -->
          <div class="relative h-40 bg-gradient-to-br from-indigo-50 via-violet-50 to-purple-50 flex items-center justify-center overflow-hidden">
            <!-- 装饰图案 -->
            <div class="absolute inset-0 opacity-40 pattern-grid" />
            <div v-if="!project.coverImage" class="relative z-10 flex flex-col items-center gap-2">
              <svg class="w-12 h-12 text-indigo-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <img v-else :src="project.coverImage" class="relative z-10 w-full h-full object-cover" />
            <!-- hover 遮罩 -->
            <div class="absolute inset-0 bg-indigo-900/0 group-hover:bg-indigo-900/10 transition-colors duration-300" />
          </div>

          <!-- 信息 -->
          <div class="p-5">
            <h3 class="font-semibold text-gray-800 truncate text-[15px] leading-snug">{{ project.name }}</h3>
            <p class="text-xs text-gray-400 mt-1.5 line-clamp-2 leading-relaxed">{{ project.description || '暂无描述' }}</p>
            <div class="flex items-center justify-between mt-4 text-xs text-gray-400">
              <div class="flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {{ project.pageCount || 0 }} 个页面
              </div>
              <span>{{ formatDate(project.updatedAt) }}</span>
            </div>
          </div>

          <!-- 底部操作 -->
          <div class="px-5 pb-4 flex gap-2 -mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              @click.stop="renameProject(project)"
              class="flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium text-gray-500 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              重命名
            </button>
            <button
              @click.stop="handleDeleteProject(project)"
              class="flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium text-red-400 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              删除
            </button>
          </div>
        </div>
      </div>
    </main>

    <!-- 新建项目弹窗 -->
    <Transition name="modal">
      <div
        v-if="showCreateDialog"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="showCreateDialog = false"
      >
        <!-- 遮罩 -->
        <div class="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" />
        <!-- 弹窗 -->
        <div class="modal-content relative bg-white rounded-2xl shadow-2xl shadow-gray-900/10 w-full max-w-[440px] p-6">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-bold text-gray-800">新建项目</h3>
            <button @click="showCreateDialog = false" class="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div class="space-y-4">
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1.5 ml-0.5">项目名称</label>
              <input
                v-model="newProjectName"
                type="text"
                placeholder="输入项目名称"
                class="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder:text-gray-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all duration-200"
                @keyup.enter="handleCreateProject"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1.5 ml-0.5">
                项目描述 <span class="text-gray-300">（可选）</span>
              </label>
              <textarea
                v-model="newProjectDesc"
                placeholder="简要描述这个项目"
                rows="3"
                class="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder:text-gray-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all duration-200 resize-none"
              />
            </div>
          </div>
          <div class="flex gap-3 justify-end mt-6 pt-4 border-t border-gray-100">
            <button
              @click="showCreateDialog = false"
              class="px-5 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-xl transition"
            >
              取消
            </button>
            <button
              @click="handleCreateProject"
              :disabled="!newProjectName.trim() || creating"
              class="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-violet-500 rounded-xl shadow-md shadow-indigo-500/20 hover:shadow-lg hover:from-indigo-400 hover:to-violet-400 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {{ creating ? '创建中...' : '创建' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/authStore';
import * as projectApi from '../api/project';
import type { Project } from '../api/project';
import { toast } from '../utils/toast';
import { logger } from '../utils/logger';

const router = useRouter();
const authStore = useAuthStore();

const loading = ref(true);
const projects = ref<Project[]>([]);
const showCreateDialog = ref(false);
const newProjectName = ref('');
const newProjectDesc = ref('');
const creating = ref(false);

onMounted(async () => {
  await loadProjects();
});

async function loadProjects() {
  loading.value = true;
  try {
    const { data } = await projectApi.getProjects({ page: 1, pageSize: 50 });
    projects.value = data.data.list;
  } catch (err: unknown) {
    const error = err as Error;
    logger.error('HomePage', '加载项目失败', error);
  } finally {
    loading.value = false;
  }
}

function openProject(project: Project) {
  router.push(`/editor/${project.projectId}`);
}

async function handleCreateProject() {
  if (!newProjectName.value.trim()) return;
  creating.value = true;
  try {
    await projectApi.createProject({
      name: newProjectName.value.trim(),
      description: newProjectDesc.value.trim() || undefined,
    });
    showCreateDialog.value = false;
    newProjectName.value = '';
    newProjectDesc.value = '';
    await loadProjects();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '未知错误';
    toast('创建失败: ' + msg, 'error');
  } finally {
    creating.value = false;
  }
}

async function handleDeleteProject(project: Project) {
  if (!confirm(`确定删除项目「${project.name}」？`)) return;
  try {
    await projectApi.deleteProject(String(project.projectId));
    await loadProjects();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '未知错误';
    toast('删除失败: ' + msg, 'error');
  }
}

function renameProject(project: Project) {
  const name = prompt('新名称:', project.name);
  if (!name || name === project.name) return;
  projectApi.updateProject(String(project.projectId), { name }).then(() => loadProjects());
}

async function handleLogout() {
  await authStore.logout();
  router.push('/login');
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return '今天';
  if (diffDays === 1) return '昨天';
  if (diffDays < 7) return `${diffDays}天前`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前`;
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}
</script>
