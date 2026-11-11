import { describe, it, expect, beforeEach, vi } from 'vitest';
import { nextTick } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia, type Pinia } from 'pinia';
import TemplateModal from '../components/TemplateModal.vue';
import ExportImageModal from '../components/ExportImageModal.vue';
import AIAssistant from '../components/AIAssistant.vue';
import HistoryPanel from '../components/HistoryPanel.vue';
import { useEditorStore } from '../stores/editorStore';

// 内置确认对话框桩：默认确认，用例可按需覆盖返回值
vi.mock('../composables/useConfirm', () => ({
  confirmDialog: vi.fn(() => Promise.resolve(true)),
  promptDialog: vi.fn(() => Promise.resolve(null)),
}));
vi.mock('../utils/toast', () => ({ toast: vi.fn() }));

import { confirmDialog } from '../composables/useConfirm';
import { toast } from '../utils/toast';

/** 调用通过 defineExpose 暴露的 openModal */
function openModal(wrapper: { vm: unknown }) {
  (wrapper.vm as { openModal: () => void }).openModal();
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  vi.mocked(confirmDialog).mockResolvedValue(true);
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
    await flushPromises();

    const store = useEditorStore(pinia);
    expect(store.page.id).toBe('page-landing');
    expect(store.page.name).toBe('产品介绍');
    expect(wrapper.find('.fixed').exists()).toBe(false);
    expect(confirmDialog).toHaveBeenCalledWith({
      title: '应用模板',
      message: '应用模板会覆盖当前页面内容，确定继续吗？',
      confirmText: '继续',
    });
  });

  it('取消确认时不应用模板且保持弹窗打开', async () => {
    vi.mocked(confirmDialog).mockResolvedValue(false);

    const wrapper = mountModal();
    openModal(wrapper);
    await nextTick();

    const card = wrapper.findAll('.cursor-pointer').find((c) => c.text().includes('个人主页'))!;
    await card.trigger('click');
    await flushPromises();

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

  it('初始无历史时展示 0/50，撤销与重做均禁用', () => {
    const wrapper = mountPanel();
    const buttons = wrapper.findAll('button');

    expect(wrapper.text()).toContain('操作历史');
    expect(wrapper.text()).toContain('0 / 50');
    expect(wrapper.text()).toContain('当前状态');
    expect(wrapper.text()).toContain('现在');
    expect((buttons[0].element as HTMLButtonElement).disabled).toBe(true);
    expect((buttons[1].element as HTMLButtonElement).disabled).toBe(true);
  });

  it('存在历史时展示条目与计数', () => {
    store.addComponent('text', 'root', 0, {}, {});
    const wrapper = mountPanel();

    expect(wrapper.text()).toContain('1 / 50');
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
    expect(wrapper.text()).toContain('0 / 50');

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
