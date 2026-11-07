import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { defineComponent, h, ref, nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createDefaultPage } from '@page-builder/core';

const mocks = vi.hoisted(() => ({
  toast: vi.fn(),
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  savePageSchema: vi.fn(),
}));

vi.mock('../utils/toast', () => ({ toast: mocks.toast }));
vi.mock('../utils/logger', () => ({ logger: mocks.logger }));
vi.mock('../api/page', () => ({ savePageSchema: mocks.savePageSchema }));

import { useAutoSave, useTemplates } from '../composables/useAutoSave';
import { useEditorStore } from '../stores/editorStore';
import { templates } from '../data/templates';

const OK_RESPONSE = { data: { code: 0, data: null, message: 'ok' } };

function mountAutoSave(projectId = 'p1', pageIdValue: number | null = 1) {
  const pageId = ref<number | null>(pageIdValue);
  let api!: ReturnType<typeof useAutoSave>;
  const wrapper = mount(
    defineComponent({
      setup() {
        api = useAutoSave({ projectId, pageId });
        return () => h('div');
      },
    }),
  );
  return { api, pageId, unmount: () => wrapper.unmount() };
}

describe('useAutoSave', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    // 先恢复对定时器 API 的 spy，再切回真实定时器
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('未确定目标项目/页面时仅写入本地存储', async () => {
    const { api } = mountAutoSave('', null);

    await api.saveToAPI();

    expect(mocks.savePageSchema).not.toHaveBeenCalled();
    expect(localStorage.getItem('page-builder-data')).toBeTruthy();
  });

  it('保存成功后调用 API、同步本地并置为 saved', async () => {
    mocks.savePageSchema.mockResolvedValue(OK_RESPONSE);
    const { api } = mountAutoSave('p1', 7);
    const store = useEditorStore();
    store.addComponent('text', 'root', 0);

    await api.saveToAPI();

    expect(mocks.savePageSchema).toHaveBeenCalledTimes(1);
    const [pid, pageIdArg, params, config] = mocks.savePageSchema.mock.calls[0] as unknown as [
      string,
      string,
      { schema: { children: unknown[] } },
      { signal: AbortSignal },
    ];
    expect(pid).toBe('p1');
    expect(pageIdArg).toBe('7');
    expect(params.schema.children).toHaveLength(1);
    expect(config.signal).toBeInstanceOf(AbortSignal);
    expect(api.saveStatus.value).toBe('saved');
    expect(localStorage.getItem('page-builder-data')).toBeTruthy();
  });

  it('API 失败时回退本地、置为 error 并提示', async () => {
    const boom = new Error('boom');
    mocks.savePageSchema.mockRejectedValue(boom);
    const { api } = mountAutoSave('p1', 3);

    await api.saveToAPI();

    expect(api.saveStatus.value).toBe('error');
    expect(mocks.toast).toHaveBeenCalledWith('自动保存失败，已保存到本地', 'warning');
    expect(mocks.logger.warn).toHaveBeenCalledWith(
      'AutoSave',
      'Failed to save to API, falling back to localStorage',
      boom,
    );
    expect(localStorage.getItem('page-builder-data')).toBeTruthy();
  });

  it('projectId 有效但 pageId 为 null 时仅写入本地存储', async () => {
    const { api } = mountAutoSave('p1', null);

    await api.saveToAPI();

    expect(mocks.savePageSchema).not.toHaveBeenCalled();
    expect(localStorage.getItem('page-builder-data')).toBeTruthy();
    expect(api.saveStatus.value).toBe('idle');
  });

  it('保存进行中时 saveStatus 为 saving', async () => {
    let resolveSave!: (value: unknown) => void;
    mocks.savePageSchema.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSave = resolve;
        }),
    );
    const { api } = mountAutoSave('p1', 1);

    const pending = api.saveToAPI();
    expect(api.saveStatus.value).toBe('saving');

    resolveSave(OK_RESPONSE);
    await pending;
    expect(api.saveStatus.value).toBe('saved');
  });

  it('被新请求取消的保存不报错、不回退', async () => {
    mocks.savePageSchema
      .mockImplementationOnce(
        (_pid: string, _pageId: string, _params: unknown, config: { signal: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            config.signal.addEventListener('abort', () => reject(new Error('aborted')));
          }),
      )
      .mockResolvedValueOnce(OK_RESPONSE);

    const { api } = mountAutoSave('p1', 1);

    const first = api.saveToAPI();
    const second = api.saveToAPI();
    await Promise.all([first, second]);

    expect(mocks.toast).not.toHaveBeenCalled();
    expect(api.saveStatus.value).toBe('saved');
  });

  it('loadFromStorage 无数据时返回 false', () => {
    const { api } = mountAutoSave();
    expect(api.loadFromStorage()).toBe(false);
  });

  it('loadFromStorage 命中时替换编辑器页面', () => {
    localStorage.setItem('page-builder-data', JSON.stringify(createDefaultPage('Loaded')));
    const { api } = mountAutoSave();

    expect(api.loadFromStorage()).toBe(true);
    expect(useEditorStore().page.name).toBe('Loaded');
  });

  it('loadFromStorage 解析失败时返回 false 并记录日志', () => {
    localStorage.setItem('page-builder-data', '{not json');
    const { api } = mountAutoSave();

    expect(api.loadFromStorage()).toBe(false);
    expect(mocks.logger.error).toHaveBeenCalledWith(
      'AutoSave',
      'Failed to load from localStorage',
      expect.any(SyntaxError),
    );
  });

  it('saveToStorage 写入失败时记录错误且不抛出', () => {
    const { api } = mountAutoSave();
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });

    try {
      expect(() => api.saveToStorage()).not.toThrow();
      expect(mocks.logger.error).toHaveBeenCalledWith(
        'AutoSave',
        'Failed to save to localStorage',
        expect.any(Error),
      );
    } finally {
      setItemSpy.mockRestore();
    }
  });

  it('saveVersion 变化后经防抖再触发保存', async () => {
    mocks.savePageSchema.mockResolvedValue(OK_RESPONSE);
    const { api } = mountAutoSave('p1', 1);
    const store = useEditorStore();

    expect(api.saveStatus.value).toBe('idle');
    store.addComponent('text', 'root', 0);
    await nextTick();
    expect(mocks.savePageSchema).not.toHaveBeenCalled();

    vi.advanceTimersByTime(3000);
    await nextTick();
    expect(mocks.savePageSchema).toHaveBeenCalledTimes(1);
  });

  it('连续变更仅保留最新的防抖定时器（只保存一次）', async () => {
    mocks.savePageSchema.mockResolvedValue(OK_RESPONSE);
    mountAutoSave('p1', 1);
    const store = useEditorStore();

    store.addComponent('text', 'root', 0);
    await nextTick();
    // 第一次定时器尚未到期即再次变更：应先清除旧定时器再重设
    store.addComponent('button', 'root', 1);
    await nextTick();

    vi.advanceTimersByTime(3000);
    await nextTick();

    expect(mocks.savePageSchema).toHaveBeenCalledTimes(1);
  });

  it('首次变更时无待清定时器，不应调用 clearTimeout', async () => {
    mountAutoSave('p1', 1);
    const store = useEditorStore();
    const clearSpy = vi.spyOn(globalThis, 'clearTimeout');

    store.addComponent('text', 'root', 0);
    await nextTick();

    expect(clearSpy).not.toHaveBeenCalledWith(null);
  });

  it('undo/redo 恢复期间跳过自动保存', async () => {
    const { api } = mountAutoSave('p1', 1);
    const store = useEditorStore();
    void api;

    store.isRestoring = true;
    store.setPage(createDefaultPage());
    await nextTick();
    vi.advanceTimersByTime(3000);
    await nextTick();

    expect(mocks.savePageSchema).not.toHaveBeenCalled();
  });

  it('卸载后清理定时器不再触发保存', async () => {
    const { unmount } = mountAutoSave('p1', 1);
    const store = useEditorStore();

    store.addComponent('text', 'root', 0);
    await nextTick();
    unmount();
    vi.advanceTimersByTime(3000);
    await nextTick();

    expect(mocks.savePageSchema).not.toHaveBeenCalled();
  });

  it('卸载时中止进行中的保存请求', () => {
    let capturedSignal: AbortSignal | undefined;
    mocks.savePageSchema.mockImplementation(
      (_pid: string, _pageId: string, _params: unknown, config: { signal: AbortSignal }) => {
        capturedSignal = config.signal;
        return new Promise(() => {});
      },
    );
    const { api, unmount } = mountAutoSave('p1', 1);

    void api.saveToAPI();
    expect(capturedSignal).toBeInstanceOf(AbortSignal);
    expect(capturedSignal!.aborted).toBe(false);

    unmount();

    expect(capturedSignal!.aborted).toBe(true);
  });

  it('卸载时无待清定时器，不应调用 clearTimeout', () => {
    const { unmount } = mountAutoSave('p1', 1);
    const clearSpy = vi.spyOn(globalThis, 'clearTimeout');

    // 从未触发保存版本变更，saveTimer 保持为 null
    unmount();

    expect(clearSpy).not.toHaveBeenCalledWith(null);
  });
});

describe('useTemplates', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('导出内置模板列表', () => {
    const api = useTemplates();
    expect(api.templates).toBe(templates);
    expect(api.templates.length).toBeGreaterThan(0);
  });

  it('applyTemplate 应用模板数据（深拷贝，不共享引用）', () => {
    const api = useTemplates();
    api.applyTemplate('landing');

    const store = useEditorStore();
    const landing = templates.find((t) => t.id === 'landing')!;
    expect(store.page.name).toBe('产品介绍');
    expect(store.page.children).toHaveLength(4);
    expect(store.page).not.toBe(landing.data);
  });

  it('未知模板不改变页面', () => {
    const api = useTemplates();
    const before = useEditorStore().page;

    api.applyTemplate('not-exist');

    expect(useEditorStore().page).toBe(before);
  });
});
