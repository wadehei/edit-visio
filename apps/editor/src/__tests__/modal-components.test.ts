import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { nextTick } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia, type Pinia } from 'pinia';
import AnimationPanel from '../components/AnimationPanel.vue';
import TemplateModal from '../components/TemplateModal.vue';
import ExportImageModal from '../components/ExportImageModal.vue';
import AIAssistant from '../components/AIAssistant.vue';
import ProjectManager from '../components/ProjectManager.vue';
import HistoryPanel from '../components/HistoryPanel.vue';
import { useEditorStore } from '../stores/editorStore';
import type { PageSchema } from '@page-builder/shared';
import type { Project } from '../composables/useProjectManager';

/** 全局 confirm 桩，供用例断言调用情况 */
let confirmSpy: ReturnType<typeof vi.fn> = vi.fn();

// 保留真实实现并自动转为 spy，便于按用例替换返回值
vi.mock('../api/project', { spy: true });
vi.mock('../api/page', { spy: true });
vi.mock('../utils/toast', () => ({ toast: vi.fn() }));

import * as projectApi from '../api/project';
import * as pageApi from '../api/page';
import { toast } from '../utils/toast';

/** 构造 axios 风格的成功响应（组合式函数只消费 data.data 字段） */
function ok<T>(data: T) {
  return { data: { code: 0, data, message: 'ok' } } as never;
}

/** 调用通过 defineExpose 暴露的 openModal */
function openModal(wrapper: { vm: unknown }) {
  (wrapper.vm as { openModal: () => void }).openModal();
}

function makePage(id: string, name = '页面'): PageSchema {
  return {
    id,
    name,
    version: '1.0.0',
    props: { title: name, backgroundColor: '#ffffff' },
    children: [],
  };
}

function makeProject(partial: Partial<Project> & { id: string }): Project {
  return {
    id: partial.id,
    name: partial.name ?? '项目',
    description: partial.description ?? '',
    pages: partial.pages ?? [],
    currentPageId: partial.currentPageId ?? '',
    createdAt: partial.createdAt ?? Date.now(),
    updatedAt: partial.updatedAt ?? Date.now(),
  };
}

function seedProjects(projects: Project[]) {
  localStorage.setItem('page-builder-projects', JSON.stringify(projects));
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  confirmSpy = vi.fn(() => true);
  vi.stubGlobal('confirm', confirmSpy);

  vi.mocked(projectApi.getProjects).mockResolvedValue(ok({ list: [] }));
  vi.mocked(projectApi.createProject).mockResolvedValue(
    ok({ projectId: 42, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-02T00:00:00Z' }),
  );
  vi.mocked(projectApi.updateProject).mockResolvedValue(ok({ projectId: 1 }));
  vi.mocked(projectApi.deleteProject).mockResolvedValue(ok(null));
  vi.mocked(projectApi.copyProject).mockResolvedValue(
    ok({ projectId: 77, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-02T00:00:00Z' }),
  );
  vi.mocked(pageApi.getPages).mockResolvedValue(ok({ list: [] }));
  vi.mocked(pageApi.createPage).mockResolvedValue(ok({ pageId: 99 }));
  vi.mocked(pageApi.deletePage).mockResolvedValue(ok(null));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('AnimationPanel', () => {
  it('showPanel 为 false 时不渲染面板', () => {
    const wrapper = mount(AnimationPanel, { props: { showPanel: false } });

    expect(wrapper.find('h3').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('动画效果');
  });

  it('showPanel 为 true 时渲染标题与三个动画分类，且默认不展示参数', () => {
    const wrapper = mount(AnimationPanel, { props: { showPanel: true } });
    const buttons = wrapper.findAll('button');

    expect(wrapper.text()).toContain('动画效果');
    expect(wrapper.text()).toContain('动画类型');
    expect(buttons).toHaveLength(3);
    expect(buttons.map((b) => b.text())).toEqual(['淡入', '滑入', '特殊']);
    // 默认动画类型为 none，不展示时长/延迟/重复控件
    expect(wrapper.find('select').exists()).toBe(false);
    expect(wrapper.findAll('input[type="range"]')).toHaveLength(0);
  });

  it('点击分类可展开/收起对应动画列表', async () => {
    const wrapper = mount(AnimationPanel, { props: { showPanel: true } });
    const fadeCategory = wrapper.findAll('button').find((b) => b.text() === '淡入')!;

    await fadeCategory.trigger('click');
    expect(wrapper.text()).toContain('向上淡入');
    expect(wrapper.text()).toContain('向左淡入');
    // 分类按钮 + 5 个动画项
    expect(wrapper.findAll('button')).toHaveLength(8);

    await fadeCategory.trigger('click');
    expect(wrapper.text()).not.toContain('向上淡入');
  });

  it('选择动画后展示参数控件，时长/延迟/重复均可调整', async () => {
    const wrapper = mount(AnimationPanel, { props: { showPanel: true } });
    await wrapper
      .findAll('button')
      .find((b) => b.text() === '滑入')!
      .trigger('click');
    await wrapper
      .findAll('button')
      .find((b) => b.text().includes('向上滑入'))!
      .trigger('click');

    const ranges = wrapper.findAll('input[type="range"]');
    expect(ranges).toHaveLength(2);
    expect(wrapper.text()).toContain('持续时间: 500ms');
    expect(wrapper.text()).toContain('延迟: 0ms');

    await ranges[0].setValue('800');
    expect(wrapper.text()).toContain('持续时间: 800ms');

    await ranges[1].setValue('300');
    expect(wrapper.text()).toContain('延迟: 300ms');

    const select = wrapper.find('select');
    await select.setValue('infinite');
    expect((select.element as HTMLSelectElement).value).toBe('infinite');
  });

  it('选中项展示预览按钮，点击预览不收起列表', async () => {
    const wrapper = mount(AnimationPanel, { props: { showPanel: true } });
    await wrapper
      .findAll('button')
      .find((b) => b.text() === '淡入')!
      .trigger('click');
    await wrapper
      .findAll('button')
      .find((b) => b.text().includes('向上淡入'))!
      .trigger('click');

    const preview = wrapper.find('span.ml-2');
    expect(preview.exists()).toBe(true);
    expect(preview.text()).toBe('▶');

    await preview.trigger('click');
    // 预览不收起动画列表
    expect(wrapper.text()).toContain('向上淡入');
  });
});

describe('TemplateModal', () => {
  let pinia: Pinia;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
  });

  function mountModal() {
    return mount(TemplateModal, { global: { plugins: [pinia] } });
  }

  it('初始不渲染，openModal 后展示全部模板', async () => {
    const wrapper = mountModal();
    expect(wrapper.find('.fixed').exists()).toBe(false);

    openModal(wrapper);
    await nextTick();

    expect(wrapper.find('.fixed').exists()).toBe(true);
    expect(wrapper.text()).toContain('选择模板');
    expect(wrapper.text()).toContain('空白页面');
    expect(wrapper.text()).toContain('落地页');
    expect(wrapper.text()).toContain('个人主页');
    expect(wrapper.findAll('.cursor-pointer')).toHaveLength(3);
  });

  it('确认后应用模板到编辑器并关闭弹窗', async () => {
    const wrapper = mountModal();
    openModal(wrapper);
    await nextTick();

    const card = wrapper.findAll('.cursor-pointer').find((c) => c.text().includes('落地页'))!;
    await card.trigger('click');

    const store = useEditorStore(pinia);
    expect(store.page.id).toBe('page-landing');
    expect(store.page.name).toBe('产品介绍');
    expect(wrapper.find('.fixed').exists()).toBe(false);
    expect(confirmSpy).toHaveBeenCalled();
  });

  it('取消确认时不应用模板且保持弹窗打开', async () => {
    vi.stubGlobal(
      'confirm',
      vi.fn(() => false),
    );

    const wrapper = mountModal();
    openModal(wrapper);
    await nextTick();

    const card = wrapper.findAll('.cursor-pointer').find((c) => c.text().includes('个人主页'))!;
    await card.trigger('click');

    const store = useEditorStore(pinia);
    expect(store.page.id).not.toBe('page-profile');
    expect(wrapper.find('.fixed').exists()).toBe(true);
  });

  it('点击关闭按钮与遮罩层均可关闭弹窗', async () => {
    const wrapper = mountModal();
    openModal(wrapper);
    await nextTick();

    await wrapper.find('button').trigger('click');
    expect(wrapper.find('.fixed').exists()).toBe(false);

    openModal(wrapper);
    await nextTick();
    expect(wrapper.find('.fixed').exists()).toBe(true);

    await wrapper.find('.fixed').trigger('click');
    expect(wrapper.find('.fixed').exists()).toBe(false);
  });
});

describe('ExportImageModal', () => {
  function mountModal() {
    return mount(ExportImageModal);
  }

  async function openedModal() {
    const wrapper = mountModal();
    openModal(wrapper);
    await nextTick();
    return wrapper;
  }

  it('初始不渲染，openModal 后展示格式与背景选项，默认选中 PNG', async () => {
    const wrapper = mountModal();
    expect(wrapper.find('.fixed').exists()).toBe(false);

    const opened = await openedModal();
    expect(opened.find('.fixed').exists()).toBe(true);
    expect(opened.text()).toContain('导出为图片');
    expect(opened.text()).toContain('PNG');
    expect(opened.text()).toContain('JPEG');
    expect(opened.text()).toContain('SVG');

    const png = opened.findAll('button').find((b) => b.text() === 'PNG')!;
    expect(png.classes()).toContain('border-blue-500');
    // 默认 png 展示质量滑块
    expect(opened.find('input[type="range"]').exists()).toBe(true);
  });

  it('切换格式控制质量滑块显隐', async () => {
    const wrapper = await openedModal();

    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'SVG')!
      .trigger('click');
    expect(wrapper.find('input[type="range"]').exists()).toBe(false);

    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'JPEG')!
      .trigger('click');
    expect(wrapper.find('input[type="range"]').exists()).toBe(true);
  });

  it('调整质量与背景会更新对应绑定', async () => {
    const wrapper = await openedModal();

    const slider = wrapper.find('input[type="range"]');
    await slider.setValue('50');
    expect(wrapper.text()).toContain('质量: 50%');

    const select = wrapper.find('select');
    await select.setValue('transparent');
    expect((select.element as HTMLSelectElement).value).toBe('transparent');
  });

  it('点击导出触发 toast 提示并关闭弹窗', async () => {
    const wrapper = await openedModal();

    await wrapper
      .findAll('button')
      .find((b) => b.text() === '导出')!
      .trigger('click');
    await nextTick();

    expect(toast).toHaveBeenCalledWith('导出功能开发中... 格式: PNG, 质量: 90%', 'info');
    expect(wrapper.find('.fixed').exists()).toBe(false);
  });

  it('点击取消按钮与遮罩层均可关闭弹窗', async () => {
    const wrapper = await openedModal();

    await wrapper
      .findAll('button')
      .find((b) => b.text() === '取消')!
      .trigger('click');
    expect(wrapper.find('.fixed').exists()).toBe(false);

    openModal(wrapper);
    await nextTick();
    expect(wrapper.find('.fixed').exists()).toBe(true);

    await wrapper.find('.fixed').trigger('click');
    expect(wrapper.find('.fixed').exists()).toBe(false);
  });
});

describe('AIAssistant', () => {
  let pinia: Pinia;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
  });

  function mountAssistant() {
    return mount(AIAssistant, { global: { plugins: [pinia] } });
  }

  async function openPanel() {
    const wrapper = mountAssistant();
    await wrapper.find('button[title="AI 助手"]').trigger('click');
    await nextTick();
    return wrapper;
  }

  it('初始不显示建议面板，仅渲染入口按钮', () => {
    const wrapper = mountAssistant();

    expect(wrapper.find('button[title="AI 助手"]').exists()).toBe(true);
    expect(wrapper.text()).not.toContain('AI 智能建议');
  });

  it('点击入口按钮打开面板并自动分析生成建议', async () => {
    const wrapper = await openPanel();

    expect(wrapper.text()).toContain('AI 智能建议');
    expect(wrapper.text()).toContain('添加页面标题');
    expect(wrapper.text()).toContain('使用布局模板');
    // 类型标签
    expect(wrapper.text()).toContain('组件');
    expect(wrapper.text()).toContain('布局');
  });

  it('点击建议项执行其动作（向页面添加组件）', async () => {
    const wrapper = await openPanel();

    const rec = wrapper.findAll('.cursor-pointer').find((r) => r.text().includes('添加页面标题'))!;
    await rec.trigger('click');

    const store = useEditorStore(pinia);
    expect(store.page.children).toHaveLength(1);
    expect(store.page.children[0].type).toBe('text');
  });

  it('页面已具备结构时无建议，展示空提示与「分析页面」按钮', async () => {
    const store = useEditorStore(pinia);
    store.setPage({
      ...store.page,
      children: [
        { id: 'a', type: 'text', props: {}, styles: {}, children: [] },
        { id: 'b', type: 'button', props: {}, styles: {}, children: [] },
        { id: 'c', type: 'image', props: {}, styles: {}, children: [] },
      ],
    });

    const wrapper = await openPanel();

    expect(wrapper.text()).toContain('暂无建议');
    expect(wrapper.text()).toContain('分析页面');
  });

  it('点击面板外部区域关闭面板', async () => {
    const wrapper = await openPanel();
    expect(wrapper.text()).toContain('AI 智能建议');

    const outside = document.createElement('div');
    document.body.appendChild(outside);
    outside.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await nextTick();

    expect(wrapper.text()).not.toContain('AI 智能建议');
    outside.remove();
  });
});

describe('ProjectManager', () => {
  function mountManager() {
    return mount(ProjectManager);
  }

  async function openedManager() {
    const wrapper = mountManager();
    openModal(wrapper);
    await nextTick();
    return wrapper;
  }

  it('初始不渲染，openModal 后展示项目管理与空状态', async () => {
    const wrapper = mountManager();
    expect(wrapper.find('.fixed').exists()).toBe(false);

    const opened = await openedManager();
    expect(opened.text()).toContain('项目管理');
    expect(opened.text()).toContain('创建新项目');
    expect(opened.text()).toContain('暂无项目');
  });

  it('渲染已存储项目的名称、描述与页面数量', async () => {
    seedProjects([
      makeProject({
        id: 'a',
        name: '项目甲',
        description: '描述甲',
        pages: [makePage('p1'), makePage('p2')],
      }),
    ]);

    const wrapper = await openedManager();

    expect(wrapper.text()).toContain('项目甲');
    expect(wrapper.text()).toContain('描述甲');
    expect(wrapper.text()).toContain('2 个页面');
    expect(wrapper.findAll('button').some((b) => b.text() === '打开项目')).toBe(true);
  });

  it('创建新项目：填写名称后保存并写入列表', async () => {
    const wrapper = await openedManager();

    await wrapper
      .findAll('button')
      .find((b) => b.text() === '创建新项目')!
      .trigger('click');
    expect(wrapper.text()).toContain('创建项目');

    await wrapper.find('input').setValue('全新项目');
    // textarea 描述留空
    await wrapper
      .findAll('button')
      .find((b) => b.text() === '保存')!
      .trigger('click');
    await flushPromises();

    expect(projectApi.createProject).toHaveBeenCalledWith({ name: '全新项目', description: '' });
    expect(wrapper.text()).toContain('全新项目');
  });

  it('编辑项目：修改名称后保存调用更新接口', async () => {
    seedProjects([makeProject({ id: 'a', name: '旧名', description: '旧描述' })]);

    const wrapper = await openedManager();

    await wrapper.find('button[title="编辑"]').trigger('click');
    expect(wrapper.text()).toContain('编辑项目');

    await wrapper.find('input').setValue('新名');
    await wrapper
      .findAll('button')
      .find((b) => b.text() === '保存')!
      .trigger('click');
    await flushPromises();

    expect(projectApi.updateProject).toHaveBeenCalledWith('a', {
      name: '新名',
      description: '旧描述',
    });
    expect(wrapper.text()).toContain('新名');
  });

  it('复制项目生成副本并调用复制逻辑', async () => {
    seedProjects([makeProject({ id: 'a', name: '原本' })]);

    const wrapper = await openedManager();

    await wrapper.find('button[title="复制"]').trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('原本 (副本)');
    expect(projectApi.copyProject).toHaveBeenCalledWith('a');
  });

  it('删除项目需确认，确认后移除并调用删除接口', async () => {
    seedProjects([makeProject({ id: 'a', name: '待删' })]);

    const wrapper = await openedManager();

    await wrapper.find('button[title="删除"]').trigger('click');
    await flushPromises();

    expect(projectApi.deleteProject).toHaveBeenCalledWith('a');
    expect(wrapper.text()).toContain('暂无项目');
  });

  it('取消确认时不删除项目', async () => {
    vi.stubGlobal(
      'confirm',
      vi.fn(() => false),
    );
    seedProjects([makeProject({ id: 'a', name: '保留' })]);

    const wrapper = await openedManager();

    await wrapper.find('button[title="删除"]').trigger('click');
    await flushPromises();

    expect(projectApi.deleteProject).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('保留');
  });

  it('打开项目切换当前项目并关闭弹窗', async () => {
    seedProjects([makeProject({ id: 'a', name: '甲项目' })]);

    const wrapper = await openedManager();

    await wrapper
      .findAll('button')
      .find((b) => b.text() === '打开项目')!
      .trigger('click');
    await flushPromises();

    expect(localStorage.getItem('page-builder-current-project')).toBe('a');
    expect(wrapper.find('.fixed').exists()).toBe(false);
  });

  it('点击关闭按钮与遮罩层均可关闭弹窗', async () => {
    const wrapper = await openedManager();

    await wrapper.find('button').trigger('click');
    expect(wrapper.find('.fixed').exists()).toBe(false);

    openModal(wrapper);
    await nextTick();
    expect(wrapper.find('.fixed').exists()).toBe(true);

    await wrapper.find('.fixed').trigger('click');
    expect(wrapper.find('.fixed').exists()).toBe(false);
  });
});

describe('HistoryPanel', () => {
  let pinia: Pinia;
  let store: ReturnType<typeof useEditorStore>;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
    store = useEditorStore(pinia);
  });

  function mountPanel() {
    return mount(HistoryPanel, { global: { plugins: [pinia] } });
  }

  it('初始无历史时展示 0/20，撤销与重做均禁用', () => {
    const wrapper = mountPanel();
    const buttons = wrapper.findAll('button');

    expect(wrapper.text()).toContain('操作历史');
    expect(wrapper.text()).toContain('0 / 20');
    expect(wrapper.text()).toContain('当前状态');
    expect(wrapper.text()).toContain('现在');
    expect((buttons[0].element as HTMLButtonElement).disabled).toBe(true);
    expect((buttons[1].element as HTMLButtonElement).disabled).toBe(true);
  });

  it('存在历史时展示条目与计数', () => {
    store.addComponent('text', 'root', 0, {}, {});
    const wrapper = mountPanel();

    expect(wrapper.text()).toContain('1 / 20');
    // 历史快照的页面名称
    expect(wrapper.text()).toContain('未命名页面');
    expect(wrapper.text()).toContain('刚刚');
  });

  it('点击撤销与重做按钮驱动 store 历史变化', async () => {
    store.addComponent('text', 'root', 0, { content: 'A' }, {});
    const wrapper = mountPanel();
    const [undoBtn, redoBtn] = wrapper.findAll('button');

    expect((undoBtn.element as HTMLButtonElement).disabled).toBe(false);
    expect((redoBtn.element as HTMLButtonElement).disabled).toBe(true);

    await undoBtn.trigger('click');
    expect(store.history.past).toHaveLength(0);
    expect(store.history.future).toHaveLength(1);
    expect(wrapper.text()).toContain('0 / 20');

    await redoBtn.trigger('click');
    expect(store.history.past).toHaveLength(1);
    expect(store.history.future).toHaveLength(0);
  });

  it('点击历史条目恢复到该版本，点击未来条目重做', async () => {
    store.addComponent('text', 'root', 0, { content: 'A' }, {});
    store.addComponent('text', 'root', 1, { content: 'B' }, {});
    const wrapper = mountPanel();

    // past 共 2 条（倒序渲染），future 为空
    const pastItems = wrapper.findAll('.cursor-pointer');
    expect(pastItems).toHaveLength(2);

    await pastItems[0].trigger('click');
    expect(store.history.past).toHaveLength(0);
    expect(store.history.future).toHaveLength(2);

    const futureItems = wrapper.findAll('.cursor-pointer');
    expect(futureItems).toHaveLength(2);
    await futureItems[futureItems.length - 1].trigger('click');
    expect(store.history.past).toHaveLength(2);
    expect(store.history.future).toHaveLength(0);
  });

  it('按时间差格式化历史时间', () => {
    const now = Date.now();
    store.history = {
      past: [
        { schema: { ...store.page, name: '五分钟前' }, timestamp: now - 5 * 60000 },
        { schema: { ...store.page, name: '三小时前' }, timestamp: now - 3 * 3600000 },
        { schema: { ...store.page, name: '几天前' }, timestamp: now - 5 * 86400000 },
        { schema: { ...store.page, name: '刚刚操作' }, timestamp: now },
      ],
      future: [],
    };

    const wrapper = mountPanel();

    expect(wrapper.text()).toContain('5分钟前');
    expect(wrapper.text()).toContain('3小时前');
    expect(wrapper.text()).toContain('刚刚');
    expect(wrapper.text()).toContain(new Date(now - 5 * 86400000).toLocaleDateString());
  });
});
