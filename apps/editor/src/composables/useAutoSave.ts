import { watch } from 'vue';
import { useEditorStore } from '../stores/editorStore';
import { useProjectManager } from './useProjectManager';
import { deepClone } from '@page-builder/shared';
import type { PageSchema } from '@page-builder/shared';
import { savePageSchema } from '../api/page';
import { toast } from '../utils/toast';

const STORAGE_KEY = 'page-builder-data';
const AUTO_SAVE_INTERVAL = 3000; // 3秒自动保存

export function useAutoSave() {
  const { page, setPage } = useEditorStore();
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
      console.error('Failed to load from localStorage:', error);
    }
    return false;
  };

  // 保存到 localStorage
  const saveToStorage = () => {
    try {
      const data = JSON.stringify(deepClone(page.value));
      localStorage.setItem(STORAGE_KEY, data);
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
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
      console.warn('Failed to save to API, falling back to localStorage:', error);
      // API 失败时回退到本地存储
      saveToStorage();
      toast('自动保存失败，已保存到本地', 'warning');
    }
  };

  // 监听页面变化，自动保存（防抖 3 秒）
  let saveTimer: ReturnType<typeof setTimeout> | null = null;

  watch(
    () => page.value,
    () => {
      if (saveTimer) {
        clearTimeout(saveTimer);
      }
      saveTimer = setTimeout(saveToAPI, AUTO_SAVE_INTERVAL);
    },
    { deep: true },
  );

  return {
    loadFromStorage,
    saveToStorage,
    saveToAPI,
  };
}

// 预设模板
export const templates = [
  {
    id: 'blank',
    name: '空白页面',
    description: '从空白页面开始',
    data: {
      id: 'page-blank',
      name: '空白页面',
      version: '1.0.0',
      props: {
        title: '空白页面',
        backgroundColor: '#ffffff',
      },
      children: [],
    },
  },
  {
    id: 'landing',
    name: '落地页',
    description: '产品介绍落地页模板',
    data: {
      id: 'page-landing',
      name: '产品介绍',
      version: '1.0.0',
      props: {
        title: '产品介绍',
        backgroundColor: '#ffffff',
      },
      children: [
        {
          id: 'text-title',
          type: 'text',
          props: {
            content: '欢迎来到我们的产品',
            color: '#000000',
            fontSize: '24px',
            fontWeight: 'bold',
            textAlign: 'center',
          },
          styles: { padding: '24px', margin: '0 0 16px 0' },
          children: [],
        },
        {
          id: 'image-hero',
          type: 'image',
          props: {
            src: 'https://via.placeholder.com/375x200',
            alt: '产品图片',
            width: '100%',
            height: '200px',
            objectFit: 'cover',
          },
          styles: {},
          children: [],
        },
        {
          id: 'text-desc',
          type: 'text',
          props: {
            content: '这是一个简单的产品介绍模板，您可以根据需要修改内容。',
            color: '#666666',
            fontSize: '14px',
            textAlign: 'left',
          },
          styles: { padding: '16px', margin: '16px 0' },
          children: [],
        },
        {
          id: 'button-cta',
          type: 'button',
          props: {
            text: '立即了解',
            type: 'primary',
            size: 'large',
            block: true,
          },
          styles: { margin: '16px' },
          children: [],
        },
      ],
    },
  },
  {
    id: 'profile',
    name: '个人主页',
    description: '个人介绍页面模板',
    data: {
      id: 'page-profile',
      name: '个人主页',
      version: '1.0.0',
      props: {
        title: '个人主页',
        backgroundColor: '#f5f5f5',
      },
      children: [
        {
          id: 'container-header',
          type: 'container',
          props: { direction: 'column', gap: '12px', padding: '24px' },
          styles: { backgroundColor: '#ffffff', margin: '0 0 16px 0' },
          children: [
            {
              id: 'text-name',
              type: 'text',
              props: {
                content: '张三',
                color: '#000000',
                fontSize: '20px',
                fontWeight: 'bold',
                textAlign: 'center',
              },
              styles: {},
              children: [],
            },
            {
              id: 'badge-title',
              type: 'badge',
              props: { text: '前端工程师', type: 'primary', size: 'medium' },
              styles: {},
              children: [],
            },
          ],
        },
        {
          id: 'card-about',
          type: 'card',
          props: {
            title: '关于我',
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            padding: '16px',
            shadow: 'small',
          },
          styles: { margin: '16px' },
          children: [
            {
              id: 'text-about',
              type: 'text',
              props: {
                content: '热爱前端开发，专注于 Vue 和 React 技术栈。',
                color: '#666666',
                fontSize: '14px',
              },
              styles: {},
              children: [],
            },
          ],
        },
      ],
    },
  },
];

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
