import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import ComponentPanel from '../components/ComponentPanel.vue';
import LayerPanel from '../components/LayerPanel.vue';
import ContextMenu from '../components/ContextMenu.vue';
import { useEditorStore } from '../stores/editorStore';
import type { ComponentSchema } from '@page-builder/shared';

/** LayerTreeItem 桩：隔离其递归 / store 依赖（重型子组件） */
const LayerTreeItemStub = defineComponent({
  name: 'LayerTreeItem',
  props: {
    components: { type: Array, default: () => [] },
    depth: { type: Number, default: 0 },
  },
  setup(props) {
    return () =>
      h('div', {
        class: 'layer-tree-stub',
        'data-count': props.components.length,
        'data-depth': props.depth,
      });
  },
});

/** 生成组件 schema */
function makeComponent(
  id: string,
  type = 'text',
  extra: Partial<ComponentSchema> = {},
): ComponentSchema {
  return { id, type, props: {}, styles: {}, children: [], ...extra };
}

beforeEach(() => {
  setActivePinia(createPinia());
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ComponentPanel', () => {
  const draggableSelector = 'div[draggable="true"]';

  it('渲染组件库标题、搜索框与分类按钮，并按分类分组展示组件', () => {
    const wrapper = mount(ComponentPanel);

    expect(wrapper.text()).toContain('组件库');
    expect(wrapper.find('input').attributes('placeholder')).toBe('搜索组件...');

    const categoryLabels = wrapper.findAll('button').map((b) => b.text());
    expect(categoryLabels).toEqual(expect.arrayContaining(['全部', '基础', '媒体', '表单']));

    expect(wrapper.text()).toContain('基础组件');
    expect(wrapper.text()).toContain('布局组件');
    expect(wrapper.text()).toContain('表单组件');
    expect(wrapper.text()).toContain('内容组件');
    expect(wrapper.text()).toContain('媒体组件');

    // 注册表共 16 个组件，其中 carousel/countdown/progress 未归入任何分组，故渲染 13 个
    expect(wrapper.findAll(draggableSelector)).toHaveLength(13);
  });

  it('搜索时过滤组件并显示结果数量，无匹配时显示空提示', async () => {
    const wrapper = mount(ComponentPanel);

    await wrapper.find('input').setValue('button');
    expect(wrapper.text()).toContain('搜索结果 (1)');
    expect(wrapper.findAll(draggableSelector)).toHaveLength(1);
    expect(wrapper.text()).toContain('按钮');

    await wrapper.find('input').setValue('zzzzz');
    expect(wrapper.text()).toContain('未找到匹配的组件');
    expect(wrapper.findAll(draggableSelector)).toHaveLength(0);
  });

  it('点击清除按钮清空搜索并恢复分组视图', async () => {
    const wrapper = mount(ComponentPanel);
    await wrapper.find('input').setValue('button');
    expect(wrapper.text()).toContain('搜索结果');

    await wrapper
      .findAll('button')
      .find((b) => b.text() === '×')!
      .trigger('click');

    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('');
    expect(wrapper.text()).not.toContain('搜索结果');
    expect(wrapper.text()).toContain('基础组件');
  });

  it('切换分类仅展示对应组件', async () => {
    const wrapper = mount(ComponentPanel);
    const clickCategory = (label: string) =>
      wrapper
        .findAll('button')
        .find((b) => b.text() === label)!
        .trigger('click');

    await clickCategory('基础');
    expect(wrapper.findAll(draggableSelector)).toHaveLength(8);

    await clickCategory('媒体');
    expect(wrapper.findAll(draggableSelector)).toHaveLength(4);
    expect(wrapper.text()).toContain('视频');
    expect(wrapper.text()).not.toContain('文本');

    await clickCategory('表单');
    expect(wrapper.findAll(draggableSelector)).toHaveLength(2);
  });

  it('点击星标切换收藏状态并持久化到 localStorage', async () => {
    const wrapper = mount(ComponentPanel);
    expect(wrapper.text()).not.toContain('收藏的组件');

    const firstStar = () => wrapper.find(`${draggableSelector} button`);
    expect(firstStar().classes()).toContain('text-gray-400');

    // 收藏第一个组件（text）
    await firstStar().trigger('click');
    await nextTick();
    expect(JSON.parse(localStorage.getItem('favorite-components')!)).toEqual(['text']);
    expect(wrapper.text()).toContain('收藏的组件');
    expect(firstStar().classes()).toContain('text-yellow-500');

    // 再次点击取消收藏
    await firstStar().trigger('click');
    await nextTick();
    expect(JSON.parse(localStorage.getItem('favorite-components')!)).toEqual([]);
    expect(wrapper.text()).not.toContain('收藏的组件');
  });

  it('拖拽开始与结束切换 store 的 isDragging', async () => {
    const store = useEditorStore();
    const wrapper = mount(ComponentPanel);
    const el = wrapper.find(draggableSelector).element;

    const start = new Event('dragstart', { bubbles: true });
    Object.defineProperty(start, 'dataTransfer', {
      value: { setData: vi.fn(), effectAllowed: '' },
    });
    el.dispatchEvent(start);
    await nextTick();
    expect(store.isDragging).toBe(true);

    el.dispatchEvent(new Event('dragend', { bubbles: true }));
    await nextTick();
    expect(store.isDragging).toBe(false);
  });
});

describe('LayerPanel', () => {
  const stubs = { LayerTreeItem: LayerTreeItemStub };
  const mountLayerPanel = () => mount(LayerPanel, { global: { stubs } });

  it('无组件时展示空状态', () => {
    const wrapper = mountLayerPanel();
    expect(wrapper.text()).toContain('暂无组件');
    expect(wrapper.findAll('div.flex.items-center')).toHaveLength(0);
  });

  it('渲染组件标签并按选中态高亮，点击行切换选中', async () => {
    const store = useEditorStore();
    store.setPage({ ...store.page, children: [makeComponent('a'), makeComponent('b', 'button')] });
    const wrapper = mountLayerPanel();

    expect(wrapper.text()).toContain('📝 文本');
    expect(wrapper.text()).toContain('🔘 按钮');

    const rows = wrapper.findAll('div.flex.items-center');
    expect(rows).toHaveLength(2);
    expect(rows[0].classes()).not.toContain('bg-blue-50');

    await rows[0].trigger('click');
    expect(store.selectedId).toBe('a');
    expect(rows[0].classes()).toContain('bg-blue-50');

    await rows[1].trigger('click');
    expect(store.selectedId).toBe('b');
  });

  it('隐藏与锁定状态影响行样式与按钮标题', () => {
    const store = useEditorStore();
    store.setPage({
      ...store.page,
      children: [makeComponent('a', 'text', { visible: false, locked: true })],
    });
    const wrapper = mountLayerPanel();

    const row = wrapper.find('div.flex.items-center');
    expect(row.classes()).toContain('opacity-50');
    expect(wrapper.text()).toContain('🔒 ');
    expect(wrapper.find('button[title="显示"]').exists()).toBe(true);
    expect(wrapper.find('button[title="解锁"]').exists()).toBe(true);
  });

  it('切换可见性调用 updateComponent', async () => {
    const store = useEditorStore();
    store.setPage({ ...store.page, children: [makeComponent('a')] });
    const wrapper = mountLayerPanel();

    await wrapper.find('button[title="隐藏"]').trigger('click');
    expect(store.getComponentById('a')!.visible).toBe(false);

    await wrapper.find('button[title="显示"]').trigger('click');
    expect(store.getComponentById('a')!.visible).toBe(true);
  });

  it('切换锁定调用 updateComponent', async () => {
    const store = useEditorStore();
    store.setPage({ ...store.page, children: [makeComponent('a')] });
    const wrapper = mountLayerPanel();

    await wrapper.find('button[title="锁定"]').trigger('click');
    expect(store.getComponentById('a')!.locked).toBe(true);
  });

  it('点击删除按钮移除组件', async () => {
    const store = useEditorStore();
    store.setPage({ ...store.page, children: [makeComponent('a')] });
    const wrapper = mountLayerPanel();

    await wrapper.find('button[title="删除"]').trigger('click');
    expect(store.getComponentById('a')).toBeUndefined();
  });

  it('子组件交由 LayerTreeItem 递归渲染', () => {
    const store = useEditorStore();
    store.setPage({
      ...store.page,
      children: [makeComponent('a', 'container', { children: [makeComponent('c')] })],
    });
    const wrapper = mountLayerPanel();

    const stub = wrapper.find('.layer-tree-stub');
    expect(stub.exists()).toBe(true);
    expect(stub.attributes('data-count')).toBe('1');
    expect(stub.attributes('data-depth')).toBe('1');
  });

  it('未桩化时容器内子组件由真实 LayerTreeItem 递归渲染', () => {
    const store = useEditorStore();
    store.setPage({
      ...store.page,
      children: [makeComponent('a', 'container', { children: [makeComponent('c')] })],
    });
    // 不传 LayerTreeItem 桩：若未正确 import 该组件，子级标签不会渲染
    const wrapper = mount(LayerPanel);

    expect(wrapper.text()).toContain('📝 文本');
    expect(wrapper.findAll('div.flex.items-center')).toHaveLength(2);
  });
});

describe('ContextMenu', () => {
  let wrappers: VueWrapper[] = [];

  beforeEach(() => {
    wrappers = [];
  });

  afterEach(() => {
    wrappers.forEach((w) => w.unmount());
    wrappers = [];
    document.body.innerHTML = '';
  });

  const menuEl = () => document.body.querySelector<HTMLElement>('.fixed.z-50');
  const menuButtons = () =>
    Array.from(document.body.querySelectorAll<HTMLButtonElement>('.fixed.z-50 button'));
  const findMenuButton = (label: string) =>
    menuButtons().find((b) => b.textContent?.includes(label));

  function mountMenu() {
    const wrapper = mount(ContextMenu);
    wrappers.push(wrapper);
    return wrapper;
  }

  /** 调用组件暴露的 show 打开菜单 */
  async function openMenu(wrapper: VueWrapper, id: string) {
    const evt = new MouseEvent('contextmenu', {
      clientX: 120,
      clientY: 240,
      cancelable: true,
      bubbles: true,
    });
    (wrapper.vm as unknown as { show: (e: MouseEvent, id: string) => void }).show(evt, id);
    await nextTick();
    return evt;
  }

  async function clickMenu(label: string) {
    const btn = findMenuButton(label);
    expect(btn).toBeTruthy();
    btn!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await nextTick();
  }

  it('初始不渲染菜单', () => {
    mountMenu();
    expect(menuEl()).toBeNull();
  });

  it('调用 show 后按坐标渲染菜单并选中目标组件', async () => {
    const store = useEditorStore();
    store.setPage({ ...store.page, children: [makeComponent('a'), makeComponent('b', 'button')] });
    const wrapper = mountMenu();

    const evt = await openMenu(wrapper, 'a');

    const el = menuEl();
    expect(el).not.toBeNull();
    expect(el!.style.left).toBe('120px');
    expect(el!.style.top).toBe('240px');
    expect(evt.defaultPrevented).toBe(true);
    expect(store.selectedId).toBe('a');
    // 复制/粘贴/快速复制 + 3 分隔项 + 上移/下移/置顶/置底 + 锁定/显示 + 删除 = 13 个按钮
    expect(menuButtons()).toHaveLength(13);
    expect(el!.textContent).toContain('复制');
    expect(el!.textContent).toContain('快速复制');
    expect(el!.textContent).toContain('移到顶部');
    expect(el!.textContent).toContain('删除');
  });

  it('菜单项禁用状态随目标位置与剪贴板状态变化', async () => {
    const store = useEditorStore();
    store.setPage({
      ...store.page,
      children: [makeComponent('a'), makeComponent('b', 'button'), makeComponent('c', 'image')],
    });
    const wrapper = mountMenu();

    await openMenu(wrapper, 'a');
    expect(findMenuButton('上移一层')!.disabled).toBe(true);
    expect(findMenuButton('移到底部')!.disabled).toBe(true);
    expect(findMenuButton('下移一层')!.disabled).toBe(false);
    expect(findMenuButton('粘贴')!.disabled).toBe(true);

    await openMenu(wrapper, 'c');
    expect(findMenuButton('下移一层')!.disabled).toBe(true);
    expect(findMenuButton('移到顶部')!.disabled).toBe(true);
    expect(findMenuButton('上移一层')!.disabled).toBe(false);
  });

  it('复制写入剪贴板，粘贴在复制后可用', async () => {
    const store = useEditorStore();
    store.setPage({ ...store.page, children: [makeComponent('a'), makeComponent('b', 'button')] });
    const wrapper = mountMenu();

    await openMenu(wrapper, 'a');
    await clickMenu('复制');
    expect(store.clipboard).toHaveLength(1);
    expect(store.clipboard[0].id).toBe('a');
    // 执行动作后菜单关闭
    expect(menuEl()).toBeNull();

    await openMenu(wrapper, 'a');
    expect(findMenuButton('粘贴')!.disabled).toBe(false);
    await clickMenu('粘贴');
    expect(store.page.children).toHaveLength(3);
  });

  it('快速复制会复制并粘贴出新组件', async () => {
    const store = useEditorStore();
    store.setPage({
      ...store.page,
      children: [makeComponent('a'), makeComponent('b', 'button'), makeComponent('c', 'image')],
    });
    const wrapper = mountMenu();

    await openMenu(wrapper, 'a');
    await clickMenu('快速复制');

    expect(store.page.children).toHaveLength(4);
  });

  it('上移/下移/置顶/置底调用 moveComponent', async () => {
    const store = useEditorStore();
    const resetPage = () =>
      store.setPage({
        ...store.page,
        children: [makeComponent('a'), makeComponent('b', 'button'), makeComponent('c', 'image')],
      });
    const wrapper = mountMenu();

    resetPage();
    await openMenu(wrapper, 'b');
    await clickMenu('上移一层');
    expect(store.page.children[0].id).toBe('b');

    resetPage();
    await openMenu(wrapper, 'a');
    await clickMenu('下移一层');
    expect(store.page.children[1].id).toBe('a');

    resetPage();
    await openMenu(wrapper, 'a');
    await clickMenu('移到顶部');
    expect(store.page.children[2].id).toBe('a');

    resetPage();
    await openMenu(wrapper, 'c');
    await clickMenu('移到底部');
    expect(store.page.children[0].id).toBe('c');
  });

  it('切换锁定与可见性调用 updateComponent', async () => {
    const store = useEditorStore();
    store.setPage({ ...store.page, children: [makeComponent('a')] });
    const wrapper = mountMenu();

    await openMenu(wrapper, 'a');
    await clickMenu('锁定');
    expect(store.getComponentById('a')!.locked).toBe(true);

    // 已锁定后菜单文案变为「解锁」
    await openMenu(wrapper, 'a');
    expect(menuEl()!.textContent).toContain('解锁');
    await clickMenu('隐藏');
    expect(store.getComponentById('a')!.visible).toBe(false);
  });

  it('删除菜单项移除组件并关闭菜单', async () => {
    const store = useEditorStore();
    store.setPage({ ...store.page, children: [makeComponent('a'), makeComponent('b', 'button')] });
    const wrapper = mountMenu();

    await openMenu(wrapper, 'a');
    await clickMenu('删除');

    expect(store.getComponentById('a')).toBeUndefined();
    expect(store.selectedId).toBeNull();
    expect(menuEl()).toBeNull();
  });

  it('点击外部或右键外部均关闭菜单', async () => {
    const store = useEditorStore();
    store.setPage({ ...store.page, children: [makeComponent('a')] });
    const wrapper = mountMenu();

    await openMenu(wrapper, 'a');
    expect(menuEl()).not.toBeNull();
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await nextTick();
    expect(menuEl()).toBeNull();

    await openMenu(wrapper, 'a');
    document.body.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }));
    await nextTick();
    expect(menuEl()).toBeNull();
  });

  it('挂载时注册、卸载时移除全局事件监听', () => {
    const addSpy = vi.spyOn(document, 'addEventListener');
    const wrapper = mount(ContextMenu);

    expect(addSpy).toHaveBeenCalledWith('click', expect.any(Function));
    expect(addSpy).toHaveBeenCalledWith('contextmenu', expect.any(Function));

    const removeSpy = vi.spyOn(document, 'removeEventListener');
    wrapper.unmount();
    expect(removeSpy).toHaveBeenCalledWith('click', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('contextmenu', expect.any(Function));
  });
});
