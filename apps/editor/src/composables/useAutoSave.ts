import { watch, onUnmounted } from 'vue';
import { useEditorStore } from '../stores/editorStore';
import { useProjectManager } from './useProjectManager';
import { deepClone } from '@page-builder/shared';
import type { PageSchema } from '@page-builder/shared';
import { savePageSchema } from '../api/page';
import { toast } from '../utils/toast';
import { logger } from '../utils/logger';
import { templates } from '../data/templates';

const STORAGE_KEY = 'page-builder-data';
const AUTO_SAVE_INTERVAL = 3000; // 3秒自动保存

export function useAutoSave() {
  const { page, setPage, saveVersion, isRestoring } = useEditorStore();
  const { currentProjectId, currentPage } = useProjectManager();

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

  // 保存到 API（savePageSchema）
  const saveToAPI = async () => {
    const projectId = currentProjectId.value;
    const pageId = currentPage.value?.id;

    if (!projectId || !pageId) {
      // 没有有效的 projectId/pageId，仅保存到 localStorage
      saveToStorage();
      return;
    }

    try {
      await savePageSchema(projectId, pageId, {
        schema: deepClone(page.value) as unknown as Record<string, unknown>,
      });
      // API 保存成功后，同步更新 localStorage
      saveToStorage();
    } catch (error) {
      logger.warn('AutoSave', 'Failed to save to API, falling back to localStorage', error);
      // API 失败时回退到本地存储
      saveToStorage();
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
    saveTimer = setTimeout(saveToAPI, AUTO_SAVE_INTERVAL);
  });

  // 组件卸载时清理定时器，防止内存泄漏
  onUnmounted(() => {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
  });

  return {
    loadFromStorage,
    saveToStorage,
    saveToAPI,
  };
}

export function useTemplates() {
  const { setPage } = useEditorStore();

  const applyTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setPage(deepClone(template.data) as PageSchema);
    }
  };

  return {
    templates,
    applyTemplate,
  };
}
