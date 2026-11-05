import { ref, watch, onUnmounted } from 'vue';
import type { Ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useEditorStore } from '../stores/editorStore';
import { deepClone } from '@page-builder/shared';
import type { PageSchema } from '@page-builder/shared';
import { savePageSchema } from '../api/page';
import { toast } from '../utils/toast';
import { logger } from '../utils/logger';
import { templates } from '../data/templates';

const STORAGE_KEY = 'page-builder-data';
const AUTO_SAVE_INTERVAL = 3000; // 3秒自动保存

/**
 * 自动保存的目标身份。
 * 必须由调用方（EditorPage）注入：此前内部自行 `useProjectManager()` 会创建
 * 一个独立实例，其 currentProjectId/currentPage 与页面实际编辑的身份不一致，
 * 会导致保存写入错误页面，并使下方的 AbortController 竞态保护恒不生效。
 */
export interface AutoSaveTarget {
  /** 当前编辑的项目 ID，来自路由参数 */
  projectId: string;
  /** 当前编辑的页面 ID，来自 EditorPage 的 currentPageId */
  pageId: Ref<number | null>;
}

/** 自动保存状态：idle 未触发 / saving 保存中 / saved 已保存 / error 保存失败 */
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function useAutoSave({ projectId, pageId }: AutoSaveTarget) {
  const editorStore = useEditorStore();
  // state：必须用 storeToRefs 保持响应性
  const { page, saveVersion, isRestoring } = storeToRefs(editorStore);
  // action：是稳定函数，直接从 store 实例解构
  const { setPage } = editorStore;

  /** 供顶栏展示的保存状态 */
  const saveStatus = ref<SaveStatus>('idle');

  // 从 localStorage 加载数据（fallback）
  const loadFromStorage = () => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data) as PageSchema;
        setPage(parsed);
        return true;
      }
    } catch (error) {
      logger.error('AutoSave', 'Failed to load from localStorage', error);
    }
    return false;
  };

  // 保存到 localStorage
  const saveToStorage = () => {
    try {
      const data = JSON.stringify(deepClone(page.value));
      localStorage.setItem(STORAGE_KEY, data);
    } catch (error) {
      logger.error('AutoSave', 'Failed to save to localStorage', error);
    }
  };

  // 保存到 API（savePageSchema），使用 AbortController 防止竞态
  let abortController: AbortController | null = null;

  const saveToAPI = async () => {
    if (!projectId || pageId.value === null) {
      // 尚未确定目标项目/页面，仅保存到 localStorage
      saveToStorage();
      return;
    }

    // 取消之前的保存请求
    if (abortController) {
      abortController.abort();
    }
    abortController = new AbortController();
    const { signal } = abortController;

    saveStatus.value = 'saving';
    try {
      await savePageSchema(
        projectId,
        String(pageId.value),
        {
          schema: deepClone(page.value),
        },
        { signal },
      );
      // API 保存成功后，同步更新 localStorage
      saveToStorage();
      saveStatus.value = 'saved';
    } catch (error) {
      if (signal.aborted) return; // 被取消的请求，忽略（新的保存已在进行中）
      logger.warn('AutoSave', 'Failed to save to API, falling back to localStorage', error);
      // API 失败时回退到本地存储
      saveToStorage();
      saveStatus.value = 'error';
      toast('自动保存失败，已保存到本地', 'warning');
    }
  };

  // 监听 saveVersion 变化（而非 deep watch page），性能更优。
  // saveVersion 只在用户主动修改时递增，undo/redo 期间 isRestoring 为 true。
  let saveTimer: ReturnType<typeof setTimeout> | null = null;

  watch(saveVersion, () => {
    // undo/redo 恢复期间跳过自动保存
    if (isRestoring.value) return;

    if (saveTimer) {
      clearTimeout(saveTimer);
    }
    saveTimer = setTimeout(() => void saveToAPI(), AUTO_SAVE_INTERVAL);
  });

  // 组件卸载时清理定时器和进行中的请求，防止内存泄漏
  onUnmounted(() => {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
  });

  return {
    saveStatus,
    loadFromStorage,
    saveToStorage,
    saveToAPI,
  };
}

export function useTemplates() {
  const { setPage } = useEditorStore();

  const applyTemplate = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setPage(deepClone<PageSchema>(template.data));
    }
  };

  return {
    templates,
    applyTemplate,
  };
}
