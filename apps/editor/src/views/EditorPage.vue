<template>
  <div class="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
    <!-- 全局保存指示：存在未落盘改动时显示 -->
    <div
      v-if="pendingSave"
      class="h-0.5 shrink-0 overflow-hidden bg-brand-100 dark:bg-brand-900/40"
      title="正在保存..."
    >
      <div class="h-full w-1/2 bg-brand-500 animate-pulse" />
    </div>

    <!-- 顶栏 -->
    <header
      class="h-14 bg-white dark:bg-gray-800 border-b border-gray-200/80 dark:border-gray-700 flex items-center justify-between px-4 shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
    >
      <div class="flex items-center gap-3">
        <button
          class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-200"
          @click="router.push('/')"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 19l-7-7 7-7"
            />
          </svg>
          返回
        </button>
        <div class="w-px h-5 bg-gray-200" />
        <div
          class="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-sm shadow-indigo-500/20"
        >
          <svg class="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
            />
          </svg>
        </div>
        <div class="flex flex-col">
          <span class="text-sm font-semibold text-gray-800 leading-tight">{{
            projectName || '加载中...'
          }}</span>
          <span class="text-[11px] text-gray-400 leading-tight">ID: {{ projectId }}</span>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <!-- 页面切换 -->
        <div v-if="pages.length > 0" class="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
          <button
            v-for="pg in pages"
            :key="pg.pageId"
            class="px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200"
            :class="
              currentPageId === pg.pageId
                ? 'bg-white text-gray-700 shadow-sm'
                : 'text-gray-400 hover:text-gray-600'
            "
            @click="handleSelectPage(pg)"
          >
            {{ pg.title }}
          </button>
        </div>

        <!-- 创建页面 -->
        <button
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-500 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors duration-200"
          @click="handleCreatePage"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 4v16m8-8H4"
            />
          </svg>
          新建页面
        </button>

        <div class="w-px h-5 bg-gray-200" />

        <!-- 保存状态 -->
        <span
          v-if="saveLabel"
          class="flex items-center gap-1 text-xs"
          :class="saveStatus === 'error' ? 'text-red-500' : 'text-gray-400 dark:text-gray-500'"
        >
          <Loader2 v-if="saveStatus === 'saving'" :size="12" class="animate-spin" />
          <Check v-else-if="saveStatus === 'saved'" :size="12" class="text-green-500" />
          <AlertCircle v-else :size="12" />
          {{ saveLabel }}
        </span>

        <div class="flex items-center gap-1.5 text-xs text-gray-400">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          {{ pages.length }} 个页面
        </div>

        <div class="w-px h-5 bg-gray-200" />

        <!-- 编辑操作 -->
        <button
          class="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
          title="撤销 (Ctrl+Z)"
          :disabled="history.past.length === 0"
          @click="undo"
        >
          <Undo :size="16" />
        </button>

        <button
          class="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
          title="重做 (Ctrl+Y)"
          :disabled="history.future.length === 0"
          @click="redo"
        >
          <Redo :size="16" />
        </button>

        <button
          class="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
          title="删除组件 (Delete)"
          :disabled="!selectedId"
          @click="handleDeleteSelected"
        >
          <Trash2 :size="16" />
        </button>

        <!-- 多选状态提示（Shift+点击组件/图层可多选） -->
        <span
          v-if="isMultiSelect"
          class="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-blue-600 bg-blue-50 rounded-md"
          title="按住 Shift 点击组件或图层可连续多选"
        >
          已选 {{ selectedIds.length }} 个
        </span>

        <button
          class="p-1.5 rounded-lg text-gray-400 hover:text-violet-500 hover:bg-violet-50 transition-colors duration-200"
          title="使用模板"
          @click="openTemplateModal"
        >
          <Layout :size="16" />
        </button>

        <div class="w-px h-5 bg-gray-200" />

        <!-- 视图辅助：历史 / 快捷键 / AI / 主题 -->
        <button
          class="p-1.5 rounded-lg transition-colors duration-200"
          :class="
            showHistory
              ? 'text-indigo-500 bg-indigo-50'
              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
          "
          title="操作历史"
          @click="showHistory = !showHistory"
        >
          <History :size="16" />
        </button>

        <button
          class="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors duration-200"
          title="快捷键列表"
          @click="openShortcuts"
        >
          <Keyboard :size="16" />
        </button>

        <AIAssistant />

        <ThemeSwitcher />

        <div class="w-px h-5 bg-gray-200" />

        <!-- 导出 / 预览 -->
        <div class="relative">
          <!-- 点击外部关闭 -->
          <div v-if="showExportMenu" class="fixed inset-0 z-40" @click="showExportMenu = false" />

          <button
            class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200"
            title="导出"
            @click="showExportMenu = !showExportMenu"
          >
            <Code :size="14" />
            导出
            <ChevronDown :size="12" />
          </button>

          <div
            v-if="showExportMenu"
            class="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 z-50"
          >
            <button
              class="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              @click="handleExportCode('html')"
            >
              <Code :size="14" /> 导出 HTML
            </button>
            <button
              class="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              @click="handleExportCode('vue')"
            >
              <Code :size="14" /> 导出 Vue 组件
            </button>
            <button
              class="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              @click="openExportImage"
            >
              <ImageIcon :size="14" /> 导出为图片
            </button>
          </div>
        </div>

        <button
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors duration-200"
          title="预览"
          @click="handlePreview"
        >
          <Eye :size="14" />
          预览
        </button>

        <div class="w-px h-5 bg-gray-200" />

        <!-- 用户 -->
        <span class="text-xs text-gray-500">{{ authStore.username }}</span>

        <button
          class="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors duration-200"
          title="退出登录"
          @click="handleLogout"
        >
          <LogOut :size="16" />
        </button>
      </div>
    </header>

    <!-- 编辑器主体 -->
    <div class="flex flex-1 overflow-hidden">
      <!-- 左侧组件面板 -->
      <ComponentPanel />

      <!-- 画布区域 -->
      <div class="flex-1 bg-[#f1f5f9] relative overflow-auto">
        <!-- 网格背景 -->
        <div
          class="absolute inset-0 opacity-30"
          style="
            background-image: radial-gradient(circle, #94a3b8 0.8px, transparent 0.8px);
            background-size: 20px 20px;
          "
        />

        <div class="relative z-10 flex items-center justify-center min-h-full p-8">
          <!-- 加载中 -->
          <div v-if="loadingPages" class="flex flex-col items-center gap-3">
            <div
              class="w-10 h-10 rounded-full border-[3px] border-indigo-200 border-t-indigo-500 animate-spin"
            />
            <span class="text-sm text-gray-400">加载页面中...</span>
          </div>

          <!-- 空状态 -->
          <div v-else-if="!pages.length" class="text-center">
            <div
              class="w-16 h-16 rounded-2xl bg-white shadow-sm border border-gray-100 flex items-center justify-center mx-auto mb-4"
            >
              <svg
                class="w-8 h-8 text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.5"
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </div>
            <p class="text-sm text-gray-500 font-medium mb-1">还没有页面</p>
            <p class="text-xs text-gray-400 mb-5">创建一个页面开始搭建</p>
            <button
              class="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-medium rounded-xl shadow-md shadow-indigo-500/20 hover:shadow-lg hover:from-indigo-400 hover:to-violet-400 transition-all duration-200"
              @click="handleCreatePage"
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

    <!-- 模板选择弹窗 -->
    <TemplateModal ref="templateModalRef" />

    <!-- 操作历史浮层 -->
    <div
      v-if="showHistory"
      class="fixed top-16 right-4 z-40 w-72 max-h-[70vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700"
    >
      <div class="flex items-center justify-between px-4 pt-3">
        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">历史记录</span>
        <button
          class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-lg leading-none"
          @click="showHistory = false"
        >
          ×
        </button>
      </div>
      <HistoryPanel />
    </div>

    <!-- 快捷键列表 -->
    <ShortcutsModal ref="shortcutsModalRef" />

    <!-- 导出为图片 -->
    <ExportImageModal ref="exportImageModalRef" />

    <!-- 新建页面弹窗（替代原生 prompt） -->
    <div
      v-if="showCreatePageModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      @click.self="showCreatePageModal = false"
    >
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-sm mx-4 p-6">
        <h2 class="text-base font-semibold text-gray-800 dark:text-gray-200 mb-4">新建页面</h2>
        <label class="block text-xs text-gray-500 dark:text-gray-400 mb-2">页面名称</label>
        <input
          v-model="newPageTitle"
          type="text"
          placeholder="请输入页面名称"
          class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          @keyup.enter="submitCreatePage"
        />
        <div class="flex gap-2 mt-6">
          <button
            class="flex-1 px-4 py-2 text-sm text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            @click="showCreatePageModal = false"
          >
            取消
          </button>
          <button
            :disabled="creatingPage"
            class="flex-1 px-4 py-2 text-sm text-white bg-indigo-500 rounded-lg hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            @click="submitCreatePage"
          >
            {{ creatingPage ? '创建中...' : '创建' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useRoute, useRouter } from 'vue-router';
import {
  Undo,
  Redo,
  Trash2,
  Layout,
  Code,
  Eye,
  LogOut,
  History,
  Keyboard,
  Image as ImageIcon,
  ChevronDown,
  Loader2,
  Check,
  AlertCircle,
} from 'lucide-vue-next';
import * as projectApi from '../api/project';
import * as pageApi from '../api/page';
import type { PageVO } from '../api/page';
import { toPageSchema } from '../api/page';
import { useEditorStore } from '../stores/editorStore';
import { useAuthStore } from '../stores/authStore';
import { useAutoSave } from '../composables/useAutoSave';
import type { SaveStatus } from '../composables/useAutoSave';
import { useKeyboardShortcuts } from '../composables/useKeyboardShortcuts';
import { confirmDialog } from '../composables/useConfirm';
import { exportToHTML, exportToVue } from '../utils/codeExport';
import { toast } from '../utils/toast';
import { logger } from '../utils/logger';
import ComponentPanel from '../components/ComponentPanel.vue';
import PropertyPanel from '../components/PropertyPanel.vue';
import Canvas from '../components/Canvas.vue';
import ErrorBoundary from '../components/ErrorBoundary.vue';
import TemplateModal from '../components/TemplateModal.vue';
import AIAssistant from '../components/AIAssistant.vue';
import ThemeSwitcher from '../components/ThemeSwitcher.vue';
import HistoryPanel from '../components/HistoryPanel.vue';
import ShortcutsModal from '../components/ShortcutsModal.vue';
import ExportImageModal from '../components/ExportImageModal.vue';

const route = useRoute();
const router = useRouter();
const editorStore = useEditorStore();
const authStore = useAuthStore();
// 结构状态用 storeToRefs 保持响应性；action 是稳定函数，可直接解构
const { page, history, selectedId, selectedIds, isMultiSelect } = storeToRefs(editorStore);
const { undo, redo, deleteComponent } = editorStore;

const templateModalRef = ref<InstanceType<typeof TemplateModal> | null>(null);

const projectId = route.params.projectId as string;
const projectName = ref('');
const pages = ref<PageVO[]>([]);
const loadingPages = ref(true);
const currentPageId = ref<number | null>(null);

// 启用快捷键和自动保存（显式注入当前项目/页面身份）
useKeyboardShortcuts();
const { saveStatus, pendingSave } = useAutoSave({ projectId, pageId: currentPageId });

/** 顶栏保存状态文案 */
const SAVE_STATUS_LABEL: Record<SaveStatus, string> = {
  idle: '',
  saving: '保存中...',
  saved: '已保存',
  error: '保存失败',
};
const saveLabel = computed(() => SAVE_STATUS_LABEL[saveStatus.value]);

// —— 新增入口的本地状态 ——
const showExportMenu = ref(false);
const showHistory = ref(false);
const showCreatePageModal = ref(false);
const newPageTitle = ref('');
const creatingPage = ref(false);
const shortcutsModalRef = ref<InstanceType<typeof ShortcutsModal> | null>(null);
const exportImageModalRef = ref<InstanceType<typeof ExportImageModal> | null>(null);

function openShortcuts() {
  shortcutsModalRef.value?.openModal();
}

/** 离开页面前若有未落盘的改动，阻止关闭 */
function beforeUnloadHandler(e: BeforeUnloadEvent) {
  if (pendingSave.value) {
    e.preventDefault();
    e.returnValue = '';
  }
}
onMounted(() => window.addEventListener('beforeunload', beforeUnloadHandler));
onUnmounted(() => window.removeEventListener('beforeunload', beforeUnloadHandler));

onMounted(async () => {
  // 项目信息与页面列表互不依赖，并行请求以缩短首屏时间
  const [projectResult, pagesResult] = await Promise.allSettled([
    projectApi.getProject(projectId),
    pageApi.getPages(projectId),
  ]);

  if (projectResult.status === 'fulfilled') {
    projectName.value = projectResult.value.data.data.name;
  } else {
    projectName.value = '项目加载失败';
  }

  try {
    if (pagesResult.status === 'rejected') throw pagesResult.reason;
    pages.value = pagesResult.value.data.data.list;
    if (pages.value.length > 0) {
      // 选择首页或第一个页面
      const homePage = pages.value.find((p) => p.isHome) || pages.value[0];
      await handleSelectPage(homePage);
    }
  } catch {
    logger.error('EditorPage', '加载页面列表失败');
  } finally {
    loadingPages.value = false;
  }
});

/**
 * 列表接口不返回 schema（schema 恒为 null），
 * 因此必须再调详情接口拉取完整 schema 才能正确回显，否则画布始终为空。
 */
async function handleSelectPage(pg: PageVO) {
  currentPageId.value = pg.pageId;
  try {
    const { data } = await pageApi.getPage(projectId, String(pg.pageId));
    applyPageSchema(data.data.schema);
  } catch (err) {
    logger.error('EditorPage', '加载页面详情失败', err);
    // 详情拉取失败时，若列表项自带 schema 则兜底回显
    if (pg.schema && typeof pg.schema === 'object') {
      applyPageSchema(pg.schema);
    }
  }
}

/** 将（可能为空的）schema 安全应用到编辑器；空 schema 时重置为空白页 */
function applyPageSchema(schema: unknown) {
  const raw = schema && typeof schema === 'object' ? (schema as Record<string, unknown>) : {};
  editorStore.setPage(toPageSchema(raw));
}

function handleCreatePage() {
  // 打开内置新建页面弹窗（替代原生 prompt）
  newPageTitle.value = '新页面';
  showCreatePageModal.value = true;
}

async function submitCreatePage() {
  const title = newPageTitle.value.trim();
  if (!title) {
    toast('请输入页面名称', 'warning');
    return;
  }
  creatingPage.value = true;
  try {
    const { data } = await pageApi.createPage(projectId, { title, isHome: true });
    pages.value.push(data.data);
    await handleSelectPage(data.data);
    showCreatePageModal.value = false;
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : '未知错误';
    toast('创建失败: ' + error, 'error');
  } finally {
    creatingPage.value = false;
  }
}

function openTemplateModal() {
  templateModalRef.value?.openModal();
}

async function handleDeleteSelected() {
  if (!selectedId.value) return;
  const ok = await confirmDialog({
    title: '删除组件',
    message: '确定要删除选中的组件吗？',
    confirmText: '删除',
    danger: true,
  });
  if (ok) {
    deleteComponent(selectedId.value);
  }
}

function handleExportCode(format: 'html' | 'vue') {
  showExportMenu.value = false;

  let content: string;
  let filename: string;
  let mimeType: string;

  if (format === 'html') {
    content = exportToHTML(page.value);
    filename = `${page.value.name}.html`;
    mimeType = 'text/html';
  } else {
    content = exportToVue(page.value);
    filename = `${page.value.name}.vue`;
    mimeType = 'text/plain';
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  toast('已导出 ' + filename, 'success');
}

function openExportImage() {
  showExportMenu.value = false;
  exportImageModalRef.value?.openModal();
}

function handlePreview() {
  const win = window.open('/preview', '_blank');

  // localStorage 回退：直接打开 /preview 或刷新时使用；隐私模式下可能抛错，忽略
  try {
    localStorage.setItem('preview-page', JSON.stringify(page.value));
  } catch (error) {
    logger.warn('EditorPage', '预览快照写入 localStorage 失败', error);
  }

  if (!win) return;
  const send = () =>
    win.postMessage({ type: 'page-builder:preview', schema: page.value }, window.location.origin);
  // 立即发送 + 预览页加载完成后重发，规避预览页监听器注册晚于首发的竞态
  send();
  win.addEventListener('load', send);
}

async function handleLogout() {
  try {
    await authStore.logout();
  } catch (error) {
    logger.error('EditorPage', 'Failed to logout', error);
  } finally {
    await router.push('/login');
    toast('已退出登录', 'info');
  }
}
</script>
