import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import type { Pinia } from 'pinia';
import Canvas from '../components/Canvas.vue';
import CanvasComponent from '../components/CanvasComponent.vue';
import { useEditorStore } from '../stores/editorStore';
import type { ComponentSchema } from '@page-builder/shared';

// 内置确认对话框桩：默认确认，用例可按需覆盖返回值
vi.mock('../composables/useConfirm', () => ({
  confirmDialog: vi.fn(() => Promise.resolve(true)),
  promptDialog: vi.fn(() => Promise.resolve(null)),
}));

import { confirmDialog } from '../composables/useConfirm';

/** 组件注册表桩：让 Canvas / CanvasComponent 的分支逻辑可被确定性地驱动 */
vi.mock('../registry/componentRegistry', async () => {
  const { defineComponent: define, h: createEl } = await import('vue');
  const StubComponent = define({
    name: 'StubComponent',
    setup(_, { slots }) {
      return () =>
        createEl('div', { class: 'stub-component' }, slots.default ? slots.default() : []);
    },
  });
  return {
    getComponent: (type: string) => (type === 'unknown' ? undefined : StubComponent),
    getMeta: () => ({ defaultProps: { mock: true }, defaultStyles: {}, allowChildren: false }),
    isContainerType: (type: string) => type === 'container',
  };
});

/** 暴露 show 方法的 ContextMenu 桩，用于验证右键菜单调用 */
const contextMenuShow = vi.fn();
const ContextMenuStub = defineComponent({
  name: 'ContextMenu',
  setup(_, { expose }) {
    expose({ show: contextMenuShow });
    return () => h('div', { class: 'context-menu-stub' });
  },
});

function makeSchema(
  id: string,
  type = 'text',
  extra: Partial<ComponentSchema> = {},
): ComponentSchema {
  return { id, type, props: {}, styles: {}, children: [], ...extra };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Canvas', () => {
  let pinia: Pinia;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
    contextMenuShow.mockClear();
  });

  function mountCanvas() {
    return mount(Canvas, {
      global: {
        plugins: [pinia],
        stubs: { DeviceSwitcher: true, ContextMenu: ContextMenuStub },
      },
    });
  }

  /** 画布白底容器（唯一带 overflow-hidden 的元素） */
  function findCanvasSurface(wrapper: ReturnType<typeof mountCanvas>) {
    return wrapper.find('.bg-white.overflow-hidden');
  }

  it('空页面时展示拖拽提示占位', () => {
    const wrapper = mountCanvas();
    expect(wrapper.text()).toContain('从左侧拖拽组件到此处');
  });

  it('缩放按钮调整画布比例并展示百分比', async () => {
    const store = useEditorStore();
    const wrapper = mountCanvas();

    await wrapper.find('button[title="放大"]').trigger('click');
    expect(store.canvasScale).toBeCloseTo(1.1, 5);
    expect(wrapper.text()).toContain('110%');

    await wrapper.find('button[title="缩小"]').trigger('click');
    await wrapper.find('button[title="缩小"]').trigger('click');
    expect(store.canvasScale).toBeCloseTo(0.9, 5);
    expect(wrapper.text()).toContain('90%');
  });

  it('重置按钮恢复缩放与偏移', async () => {
    const store = useEditorStore();
    const wrapper = mountCanvas();

    store.setCanvasScale(1.5);
    store.setCanvasOffset(30, 40);
    await nextTick();

    await wrapper.find('button[title="重置"]').trigger('click');

    expect(store.canvasScale).toBe(1);
    expect(store.canvasOffset).toEqual({ x: 0, y: 0 });
  });

  it('网格按钮切换网格显示与激活样式', async () => {
    const store = useEditorStore();
    const wrapper = mountCanvas();
    const gridBtn = () => wrapper.find('button[title="显示网格"]');

    expect(store.showGrid).toBe(false);
    expect(gridBtn().classes()).not.toContain('bg-blue-100');
    expect(wrapper.find('.pointer-events-none').exists()).toBe(false);

    await gridBtn().trigger('click');
    expect(store.showGrid).toBe(true);
    expect(gridBtn().classes()).toContain('bg-blue-100');
    expect(wrapper.find('.pointer-events-none').exists()).toBe(true);
  });

  it('吸附按钮切换吸附开关与激活样式', async () => {
    const store = useEditorStore();
    const wrapper = mountCanvas();
    const snapBtn = () => wrapper.find('button[title="吸附网格"]');

    expect(store.snapToGrid).toBe(true);
    expect(snapBtn().classes()).toContain('bg-blue-100');

    await snapBtn().trigger('click');
    expect(store.snapToGrid).toBe(false);
    expect(snapBtn().classes()).not.toContain('bg-blue-100');
  });

  it('从面板拖入组件时按元数据添加到页面', async () => {
    const store = useEditorStore();
    const wrapper = mountCanvas();
    const surface = findCanvasSurface(wrapper);
    const dataTransfer = {
      getData: vi.fn(() => 'text'),
      setData: vi.fn(),
      dropEffect: '',
      effectAllowed: '',
    };

    await surface.trigger('dragover', { dataTransfer });
    expect(dataTransfer.dropEffect).toBe('copy');

    await surface.trigger('drop', { dataTransfer });
    expect(dataTransfer.getData).toHaveBeenCalledWith('componentType');
    expect(store.page.children).toHaveLength(1);
    expect(store.page.children[0].type).toBe('text');
    expect(store.page.children[0].props).toEqual({ mock: true });
  });

  it('点击画布空白处取消选中', async () => {
    const store = useEditorStore();
    store.setPage({ ...store.page, children: [makeSchema('a')] });
    const wrapper = mountCanvas();
    store.setSelectedId('a');

    await findCanvasSurface(wrapper).trigger('click');

    expect(store.selectedId).toBeNull();
  });

  it('点击子组件不会清空选中', async () => {
    const store = useEditorStore();
    store.setPage({ ...store.page, children: [makeSchema('a')] });
    const wrapper = mountCanvas();
    await nextTick();
    store.setSelectedId('a');

    await wrapper.find('[draggable="true"]').trigger('click');

    expect(store.selectedId).toBe('a');
  });

  it('拖拽组件到另一项时重新排序', async () => {
    const store = useEditorStore();
    store.setPage({ ...store.page, children: [makeSchema('a'), makeSchema('b')] });
    const wrapper = mountCanvas();
    await nextTick();

    const items = wrapper.findAll('[draggable="true"]');
    expect(items).toHaveLength(2);

    const dataTransfer = { setData: vi.fn(), getData: vi.fn(), effectAllowed: '', dropEffect: '' };
    await items[0].trigger('dragstart', { dataTransfer });
    expect(dataTransfer.setData).toHaveBeenCalledWith('componentId', 'a');
    expect(dataTransfer.effectAllowed).toBe('move');

    await items[1].trigger('dragover', { dataTransfer, clientY: 100 });
    await items[1].trigger('drop', { dataTransfer });

    expect(store.page.children.map((c) => c.id)).toEqual(['b', 'a']);
  });

  it('拖拽经过目标项显示插入指示条，dragend 后清除', async () => {
    const store = useEditorStore();
    store.setPage({ ...store.page, children: [makeSchema('a'), makeSchema('b')] });
    const wrapper = mountCanvas();
    await nextTick();

    const items = wrapper.findAll('[draggable="true"]');
    const dataTransfer = { setData: vi.fn(), getData: vi.fn(), effectAllowed: '', dropEffect: '' };

    await items[0].trigger('dragstart', { dataTransfer });
    expect(wrapper.find('.bg-blue-500').exists()).toBe(false);

    await items[1].trigger('dragover', { dataTransfer });
    expect(wrapper.find('.bg-blue-500').exists()).toBe(true);

    await items[0].trigger('dragend');
    expect(wrapper.find('.bg-blue-500').exists()).toBe(false);
  });

  it('右键组件弹出上下文菜单', async () => {
    const store = useEditorStore();
    store.setPage({ ...store.page, children: [makeSchema('a')] });
    const wrapper = mountCanvas();
    await nextTick();

    await wrapper.find('[draggable="true"]').trigger('contextmenu');

    expect(contextMenuShow).toHaveBeenCalledTimes(1);
    expect(contextMenuShow.mock.calls[0][1]).toBe('a');
  });
});

describe('CanvasComponent 拖拽落点分支', () => {
  let pinia: Pinia;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function mountCanvas() {
    return mount(Canvas, {
      global: {
        plugins: [pinia],
        stubs: { DeviceSwitcher: true, ContextMenu: ContextMenuStub },
      },
    });
  }

  /** 固定元素尺寸，使 clientY 能稳定命中「上方 / 下方」落点区域（jsdom 默认 rect 全为 0） */
  function stubRect(height = 100) {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
      top: 0,
      left: 0,
      bottom: height,
      right: 100,
      width: 100,
      height,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
  }

  function makeDataTransfer() {
    return { setData: vi.fn(), getData: vi.fn(), effectAllowed: '', dropEffect: '' };
  }

  it('已有组件拖到目标上方且源在目标之后时前移', async () => {
    const store = useEditorStore();
    store.setPage({ ...store.page, children: [makeSchema('a'), makeSchema('b')] });
    const wrapper = mountCanvas();
    await nextTick();
    stubRect();

    const items = wrapper.findAll('[draggable="true"]');
    const dataTransfer = makeDataTransfer();
    await items[1].trigger('dragstart', { dataTransfer }); // 拖 b（源在目标之后）
    await items[0].trigger('dragover', { dataTransfer, clientY: 10 }); // a 上方
    await items[0].trigger('drop', { dataTransfer });

    expect(store.page.children.map((c) => c.id)).toEqual(['b', 'a']);
  });

  it('已有组件拖到目标下方且源在目标之前时后移', async () => {
    const store = useEditorStore();
    store.setPage({ ...store.page, children: [makeSchema('a'), makeSchema('b')] });
    const wrapper = mountCanvas();
    await nextTick();
    stubRect();

    const items = wrapper.findAll('[draggable="true"]');
    const dataTransfer = makeDataTransfer();
    await items[0].trigger('dragstart', { dataTransfer }); // 拖 a（源在目标之前）
    await items[1].trigger('dragover', { dataTransfer, clientY: 90 }); // b 下方
    await items[1].trigger('drop', { dataTransfer });

    expect(store.page.children.map((c) => c.id)).toEqual(['b', 'a']);
  });

  it('已有组件拖到紧邻下一项上方（源在目标之前）时保持原位', async () => {
    const store = useEditorStore();
    store.setPage({ ...store.page, children: [makeSchema('a'), makeSchema('b')] });
    const wrapper = mountCanvas();
    await nextTick();
    stubRect();

    const items = wrapper.findAll('[draggable="true"]');
    const dataTransfer = makeDataTransfer();
    await items[0].trigger('dragstart', { dataTransfer }); // 拖 a
    await items[1].trigger('dragover', { dataTransfer, clientY: 10 }); // b 上方（源在目标之前，索引左移补偿）
    await items[1].trigger('drop', { dataTransfer });

    expect(store.page.children.map((c) => c.id)).toEqual(['a', 'b']);
  });

  it('新组件拖到目标项上方时插入到该项之前', async () => {
    const store = useEditorStore();
    store.setPage({ ...store.page, children: [makeSchema('a'), makeSchema('b')] });
    const wrapper = mountCanvas();
    await nextTick();
    stubRect();
    store.setDraggedComponentType('button');

    const items = wrapper.findAll('[draggable="true"]');
    const dataTransfer = makeDataTransfer();
    await items[1].trigger('dragover', { dataTransfer, clientY: 10 }); // b 上方
    await items[1].trigger('drop', { dataTransfer });

    expect(store.page.children.map((c) => c.type)).toEqual(['text', 'button', 'text']);
  });

  it('新组件拖到目标项下方时插入到该项之后', async () => {
    const store = useEditorStore();
    store.setPage({ ...store.page, children: [makeSchema('a'), makeSchema('b')] });
    const wrapper = mountCanvas();
    await nextTick();
    stubRect();
    store.setDraggedComponentType('button');

    const items = wrapper.findAll('[draggable="true"]');
    const dataTransfer = makeDataTransfer();
    await items[0].trigger('dragover', { dataTransfer, clientY: 90 }); // a 下方
    await items[0].trigger('drop', { dataTransfer });

    expect(store.page.children.map((c) => c.type)).toEqual(['text', 'button', 'text']);
  });

  it('dragleave 指向内部元素时不落点指示，指向外部时清除', async () => {
    const store = useEditorStore();
    store.setPage({ ...store.page, children: [makeSchema('a')] });
    const wrapper = mountCanvas();
    await nextTick();
    stubRect();

    const item = wrapper.find('[draggable="true"]');
    const dataTransfer = makeDataTransfer();
    await item.trigger('dragstart', { dataTransfer });
    await item.trigger('dragover', { dataTransfer, clientY: 10 });
    expect(wrapper.find('.bg-blue-500').exists()).toBe(true);

    // 相关目标仍在该元素内部：保留落点指示
    await item.trigger('dragleave', { relatedTarget: item.element });
    expect(wrapper.find('.bg-blue-500').exists()).toBe(true);

    // 相关目标为空（真正离开）：清除落点指示
    await item.trigger('dragleave', { relatedTarget: null });
    expect(wrapper.find('.bg-blue-500').exists()).toBe(false);
  });
});

describe('CanvasComponent', () => {
  let pinia: Pinia;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
  });

  function mountComponent(component: ComponentSchema, isSelected = false) {
    return mount(CanvasComponent, {
      props: { component, isSelected },
      global: { plugins: [pinia] },
    });
  }

  it('未知组件类型渲染占位提示', () => {
    const wrapper = mountComponent(makeSchema('u', 'unknown'));
    expect(wrapper.text()).toContain('未知组件: unknown');
  });

  it('选中时应用高亮样式并显示操作按钮与类型标签', () => {
    const wrapper = mountComponent(makeSchema('t', 'text'), true);

    expect(wrapper.classes()).toContain('ring-2');
    expect(wrapper.classes()).toContain('ring-blue-500');
    expect(wrapper.find('.stub-component').exists()).toBe(true);
    expect(wrapper.text()).toContain('📝 文本');
    expect(wrapper.find('button[title="复制"]').exists()).toBe(true);
    expect(wrapper.find('button[title="删除"]').exists()).toBe(true);
  });

  it('未选中时不显示操作按钮，悬停时显示类型标签', async () => {
    const store = useEditorStore();
    const wrapper = mountComponent(makeSchema('t', 'text'), false);

    expect(wrapper.classes()).not.toContain('ring-2');
    expect(wrapper.find('button[title="复制"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('📝 文本');

    await wrapper.trigger('mouseenter');
    expect(store.hoveredId).toBe('t');
    expect(wrapper.classes()).toContain('ring-blue-300');
    expect(wrapper.text()).toContain('📝 文本');

    await wrapper.trigger('mouseleave');
    expect(store.hoveredId).toBeNull();
  });

  it('锁定组件点击不可选中且不显示标签', async () => {
    const store = useEditorStore();
    const wrapper = mountComponent(makeSchema('l', 'text', { locked: true }), true);

    expect(wrapper.classes()).toContain('cursor-not-allowed');
    expect(wrapper.classes()).not.toContain('ring-2');
    expect(wrapper.find('[title="组件已锁定"] svg').exists()).toBe(true);
    expect(wrapper.text()).not.toContain('📝 文本');

    store.setSelectedId('other');
    await wrapper.trigger('click');
    expect(store.selectedId).toBe('other');
  });

  it('点击选中组件，Shift 点击切换多选', async () => {
    const store = useEditorStore();
    const wrapper = mountComponent(makeSchema('t', 'text'), false);

    await wrapper.trigger('click');
    expect(store.selectedId).toBe('t');

    store.setSelectedId('x');
    await wrapper.trigger('click', { shiftKey: true });
    expect(store.selectedIds).toEqual(['x', 't']);
    expect(store.selectedId).toBe('t');
  });

  it('删除按钮经确认后删除组件', async () => {
    const store = useEditorStore();
    const schema = makeSchema('t', 'text');
    store.setPage({ ...store.page, children: [schema] });
    const wrapper = mountComponent(schema, true);

    vi.mocked(confirmDialog).mockResolvedValue(true);
    await wrapper.find('button[title="删除"]').trigger('click');
    await flushPromises();

    expect(store.getComponentById('t')).toBeUndefined();
  });

  it('取消确认时不删除组件', async () => {
    const store = useEditorStore();
    const schema = makeSchema('t', 'text');
    store.setPage({ ...store.page, children: [schema] });
    const wrapper = mountComponent(schema, true);

    vi.mocked(confirmDialog).mockResolvedValue(false);
    await wrapper.find('button[title="删除"]').trigger('click');
    await flushPromises();

    expect(store.getComponentById('t')).toBeDefined();
  });

  it('复制按钮在组件后插入副本', async () => {
    const store = useEditorStore();
    const schema = makeSchema('a', 'text');
    store.setPage({ ...store.page, children: [schema] });
    const wrapper = mountComponent(schema, true);

    await wrapper.find('button[title="复制"]').trigger('click');

    expect(store.page.children).toHaveLength(2);
    expect(store.page.children[1].type).toBe('text');
    expect(store.page.children[1].id).not.toBe('a');
  });

  it('容器为空时显示拖拽占位提示', () => {
    const store = useEditorStore();
    const container = makeSchema('c1', 'container');
    store.setPage({ ...store.page, children: [container] });
    const wrapper = mountComponent(container, true);

    expect(wrapper.text()).toContain('拖拽组件到此处');
  });

  it('容器有子组件时递归渲染子组件', () => {
    const store = useEditorStore();
    const child = makeSchema('k1', 'unknown');
    const container = makeSchema('c2', 'container', { children: [child] });
    store.setPage({ ...store.page, children: [container] });
    const wrapper = mountComponent(container, false);

    expect(wrapper.find('.space-y-2').exists()).toBe(true);
    expect(wrapper.text()).toContain('未知组件: unknown');
  });

  it('向选中容器拖入组件时添加为子组件', async () => {
    const store = useEditorStore();
    const container = makeSchema('c1', 'container');
    store.setPage({ ...store.page, children: [container] });
    const wrapper = mountComponent(container, true);

    const dataTransfer = {
      getData: vi.fn(() => 'button'),
      setData: vi.fn(),
      dropEffect: '',
      effectAllowed: '',
    };
    // 先触发 dragover 设置落点为容器内部，再 drop
    await wrapper.trigger('dragover', { dataTransfer, clientY: 0 });
    await wrapper.trigger('drop', { dataTransfer });

    expect(store.page.children[0].children).toHaveLength(1);
    expect(store.page.children[0].children![0].type).toBe('button');
  });
});
