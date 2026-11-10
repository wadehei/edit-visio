import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import type { Ref } from 'vue';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import type { Pinia } from 'pinia';
import Canvas from '../components/Canvas.vue';
import CanvasComponent from '../components/CanvasComponent.vue';
import AlignmentGuides from '../components/AlignmentGuides.vue';
import { useEditorStore } from '../stores/editorStore';
import type { ComponentSchema } from '@page-builder/shared';

type GuideType = 'horizontal' | 'vertical';
interface Guide {
  type: GuideType;
  position: number;
  components: string[];
}
interface GuideState {
  guides: Ref<Guide[]>;
  showGuides: Ref<boolean>;
}

/** 共享给桩的辅助线状态：便于在用例中直接控制 AlignmentGuides 的渲染输入 */
const guideMock = vi.hoisted(() => ({ state: null as unknown as GuideState }));

vi.mock('../composables/useAlignmentGuides', async () => {
  const { ref } = await import('vue');
  const guides = ref<Guide[]>([]);
  const showGuides = ref(true);
  guideMock.state = { guides, showGuides };
  return {
    useAlignmentGuides: () => ({
      guides,
      showGuides,
      snapThreshold: ref(5),
      detectAlignment: () => {},
      clearGuides: () => {},
      toggleGuides: () => {},
    }),
  };
});

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
    expect(wrapper.text()).toContain('🔒');
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

    vi.stubGlobal(
      'confirm',
      vi.fn(() => true),
    );
    await wrapper.find('button[title="删除"]').trigger('click');

    expect(store.getComponentById('t')).toBeUndefined();
  });

  it('取消确认时不删除组件', async () => {
    const store = useEditorStore();
    const schema = makeSchema('t', 'text');
    store.setPage({ ...store.page, children: [schema] });
    const wrapper = mountComponent(schema, true);

    vi.stubGlobal(
      'confirm',
      vi.fn(() => false),
    );
    await wrapper.find('button[title="删除"]').trigger('click');

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

describe('AlignmentGuides', () => {
  beforeEach(() => {
    guideMock.state.guides.value = [];
    guideMock.state.showGuides.value = true;
  });

  it('无辅助线时不渲染 svg', () => {
    const wrapper = mount(AlignmentGuides);
    expect(wrapper.find('svg').exists()).toBe(false);
  });

  it('垂直辅助线渲染为垂直虚线', async () => {
    const wrapper = mount(AlignmentGuides);
    guideMock.state.guides.value = [{ type: 'vertical', position: 120, components: ['a', 'b'] }];
    await nextTick();

    const line = wrapper.find('line');
    expect(line.exists()).toBe(true);
    expect(line.attributes('x1')).toBe('120');
    expect(line.attributes('x2')).toBe('120');
    expect(line.attributes('y1')).toBe('0');
    expect(line.attributes('y2')).toBe('100%');

    const circle = wrapper.find('circle');
    expect(circle.attributes('cx')).toBe('120');
    expect(circle.attributes('cy')).toBe('50%');
  });

  it('水平辅助线渲染为水平虚线', async () => {
    const wrapper = mount(AlignmentGuides);
    guideMock.state.guides.value = [{ type: 'horizontal', position: 80, components: ['a'] }];
    await nextTick();

    const line = wrapper.find('line');
    expect(line.attributes('x1')).toBe('0');
    expect(line.attributes('x2')).toBe('100%');
    expect(line.attributes('y1')).toBe('80');
    expect(line.attributes('y2')).toBe('80');

    const circle = wrapper.find('circle');
    expect(circle.attributes('cx')).toBe('50%');
    expect(circle.attributes('cy')).toBe('80');
  });

  it('多条辅助线分别渲染 line 与 circle', async () => {
    const wrapper = mount(AlignmentGuides);
    guideMock.state.guides.value = [
      { type: 'vertical', position: 10, components: ['a'] },
      { type: 'horizontal', position: 20, components: ['b'] },
    ];
    await nextTick();

    expect(wrapper.findAll('line')).toHaveLength(2);
    expect(wrapper.findAll('circle')).toHaveLength(2);
  });

  it('showGuides 关闭时不渲染辅助线', async () => {
    const wrapper = mount(AlignmentGuides);
    guideMock.state.guides.value = [{ type: 'vertical', position: 10, components: ['a'] }];
    guideMock.state.showGuides.value = false;
    await nextTick();

    expect(wrapper.find('svg').exists()).toBe(false);
  });
});
