import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import PropertyPanel from '../components/PropertyPanel.vue';
import ComponentPropsPanel from '../components/property-panel/ComponentPropsPanel.vue';
import PageConfigPanel from '../components/property-panel/PageConfigPanel.vue';
import StylePanel from '../components/property-panel/StylePanel.vue';
import StyleSection from '../components/StyleSection.vue';
import StyleField from '../components/StyleField.vue';
import { useEditorStore } from '../stores/editorStore';
import type { ComponentMeta, PageSchema } from '@page-builder/shared';

/** LayerPanel 桩：隔离其内部对编辑器 store 的依赖（重型子组件） */
const LayerPanelStub = defineComponent({
  name: 'LayerPanel',
  setup: () => () => h('div', { class: 'layer-panel-stub' }),
});

/** 按标题查找 StyleSection 组件实例 */
function getSection(wrapper: VueWrapper, title: string) {
  return wrapper.findAllComponents(StyleSection).find((s) => s.props('title') === title)!;
}

/** 展开指定标题的 StyleSection（点击折叠头） */
async function expandSection(wrapper: VueWrapper, title: string) {
  await getSection(wrapper, title).find('button').trigger('click');
}

/** 收集当前渲染出的所有 StyleSection 标题 */
function sectionTitles(wrapper: VueWrapper): string[] {
  return wrapper.findAllComponents(StyleSection).map((s) => s.props('title') as string);
}

/** 按 label 查找 StyleField 组件实例 */
function getField(wrapper: VueWrapper, label: string) {
  return wrapper.findAllComponents(StyleField).find((f) => f.props('label') === label)!;
}

function makePage(): PageSchema {
  return {
    id: 'page-1',
    name: '首页',
    version: '1.0.0',
    props: { title: '首页标题', backgroundColor: '#ffffff' },
    children: [],
  };
}

/** 覆盖全部属性控件类型的元数据 */
const fullMeta: ComponentMeta = {
  type: 'demo',
  label: '演示组件',
  category: 'basic',
  defaultProps: {},
  defaultStyles: {},
  allowChildren: false,
  propDefinitions: [
    { name: 'text', label: '文本', type: 'string', placeholder: '输入文本' },
    { name: 'desc', label: '描述', type: 'textarea', placeholder: '输入描述' },
    { name: 'num', label: '数量', type: 'number' },
    { name: 'bg', label: '背景', type: 'color' },
    { name: 'flag', label: '启用', type: 'boolean' },
    {
      name: 'size',
      label: '尺寸',
      type: 'select',
      options: [
        { label: '小', value: 's' },
        { label: '大', value: 'l' },
      ],
    },
    { name: 'src', label: '图片', type: 'image' },
  ],
};

beforeEach(() => {
  // 每个用例使用全新的 pinia，避免状态串扰
  setActivePinia(createPinia());
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ComponentPropsPanel', () => {
  function mountPanel(
    overrides: Partial<ComponentMeta> = {},
    componentProps: Record<string, unknown> = {},
  ) {
    const meta: ComponentMeta = { ...fullMeta, ...overrides };
    return mount(ComponentPropsPanel, { props: { componentMeta: meta, componentProps } });
  }

  it('按 propDefinitions 渲染各类型控件', async () => {
    const wrapper = mountPanel(
      {},
      { text: 'hi', desc: 123, num: 5, bg: '#000000', flag: true, size: 's', src: 'a.png' },
    );
    await expandSection(wrapper, '组件属性');

    // string
    const textInput = wrapper.findAll('input[type="text"]')[0].element as HTMLInputElement;
    expect(textInput.value).toBe('hi');
    expect(textInput.placeholder).toBe('输入文本');

    // textarea：非字符串值被收窄为字符串
    const textarea = wrapper.find('textarea').element as HTMLTextAreaElement;
    expect(textarea.value).toBe('123');

    // number
    expect((wrapper.find('input[type="number"]').element as HTMLInputElement).value).toBe('5');

    // color
    expect(wrapper.find('input[type="color"]').exists()).toBe(true);

    // boolean
    expect((wrapper.find('input[type="checkbox"]').element as HTMLInputElement).checked).toBe(true);

    // select
    const select = wrapper.find('select');
    expect((select.element as HTMLSelectElement).value).toBe('s');
    expect(select.findAll('option')).toHaveLength(2);

    // image（type=text 且带默认占位）
    const imageInput = wrapper.findAll('input[type="text"]')[1].element as HTMLInputElement;
    expect(imageInput.placeholder).toBe('https://example.com/image.jpg');
  });

  it('string 输入触发 propChange', async () => {
    const wrapper = mountPanel();
    await expandSection(wrapper, '组件属性');

    await wrapper.findAll('input[type="text"]')[0].setValue('新值');

    expect(wrapper.emitted('propChange')).toContainEqual(['text', '新值']);
  });

  it('textarea 输入触发 propChange', async () => {
    const wrapper = mountPanel();
    await expandSection(wrapper, '组件属性');

    await wrapper.find('textarea').setValue('段落内容');

    expect(wrapper.emitted('propChange')).toContainEqual(['desc', '段落内容']);
  });

  it('number 输入转换为数字后触发 propChange', async () => {
    const wrapper = mountPanel();
    await expandSection(wrapper, '组件属性');

    await wrapper.find('input[type="number"]').setValue('42');

    expect(wrapper.emitted('propChange')).toContainEqual(['num', 42]);
  });

  it('color 与 select 变更触发 propChange', async () => {
    const wrapper = mountPanel();
    await expandSection(wrapper, '组件属性');

    await wrapper.find('input[type="color"]').setValue('#ff0000');
    await wrapper.find('select').setValue('l');

    expect(wrapper.emitted('propChange')).toContainEqual(['bg', '#ff0000']);
    expect(wrapper.emitted('propChange')).toContainEqual(['size', 'l']);
  });

  it('boolean 勾选触发 propChange', async () => {
    const wrapper = mountPanel();
    await expandSection(wrapper, '组件属性');

    await wrapper.find('input[type="checkbox"]').setValue(true);

    expect(wrapper.emitted('propChange')).toContainEqual(['flag', true]);
  });

  it('无 propDefinitions 时不渲染任何控件', () => {
    const wrapper = mountPanel({ propDefinitions: [] });

    expect(wrapper.find('button').exists()).toBe(false);
    expect(wrapper.findAll('input')).toHaveLength(0);
  });
});

describe('PageConfigPanel', () => {
  function mountPanel(page: PageSchema = makePage()) {
    return mount(PageConfigPanel, {
      props: { page },
      global: { stubs: { LayerPanel: LayerPanelStub } },
    });
  }

  it('默认展开基本信息并渲染页面名称与标题', () => {
    const wrapper = mountPanel();
    expect(wrapper.text()).toContain('页面配置');

    const inputs = wrapper.findAll('input[type="text"]');
    expect(inputs).toHaveLength(2);
    expect((inputs[0].element as HTMLInputElement).value).toBe('首页');
    expect((inputs[1].element as HTMLInputElement).value).toBe('首页标题');
  });

  it('修改页面名称触发 pageChange', async () => {
    const wrapper = mountPanel();

    await wrapper.findAll('input[type="text"]')[0].setValue('新页面');

    expect(wrapper.emitted('pageChange')).toContainEqual(['name', '新页面']);
  });

  it('修改页面标题触发 pagePropChange', async () => {
    const wrapper = mountPanel();

    await wrapper.findAll('input[type="text"]')[1].setValue('新标题');

    expect(wrapper.emitted('pagePropChange')).toContainEqual(['title', '新标题']);
  });

  it('展开页面背景后修改背景颜色触发 pagePropChange', async () => {
    const wrapper = mountPanel();
    await expandSection(wrapper, '页面背景');

    await wrapper.find('input[type="color"]').setValue('#eeeeee');

    expect(wrapper.emitted('pagePropChange')).toContainEqual(['backgroundColor', '#eeeeee']);
  });

  it('背景图片变更时传入字符串，清空时传入 undefined', async () => {
    const wrapper = mountPanel();
    await expandSection(wrapper, '页面背景');

    const field = getField(wrapper, '背景图片');
    await field.find('input').setValue('bg.jpg');
    await field.find('input').setValue('');

    const events = wrapper.emitted('pagePropChange')!;
    expect(events).toContainEqual(['backgroundImage', 'bg.jpg']);
    expect(events).toContainEqual(['backgroundImage', undefined]);
  });

  it('渲染图层结构分组并挂载 LayerPanel', () => {
    const wrapper = mountPanel();
    expect(wrapper.text()).toContain('图层结构');
    expect(wrapper.find('.layer-panel-stub').exists()).toBe(true);
  });
});

describe('StylePanel', () => {
  function mountPanel(styles: Record<string, string | undefined> = {}, isContainer = false) {
    return mount(StylePanel, { props: { styles, isContainer } });
  }

  it('默认渲染基础分组，非容器时不渲染布局分组', () => {
    const wrapper = mountPanel();
    const titles = sectionTitles(wrapper);

    expect(titles).toEqual(
      expect.arrayContaining(['尺寸', '间距', '排版', '边框', '背景', '效果']),
    );
    expect(titles).not.toContain('布局');
  });

  it('容器时渲染布局分组', () => {
    expect(sectionTitles(mountPanel({}, true))).toContain('布局');
  });

  it('尺寸字段输入触发 styleChange', async () => {
    const wrapper = mountPanel({ width: '50px' });
    await expandSection(wrapper, '尺寸');

    const widthField = getField(wrapper, '宽');
    expect((widthField.find('input').element as HTMLInputElement).value).toBe('50px');
    await widthField.find('input').setValue('120px');

    expect(wrapper.emitted('styleChange')).toContainEqual(['width', '120px']);
  });

  it('排版分组：字重、文字颜色与对齐按钮', async () => {
    const wrapper = mountPanel({ textAlign: 'center' });
    await expandSection(wrapper, '排版');

    const content = getSection(wrapper, '排版').find('.pb-3');
    await content.find('select').setValue('bold');
    await content.find('input[type="color"]').setValue('#123456');

    const buttons = content.findAll('button');
    const centerBtn = buttons.find((b) => b.text() === '中')!;
    const leftBtn = buttons.find((b) => b.text() === '左')!;
    expect(centerBtn.classes()).toContain('bg-blue-50');
    expect(leftBtn.classes()).not.toContain('bg-blue-50');

    await centerBtn.trigger('click');

    expect(wrapper.emitted('styleChange')).toContainEqual(['fontWeight', 'bold']);
    expect(wrapper.emitted('styleChange')).toContainEqual(['color', '#123456']);
    expect(wrapper.emitted('styleChange')).toContainEqual(['textAlign', 'center']);
  });

  it('边框样式选择触发 styleChange', async () => {
    const wrapper = mountPanel();
    await expandSection(wrapper, '边框');

    await getSection(wrapper, '边框').find('.pb-3').find('select').setValue('dashed');

    expect(wrapper.emitted('styleChange')).toContainEqual(['borderStyle', 'dashed']);
  });

  it('背景颜色输入触发 styleChange', async () => {
    const wrapper = mountPanel();
    await expandSection(wrapper, '背景');

    await getSection(wrapper, '背景').find('.pb-3').find('input[type="color"]').setValue('#abcdef');

    expect(wrapper.emitted('styleChange')).toContainEqual(['backgroundColor', '#abcdef']);
  });

  it('透明度滑杆输入触发 styleChange', async () => {
    const wrapper = mountPanel();
    await expandSection(wrapper, '效果');

    await getSection(wrapper, '效果').find('.pb-3').find('input[type="range"]').setValue('0.5');

    expect(wrapper.emitted('styleChange')).toContainEqual(['opacity', '0.5']);
  });

  it('布局分组：选择显示方式触发 styleChange', async () => {
    const wrapper = mountPanel({}, true);
    await expandSection(wrapper, '布局');

    await getSection(wrapper, '布局').find('.pb-3').find('select').setValue('flex');

    expect(wrapper.emitted('styleChange')).toContainEqual(['display', 'flex']);
  });

  it('display 为 flex 时额外展示方向与对齐选项', async () => {
    const wrapper = mountPanel({ display: 'flex' }, true);
    await expandSection(wrapper, '布局');

    const content = getSection(wrapper, '布局').find('.pb-3');
    expect(content.findAll('select')).toHaveLength(4);
    expect(content.text()).toContain('方向');
    expect(content.text()).toContain('主轴对齐');
    expect(content.text()).toContain('交叉轴对齐');
  });
});

describe('PropertyPanel', () => {
  function setup() {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useEditorStore(pinia);
    return { pinia, store };
  }

  function mountPanel(pinia: ReturnType<typeof createPinia>) {
    return mount(PropertyPanel, {
      global: { plugins: [pinia], stubs: { LayerPanel: LayerPanelStub } },
    });
  }

  it('未选中组件时渲染页面配置面板', () => {
    const { pinia, store } = setup();
    store.setPage(makePage());

    const wrapper = mountPanel(pinia);

    expect(wrapper.text()).toContain('页面配置');
    expect(wrapper.text()).not.toContain('属性配置');
  });

  it('选中组件时渲染属性配置、元数据标签与组件 ID 前缀', () => {
    const { pinia, store } = setup();
    store.addComponent('text', 'root', 0, { content: 'hi' }, {});

    const wrapper = mountPanel(pinia);

    expect(wrapper.text()).toContain('属性配置');
    expect(wrapper.text()).toContain('文本'); // TextMeta.label
    expect(wrapper.text()).toContain(store.page.children[0].id.slice(0, 8));
  });

  it('组件属性变更写回 store', async () => {
    const { pinia, store } = setup();
    store.addComponent('text', 'root', 0, { content: 'hi' }, {});

    const wrapper = mountPanel(pinia);
    await expandSection(wrapper, '组件属性');
    await wrapper.find('textarea').setValue('新内容');

    expect(store.page.children[0].props.content).toBe('新内容');
  });

  it('组件样式变更写回 store', async () => {
    const { pinia, store } = setup();
    store.addComponent('text', 'root', 0, {}, {});

    const wrapper = mountPanel(pinia);
    await expandSection(wrapper, '尺寸');
    await getField(wrapper, '宽').find('input').setValue('120px');

    expect(store.page.children[0].styles.width).toBe('120px');
  });

  it('选中容器组件时展示布局分组', () => {
    const { pinia, store } = setup();
    store.addComponent('container', 'root', 0, {}, {});

    expect(sectionTitles(mountPanel(pinia))).toContain('布局');
  });

  it('选中普通组件时不展示布局分组', () => {
    const { pinia, store } = setup();
    store.addComponent('text', 'root', 0, {}, {});

    expect(sectionTitles(mountPanel(pinia))).not.toContain('布局');
  });

  it('未知类型组件仅展示样式面板', () => {
    const { pinia, store } = setup();
    store.addComponent('mystery', 'root', 0, {}, {});

    const wrapper = mountPanel(pinia);

    expect(wrapper.text()).toContain('mystery');
    expect(wrapper.text()).not.toContain('组件属性');
  });

  it('页面名称与页面属性变更写回 store', async () => {
    const { pinia, store } = setup();
    store.setPage(makePage());

    const wrapper = mountPanel(pinia);
    const inputs = wrapper.findAll('input[type="text"]');
    await inputs[0].setValue('新页面');
    await nextTick();
    expect(store.page.name).toBe('新页面');

    await inputs[1].setValue('新标题');
    await nextTick();
    expect(store.page.props.title).toBe('新标题');
  });
});
