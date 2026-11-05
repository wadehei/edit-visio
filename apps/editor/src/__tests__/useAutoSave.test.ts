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
    mocks.savePageSchema.mockRejectedValue(new Error('boom'));
    const { api } = mountAutoSave('p1', 3);

    await api.saveToAPI();

    expect(api.saveStatus.value).toBe('error');
    expect(mocks.toast).toHaveBeenCalledWith('自动保存失败，已保存到本地', 'warning');
    expect(localStorage.getItem('page-builder-data')).toBeTruthy();
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
    expect(mocks.logger.error).toHaveBeenCalled();
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
