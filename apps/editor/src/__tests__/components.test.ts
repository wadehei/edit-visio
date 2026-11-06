import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import StyleField from '../components/StyleField.vue';
import StyleSection from '../components/StyleSection.vue';
import DeviceSwitcher from '../components/DeviceSwitcher.vue';
import ThemeSwitcher from '../components/ThemeSwitcher.vue';
import ErrorBoundary from '../components/ErrorBoundary.vue';
import ShortcutsModal from '../components/ShortcutsModal.vue';
import ComponentItem from '../components/ComponentItem.vue';
import LayerTreeItem from '../components/LayerTreeItem.vue';
import { useEditorStore } from '../stores/editorStore';
import { logger } from '../utils/logger';
import type { ComponentMeta, ComponentSchema } from '@page-builder/shared';

/** 简易 matchMedia 桩，供依赖 useTheme 的组件使用 */
function stubMatchMedia(matches = false) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      get matches() {
        return matches;
      },
      media: '(prefers-color-scheme: dark)',
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })),
  );
}

describe('StyleField', () => {
  it('应渲染 label、value 与 placeholder', () => {
    const wrapper = mount(StyleField, {
      props: { label: '背景色', value: '#ffffff', placeholder: '请输入颜色' },
    });

    expect(wrapper.find('label').text()).toBe('背景色');
    const input = wrapper.find('input').element as HTMLInputElement;
    expect(input.value).toBe('#ffffff');
    expect(input.placeholder).toBe('请输入颜色');
  });

  it('输入时应向外 emit change 事件', async () => {
    const wrapper = mount(StyleField, { props: { label: '宽度', value: '' } });

    await wrapper.find('input').setValue('120px');

    expect(wrapper.emitted('change')).toEqual([['120px']]);
  });
});

describe('StyleSection', () => {
  it('默认折叠，点击标题后展开并可再次收起', async () => {
    const wrapper = mount(StyleSection, {
      props: { title: '基础样式' },
      slots: { default: '<span class="content">内容</span>' },
    });

    expect(wrapper.text()).toContain('基础样式');
    expect(wrapper.find('.content').exists()).toBe(false);

    await wrapper.find('button').trigger('click');
    expect(wrapper.find('.content').exists()).toBe(true);

    await wrapper.find('button').trigger('click');
    expect(wrapper.find('.content').exists()).toBe(false);
  });

  it('defaultOpen 为 true 时应默认展开', () => {
    const wrapper = mount(StyleSection, {
      props: { title: '布局', defaultOpen: true },
      slots: { default: '<span class="content">内容</span>' },
    });

    expect(wrapper.find('.content').exists()).toBe(true);
  });
});

describe('DeviceSwitcher', () => {
  it('渲染全部设备按钮，默认手机为激活态', () => {
    const wrapper = mount(DeviceSwitcher);
    const buttons = wrapper.findAll('button');

    expect(buttons).toHaveLength(4);
    expect(wrapper.text()).toContain('手机');
    expect(wrapper.text()).toContain('平板');
    expect(wrapper.text()).toContain('桌面');
    // 默认 mobile 激活
    expect(buttons[0].classes()).toContain('bg-blue-500');
    expect(buttons[1].classes()).toContain('bg-gray-100');
  });

  it('点击其他设备后切换激活态并显示自定义齿轮', async () => {
    const wrapper = mount(DeviceSwitcher);

    // 非 custom 时不显示齿轮按钮
    expect(wrapper.findAll('button')).toHaveLength(4);

    await wrapper.findAll('button')[3].trigger('click');

    const gear = wrapper.findAll('button')[4];
    expect(gear.attributes('title')).toBe('自定义尺寸');
    expect(wrapper.findAll('button')[3].classes()).toContain('bg-blue-500');
  });

  it('打开弹窗后应用自定义尺寸并关闭', async () => {
    const wrapper = mount(DeviceSwitcher);
    await wrapper.findAll('button')[3].trigger('click');
    await wrapper.findAll('button')[4].trigger('click');

    const inputs = wrapper.findAll('input');
    expect(inputs).toHaveLength(2);
    expect((inputs[0].element as HTMLInputElement).value).toBe('375');

    await inputs[0].setValue('800');
    await inputs[1].setValue('600');
    await wrapper
      .findAll('button')
      .find((b) => b.text() === '应用')!
      .trigger('click');

    // 应用后弹窗关闭
    expect(wrapper.find('input').exists()).toBe(false);
  });

  it('取消按钮与遮罩点击均可关闭弹窗', async () => {
    const wrapper = mount(DeviceSwitcher);
    await wrapper.findAll('button')[3].trigger('click');
    await wrapper.findAll('button')[4].trigger('click');
    await wrapper
      .findAll('button')
      .find((b) => b.text() === '取消')!
      .trigger('click');
    expect(wrapper.find('input').exists()).toBe(false);

    // 再次打开后点击遮罩关闭
    await wrapper.findAll('button')[4].trigger('click');
    expect(wrapper.find('input').exists()).toBe(true);
    await wrapper.find('.fixed').trigger('click');
    expect(wrapper.find('input').exists()).toBe(false);
  });
});

describe('ThemeSwitcher', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
    document.documentElement.removeAttribute('style');
    stubMatchMedia(false);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('点击按钮展开下拉，展示主题模式与预设色', async () => {
    const wrapper = mount(ThemeSwitcher);
    expect(wrapper.text()).not.toContain('主题模式');

    await wrapper.find('button').trigger('click');

    expect(wrapper.text()).toContain('主题模式');
    expect(wrapper.text()).toContain('亮色模式');
    expect(wrapper.text()).toContain('暗色模式');
    expect(wrapper.text()).toContain('跟随系统');
    expect(wrapper.text()).toContain('主题色');
    // 1 个切换按钮 + 3 个模式 + 8 个颜色
    expect(wrapper.findAll('button')).toHaveLength(12);
  });

  it('选择暗色模式后应用 dark 类并持久化配置', async () => {
    const wrapper = mount(ThemeSwitcher);
    await wrapper.find('button').trigger('click');
    await wrapper
      .findAll('button')
      .find((b) => b.text().includes('暗色模式'))!
      .trigger('click');

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(JSON.parse(localStorage.getItem('theme-config')!)).toEqual({
      mode: 'dark',
      primaryColor: '#3b82f6',
    });
  });

  it('选择主题色后更新 --primary-color', async () => {
    const wrapper = mount(ThemeSwitcher);
    await wrapper.find('button').trigger('click');

    const colorButtons = wrapper
      .findAll('button')
      .filter((b) => b.attributes('style')?.includes('background-color'));
    expect(colorButtons).toHaveLength(8);

    await colorButtons[2].trigger('click');

    expect(document.documentElement.style.getPropertyValue('--primary-color')).toBe('#ec4899');
    expect(JSON.parse(localStorage.getItem('theme-config')!).primaryColor).toBe('#ec4899');
  });

  it('点击外部区域关闭下拉菜单', async () => {
    const wrapper = mount(ThemeSwitcher);
    await wrapper.find('button').trigger('click');
    expect(wrapper.text()).toContain('主题模式');

    const outside = document.createElement('div');
    document.body.appendChild(outside);
    outside.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await nextTick();

    expect(wrapper.text()).not.toContain('主题模式');
    outside.remove();
  });
});

describe('ErrorBoundary', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  /** 生成子组件：getError 返回错误时在 setup 中抛出，否则渲染正常内容 */
  function makeChild(getError: () => Error | null) {
    return defineComponent({
      setup() {
        const error = getError();
        if (error) throw error;
        return () => h('span', { class: 'ok' }, '恢复正常');
      },
      render: () => h('span'),
    });
  }

  it('正常情况下渲染默认插槽内容', () => {
    const wrapper = mount(ErrorBoundary, {
      slots: { default: '<span class="ok">正常内容</span>' },
    });

    expect(wrapper.find('.ok').exists()).toBe(true);
    expect(wrapper.text()).not.toContain('组件渲染出错');
  });

  it('捕获子组件错误后展示错误信息并记录日志', async () => {
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
    const throwing = makeChild(() => new Error('渲染失败'));

    const wrapper = mount(ErrorBoundary, { slots: { default: () => h(throwing) } });
    await nextTick();

    expect(wrapper.text()).toContain('组件渲染出错');
    expect(wrapper.text()).toContain('渲染失败');
    expect(errorSpy).toHaveBeenCalledWith('ErrorBoundary', '渲染失败', expect.any(Error));
  });

  it('错误信息为空时回退为「未知错误」', async () => {
    vi.spyOn(logger, 'error').mockImplementation(() => {});
    const throwing = makeChild(() => new Error(''));

    const wrapper = mount(ErrorBoundary, { slots: { default: () => h(throwing) } });
    await nextTick();

    expect(wrapper.text()).toContain('未知错误');
  });

  it('点击重试后恢复渲染子内容', async () => {
    vi.spyOn(logger, 'error').mockImplementation(() => {});
    let error: Error | null = new Error('临时错误');
    const flaky = makeChild(() => error);

    const wrapper = mount(ErrorBoundary, { slots: { default: () => h(flaky) } });
    await nextTick();
    expect(wrapper.text()).toContain('组件渲染出错');

    error = null;
    await wrapper.find('button').trigger('click');
    await nextTick();

    expect(wrapper.find('.ok').exists()).toBe(true);
    expect(wrapper.text()).not.toContain('组件渲染出错');
  });
});

describe('ShortcutsModal', () => {
  async function openModal() {
    const wrapper = mount(ShortcutsModal);
    (wrapper.vm as unknown as { openModal: () => void }).openModal();
    await nextTick();
    return wrapper;
  }

  it('初始不渲染，调用 openModal 后展示全部快捷键分类', async () => {
    const wrapper = mount(ShortcutsModal);
    expect(wrapper.find('.fixed').exists()).toBe(false);

    (wrapper.vm as unknown as { openModal: () => void }).openModal();
    await nextTick();

    expect(wrapper.find('.fixed').exists()).toBe(true);
    expect(wrapper.text()).toContain('编辑操作');
    expect(wrapper.text()).toContain('导航操作');
    expect(wrapper.text()).toContain('文件操作');
    expect(wrapper.text()).toContain('视图操作');
  });

  it('按名称搜索时过滤分类，仅保留命中项', async () => {
    const wrapper = await openModal();

    await wrapper.find('input').setValue('保存');

    expect(wrapper.text()).toContain('保存');
    expect(wrapper.text()).not.toContain('编辑操作');
    expect(wrapper.text()).not.toContain('视图操作');
  });

  it('按快捷键按键搜索时匹配 keys', async () => {
    const wrapper = await openModal();

    await wrapper.find('input').setValue('ctrl');

    expect(wrapper.text()).toContain('撤销');
    expect(wrapper.text()).toContain('保存');
    expect(wrapper.text()).not.toContain('导航操作');
  });

  it('无匹配结果时展示空提示', async () => {
    const wrapper = await openModal();

    await wrapper.find('input').setValue('zzzzz');

    expect(wrapper.text()).toContain('未找到匹配的快捷键');
  });

  it('点击关闭按钮隐藏弹窗并清空搜索', async () => {
    const wrapper = await openModal();
    await wrapper.find('input').setValue('保存');

    await wrapper.find('button').trigger('click');
    expect(wrapper.find('.fixed').exists()).toBe(false);

    (wrapper.vm as unknown as { openModal: () => void }).openModal();
    await nextTick();
    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('');
    expect(wrapper.text()).toContain('编辑操作');
  });

  it('点击遮罩层关闭弹窗', async () => {
    const wrapper = await openModal();

    await wrapper.find('.fixed').trigger('click');

    expect(wrapper.find('.fixed').exists()).toBe(false);
  });
});

describe('ComponentItem', () => {
  const baseMeta = { label: '文本组件', category: 'basic' } as ComponentMeta;

  it('按组件类型渲染对应图标与标签', () => {
    const cases: Array<[string, string]> = [
      ['text', '📝'],
      ['button', '🔘'],
      ['image', '🖼️'],
      ['container', '📦'],
      ['divider', '➖'],
      ['spacer', '↕️'],
      ['card', '🎴'],
      ['badge', '🏷️'],
      ['richText', '📄'],
      ['input', '⌨️'],
      ['video', '📹'],
      ['audio', '🎵'],
      ['map', '🗺️'],
    ];

    for (const [type, icon] of cases) {
      const wrapper = mount(ComponentItem, {
        props: { component: { ...baseMeta, type }, isFavorite: false },
      });
      expect(wrapper.text()).toContain(icon);
      expect(wrapper.text()).toContain('文本组件');
    }
  });

  it('未知组件类型不渲染图标但仍显示标签', () => {
    const wrapper = mount(ComponentItem, {
      props: { component: { ...baseMeta, type: 'unknown' }, isFavorite: false },
    });

    expect(wrapper.text()).toContain('文本组件');
    expect(wrapper.find('.text-2xl span').exists()).toBe(false);
  });

  it('收藏状态影响星标高亮样式', () => {
    const favorite = mount(ComponentItem, {
      props: { component: { ...baseMeta, type: 'text' }, isFavorite: true },
    });
    expect(favorite.find('button').classes()).toContain('text-yellow-500');

    const normal = mount(ComponentItem, {
      props: { component: { ...baseMeta, type: 'text' }, isFavorite: false },
    });
    expect(normal.find('button').classes()).toContain('text-gray-400');
  });

  it('点击收藏按钮向外 emit toggle-favorite', async () => {
    const wrapper = mount(ComponentItem, {
      props: { component: { ...baseMeta, type: 'text' }, isFavorite: false },
    });

    await wrapper.find('button').trigger('click');

    expect(wrapper.emitted('toggle-favorite')).toHaveLength(1);
  });

  it('拖拽开始与结束事件向外 emit', async () => {
    const wrapper = mount(ComponentItem, {
      props: { component: { ...baseMeta, type: 'text' }, isFavorite: false },
    });

    const root = wrapper.find('[draggable="true"]');
    await root.trigger('dragstart');
    await root.trigger('dragend');

    expect(wrapper.emitted('dragstart')).toHaveLength(1);
    expect(wrapper.emitted('dragend')).toHaveLength(1);
  });
});

describe('LayerTreeItem', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  function makeSchema(id: string, type = 'text', children?: ComponentSchema[]): ComponentSchema {
    return { id, type, props: {}, styles: {}, children };
  }

  it('渲染组件显示标签', () => {
    const wrapper = mount(LayerTreeItem, {
      props: { components: [makeSchema('a')], depth: 0 },
    });

    expect(wrapper.text()).toContain('📝 文本');
  });

  it('选中项高亮，点击其他条目切换选中', async () => {
    const store = useEditorStore();
    store.setSelectedId('a');

    const wrapper = mount(LayerTreeItem, {
      props: { components: [makeSchema('a'), makeSchema('b', 'button')], depth: 0 },
    });

    const rows = wrapper.findAll('div.flex.items-center');
    expect(rows[0].classes()).toContain('bg-blue-50');
    expect(rows[1].classes()).not.toContain('bg-blue-50');

    await rows[1].trigger('click');
    expect(store.selectedId).toBe('b');
  });

  it('点击删除按钮移除对应组件', async () => {
    const store = useEditorStore();
    store.setPage({ ...store.page, children: [makeSchema('a')] });

    const wrapper = mount(LayerTreeItem, {
      props: { components: store.page.children, depth: 0 },
    });

    await wrapper.find('button[title="删除"]').trigger('click');

    expect(store.getComponentById('a')).toBeUndefined();
  });

  it('递归渲染子节点并按层级增加缩进', () => {
    const wrapper = mount(LayerTreeItem, {
      props: { components: [makeSchema('a', 'container', [makeSchema('b')])], depth: 0 },
    });

    const rows = wrapper.findAll('div.flex.items-center');
    expect(rows).toHaveLength(2);
    expect(rows[0].attributes('style')).toContain('padding-left: 8px');
    expect(rows[1].attributes('style')).toContain('padding-left: 20px');
  });
});
