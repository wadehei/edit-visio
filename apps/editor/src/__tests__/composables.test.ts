import { describe, it, expect, beforeEach, afterEach, beforeAll, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';

import { useAnimation } from '../composables/useAnimation';
import { useAlignmentGuides } from '../composables/useAlignmentGuides';
import { useDevicePreview } from '../composables/useDevicePreview';
import { useTheme } from '../composables/useTheme';
import { useKeyboardShortcuts } from '../composables/useKeyboardShortcuts';
import { useAIAssistant } from '../composables/useAIAssistant';
import { useEditorStore } from '../stores/editorStore';
import type { ComponentSchema } from '@page-builder/shared';

/** 在组件实例上下文中调用组合式函数，以便 onMounted/onUnmounted 生效 */
function mountComposable<T>(composable: () => T): { result: T; unmount: () => void } {
  let result!: T;
  const wrapper = mount(
    defineComponent({
      setup() {
        result = composable();
        return () => h('div');
      },
    }),
  );
  return { result, unmount: () => wrapper.unmount() };
}

function makeComponent(id: string, type = 'text'): ComponentSchema {
  return { id, type, props: {}, styles: {}, children: [] };
}

/** 构造带可控 getBoundingClientRect 的元素 */
function makeElement(id: string, rect: Partial<DOMRect>): HTMLElement {
  const el = document.createElement('div');
  el.id = id;
  el.getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    width: 0,
    height: 0,
    x: 0,
    y: 0,
    toJSON: () => ({}),
    ...rect,
  });
  document.body.appendChild(el);
  return el;
}

describe('useAnimation', () => {
  it('默认 none 时 style 为空对象', () => {
    const api = useAnimation();
    expect(api.currentAnimation.value.type).toBe('none');
    expect(api.animationStyle.value).toEqual({});
  });

  it('设定动画后应生成带时长/延迟/次数的 animation 值', () => {
    const api = useAnimation();
    api.setAnimation('fadeIn');

    expect(api.animationStyle.value).toEqual({ animation: 'fadeIn 0.5s ease-in 0s 1' });
  });

  it('时长与延迟按毫秒换算为秒，iteration 映射正确', () => {
    const api = useAnimation();
    api.setAnimation('fadeIn');
    api.setDuration(1000);
    api.setDelay(200);
    api.setIteration('infinite');

    expect(api.animationStyle.value.animation).toBe('fadeIn 1s ease-in 0.2s infinite');
  });

  it('setEasing 更新 easing 配置', () => {
    const api = useAnimation();
    api.setEasing('linear');
    expect(api.currentAnimation.value.easing).toBe('linear');
  });

  it('导出预设与分类常量', () => {
    const api = useAnimation();
    expect(api.animationPresets.none).toBe('');
    expect(api.animationCategories).toHaveLength(3);
  });
});

describe('useDevicePreview', () => {
  it('默认使用手机尺寸', () => {
    const api = useDevicePreview();
    expect(api.currentDevice.value).toBe('mobile');
    expect(api.currentDeviceConfig.value.width).toBe(375);
  });

  it('setDevice 切换到对应预设', () => {
    const api = useDevicePreview();
    api.setDevice('tablet');
    expect(api.currentDevice.value).toBe('tablet');
    expect(api.currentDeviceConfig.value.width).toBe(768);
  });

  it('setCustomSize 使用自定义宽高并切换设备类型', () => {
    const api = useDevicePreview();
    api.setCustomSize(500, 600);
    expect(api.currentDevice.value).toBe('custom');
    expect(api.currentDeviceConfig.value.width).toBe(500);
    expect(api.currentDeviceConfig.value.height).toBe(600);
  });

  it('toggleDeviceSwitcher 切换显隐', () => {
    const api = useDevicePreview();
    expect(api.showDeviceSwitcher.value).toBe(true);
    api.toggleDeviceSwitcher();
    expect(api.showDeviceSwitcher.value).toBe(false);
  });
});

describe('useAlignmentGuides', () => {
  const canvasRect = { left: 0, top: 0 } as DOMRect;

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('无对齐关系时不应产生辅助线', () => {
    makeElement('drag', { left: 0, top: 0, right: 50, bottom: 50 });
    makeElement('other', { left: 200, top: 200, right: 250, bottom: 250 });

    const api = useAlignmentGuides();
    api.detectAlignment(
      makeComponent('drag'),
      [makeComponent('drag'), makeComponent('other')],
      canvasRect,
    );

    expect(api.guides.value).toEqual([]);
  });

  it('边缘接近阈值时应生成包含两组件 id 的垂直辅助线', () => {
    makeElement('drag', { left: 0, top: 0, right: 50, bottom: 50 });
    makeElement('other', { left: 4, top: 0, right: 54, bottom: 50 });

    const api = useAlignmentGuides();
    api.detectAlignment(
      makeComponent('drag'),
      [makeComponent('drag'), makeComponent('other')],
      canvasRect,
    );

    const vertical = api.guides.value.find((g) => g.type === 'vertical' && g.position === 4);
    expect(vertical).toBeDefined();
    expect(vertical?.components).toEqual(['drag', 'other']);
  });

  it('拖拽元素不存在时直接返回', () => {
    makeElement('other', { left: 0, top: 0, right: 10, bottom: 10 });

    const api = useAlignmentGuides();
    api.detectAlignment(makeComponent('missing'), [makeComponent('other')], canvasRect);

    expect(api.guides.value).toEqual([]);
  });

  it('showGuides 关闭时不检测对齐并清空辅助线', () => {
    makeElement('drag', { left: 0, top: 0, right: 50, bottom: 50 });
    makeElement('other', { left: 0, top: 0, right: 50, bottom: 50 });

    const api = useAlignmentGuides();
    api.showGuides.value = false;
    api.detectAlignment(
      makeComponent('drag'),
      [makeComponent('drag'), makeComponent('other')],
      canvasRect,
    );

    expect(api.guides.value).toEqual([]);
  });

  it('toggleGuides 关闭时清空辅助线', () => {
    makeElement('drag', { left: 0, top: 0, right: 50, bottom: 50 });
    makeElement('other', { left: 0, top: 0, right: 50, bottom: 50 });

    const api = useAlignmentGuides();
    api.detectAlignment(
      makeComponent('drag'),
      [makeComponent('drag'), makeComponent('other')],
      canvasRect,
    );
    expect(api.guides.value.length).toBeGreaterThan(0);

    api.toggleGuides();
    expect(api.showGuides.value).toBe(false);
    expect(api.guides.value).toEqual([]);
  });

  it('clearGuides 清空辅助线', () => {
    const api = useAlignmentGuides();
    api.guides.value = [{ type: 'vertical', position: 1, components: ['a'] }];
    api.clearGuides();
    expect(api.guides.value).toEqual([]);
  });
});

describe('useTheme', () => {
  let prefersDark = false;
  let addListenerCalls: Array<{ type: string; cb: (e: MediaQueryListEvent) => void }> = [];
  let removeListenerCalls: Array<{ type: string; cb: (e: MediaQueryListEvent) => void }> = [];

  function makeMediaQueryList() {
    return {
      get matches() {
        return prefersDark;
      },
      media: '(prefers-color-scheme: dark)',
      onchange: null,
      addEventListener: (type: string, cb: (e: MediaQueryListEvent) => void) => {
        if (type === 'change') addListenerCalls.push({ type, cb });
      },
      removeEventListener: (type: string, cb: (e: MediaQueryListEvent) => void) => {
        if (type === 'change') removeListenerCalls.push({ type, cb });
      },
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    } as unknown as MediaQueryList;
  }

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
    prefersDark = false;
    addListenerCalls = [];
    removeListenerCalls = [];
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => makeMediaQueryList()),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('默认浅色主题并写入 primary 变量', () => {
    const { result } = mountComposable(() => useTheme());
    expect(result.themeConfig.value.mode).toBe('light');
    expect(result.isDark.value).toBe(false);
    expect(document.documentElement.style.getPropertyValue('--primary-color')).toBe('#3b82f6');
  });

  it('setThemeMode("dark") 添加 dark 类并持久化', () => {
    const { result } = mountComposable(() => useTheme());
    result.setThemeMode('dark');

    expect(result.isDark.value).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(JSON.parse(localStorage.getItem('theme-config')!)).toEqual({
      mode: 'dark',
      primaryColor: '#3b82f6',
    });
  });

  it('setPrimaryColor 更新根变量', () => {
    const { result } = mountComposable(() => useTheme());
    result.setPrimaryColor('#ff0000');
    expect(document.documentElement.style.getPropertyValue('--primary-color')).toBe('#ff0000');
  });

  it('system 模式跟随系统偏好', () => {
    prefersDark = true;
    const { result } = mountComposable(() => useTheme());
    result.setThemeMode('system');
    expect(result.isDark.value).toBe(true);
  });

  it('从 localStorage 读取已保存配置', () => {
    localStorage.setItem('theme-config', JSON.stringify({ mode: 'dark', primaryColor: '#000000' }));
    const { result } = mountComposable(() => useTheme());
    expect(result.themeConfig.value.mode).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('卸载时移除系统主题监听', () => {
    const { unmount } = mountComposable(() => useTheme());
    expect(addListenerCalls).toHaveLength(1);
    unmount();
    expect(removeListenerCalls).toHaveLength(1);
    expect(removeListenerCalls[0].cb).toBe(addListenerCalls[0].cb);
  });

  it('读取本地配置异常时回退默认主题并记录错误', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('read failure');
    });

    const { result } = mountComposable(() => useTheme());

    expect(result.themeConfig.value.mode).toBe('light');
    expect(errorSpy).toHaveBeenCalled();
    getItemSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('保存配置异常时记录错误但不抛出', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = mountComposable(() => useTheme());
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('write failure');
    });

    expect(() => result.setPrimaryColor('#123456')).not.toThrow();

    expect(errorSpy).toHaveBeenCalled();
    setItemSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('system 模式下系统主题变化时重新应用主题', () => {
    const { result } = mountComposable(() => useTheme());
    // 先切换系统偏好再进入 system 模式，避免命中 computed 缓存
    prefersDark = true;
    result.setThemeMode('system');
    document.documentElement.classList.remove('dark');

    addListenerCalls[0].cb({ matches: true } as MediaQueryListEvent);

    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('非 system 模式下系统主题变化不改变主题', () => {
    const { result } = mountComposable(() => useTheme());
    expect(result.themeConfig.value.mode).toBe('light');
    document.documentElement.classList.remove('dark');

    prefersDark = true;
    addListenerCalls[0].cb({ matches: true } as MediaQueryListEvent);

    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});

describe('useKeyboardShortcuts', () => {
  beforeAll(() => {
    Object.defineProperty(URL, 'createObjectURL', {
      value: vi.fn(() => 'blob:mock'),
      configurable: true,
      writable: true,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      value: vi.fn(),
      configurable: true,
      writable: true,
    });
  });

  let clickSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    setActivePinia(createPinia());
    document.body.innerHTML = '';
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function press(init: KeyboardEventInit, target: EventTarget = window) {
    target.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, ...init }));
  }

  it('Ctrl+Z 撤销、Ctrl+Y 重做', () => {
    const store = useEditorStore();
    mountComposable(() => useKeyboardShortcuts());

    store.addComponent('text', 'root', 0);
    expect(store.page.children).toHaveLength(1);

    press({ key: 'z', ctrlKey: true });
    expect(store.page.children).toHaveLength(0);

    press({ key: 'y', ctrlKey: true });
    expect(store.page.children).toHaveLength(1);
  });

  it('Ctrl+Shift+Z 亦可重做', () => {
    const store = useEditorStore();
    mountComposable(() => useKeyboardShortcuts());

    store.addComponent('text', 'root', 0);
    press({ key: 'z', ctrlKey: true });
    press({ key: 'z', ctrlKey: true, shiftKey: true });

    expect(store.page.children).toHaveLength(1);
  });

  it('Ctrl+C 复制、Ctrl+V 粘贴', () => {
    const store = useEditorStore();
    mountComposable(() => useKeyboardShortcuts());

    store.addComponent('text', 'root', 0);
    press({ key: 'c', ctrlKey: true });
    expect(store.clipboard).toHaveLength(1);

    press({ key: 'v', ctrlKey: true });
    expect(store.page.children).toHaveLength(2);
  });

  it('Delete 经确认后删除选中组件', () => {
    const store = useEditorStore();
    mountComposable(() => useKeyboardShortcuts());

    store.addComponent('text', 'root', 0);
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    press({ key: 'Delete' });
    expect(store.page.children).toHaveLength(0);
  });

  it('取消确认时不删除', () => {
    const store = useEditorStore();
    mountComposable(() => useKeyboardShortcuts());

    store.addComponent('text', 'root', 0);
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    press({ key: 'Backspace' });
    expect(store.page.children).toHaveLength(1);
  });

  it('方向键切换选中项', () => {
    const store = useEditorStore();
    mountComposable(() => useKeyboardShortcuts());

    store.addComponent('text', 'root', 0);
    store.addComponent('button', 'root', 1);
    const [first, second] = store.page.children;

    press({ key: 'ArrowUp' });
    expect(store.selectedId).toBe(first.id);

    press({ key: 'ArrowDown' });
    expect(store.selectedId).toBe(second.id);
  });

  it('未选中时方向键选中首个组件', () => {
    const store = useEditorStore();
    mountComposable(() => useKeyboardShortcuts());

    store.addComponent('text', 'root', 0);
    const first = store.page.children[0];
    store.setSelectedId(null);

    press({ key: 'ArrowDown' });
    expect(store.selectedId).toBe(first.id);
  });

  it('Escape 取消选中', () => {
    const store = useEditorStore();
    mountComposable(() => useKeyboardShortcuts());

    store.addComponent('text', 'root', 0);
    press({ key: 'Escape' });
    expect(store.selectedId).toBeNull();
  });

  it('Ctrl+S 触发导出', () => {
    mountComposable(() => useKeyboardShortcuts());
    press({ key: 's', ctrlKey: true });
    expect(clickSpy).toHaveBeenCalled();
  });

  it('Ctrl+D 复制选中组件', () => {
    const store = useEditorStore();
    mountComposable(() => useKeyboardShortcuts());

    store.addComponent('text', 'root', 0);
    press({ key: 'd', ctrlKey: true });
    expect(store.page.children).toHaveLength(2);
  });

  it('输入框内不响应快捷键', () => {
    const store = useEditorStore();
    mountComposable(() => useKeyboardShortcuts());

    store.addComponent('text', 'root', 0);
    const input = document.createElement('input');
    document.body.appendChild(input);

    press({ key: 'z', ctrlKey: true }, input);
    expect(store.page.children).toHaveLength(1);
  });

  it('卸载后不再响应按键', () => {
    const store = useEditorStore();
    const { unmount } = mountComposable(() => useKeyboardShortcuts());

    store.addComponent('text', 'root', 0);
    unmount();

    press({ key: 'z', ctrlKey: true });
    expect(store.page.children).toHaveLength(1);
  });
});

describe('useAIAssistant', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('generateText 返回对应分类下的文案', () => {
    const api = useAIAssistant();
    expect(['欢迎来到我们的产品', '开启全新体验', '创新改变生活', '品质成就未来']).toContain(
      api.generateText('hero'),
    );
  });

  it('空页面给出标题与布局建议', () => {
    const api = useAIAssistant();
    api.analyzePage();

    expect(api.recommendations.value).toHaveLength(2);
    expect(api.recommendations.value.map((r) => r.title)).toEqual(['添加页面标题', '使用布局模板']);
  });

  it('有文本但缺按钮/图片时补齐建议', () => {
    const store = useEditorStore();
    store.addComponent('text', 'root', 0);

    const api = useAIAssistant();
    api.analyzePage();

    const titles = api.recommendations.value.map((r) => r.title);
    expect(titles).toContain('添加行动按钮');
    expect(titles).toContain('添加图片');
    expect(titles).toContain('使用布局模板');
  });

  it('组件齐全时不再产生建议', () => {
    const store = useEditorStore();
    store.setPage({
      id: 'p',
      name: 'p',
      version: '1.0.0',
      props: { title: 'p', backgroundColor: '#fff' },
      children: [
        makeComponent('a', 'text'),
        makeComponent('b', 'button'),
        makeComponent('c', 'image'),
      ],
    });

    const api = useAIAssistant();
    api.analyzePage();
    expect(api.recommendations.value).toEqual([]);
  });

  it('建议动作可执行（添加标题）', () => {
    const store = useEditorStore();
    const api = useAIAssistant();
    api.analyzePage();

    api.recommendations.value[0].action();
    expect(store.page.children).toHaveLength(1);
    expect(store.page.children[0].type).toBe('text');
  });

  it('applyLayout 按模板添加组件并关闭面板', () => {
    const store = useEditorStore();
    const api = useAIAssistant();
    api.showAIPanel.value = true;

    api.applyLayout(0);
    expect(store.page.children.map((c) => c.type)).toEqual(['text', 'image', 'text', 'button']);
    expect(api.showAIPanel.value).toBe(false);
  });

  it('applyLayout 越界索引不产生副作用', () => {
    const store = useEditorStore();
    const api = useAIAssistant();
    api.applyLayout(99);
    expect(store.page.children).toHaveLength(0);
  });

  it('optimizePage 为缺少 margin 的组件补间距', () => {
    const store = useEditorStore();
    store.setPage({
      id: 'p',
      name: 'p',
      version: '1.0.0',
      props: { title: 'p', backgroundColor: '#fff' },
      children: [
        { id: 'a', type: 'text', props: {}, styles: {}, children: [] },
        { id: 'b', type: 'text', props: {}, styles: { margin: '4px' }, children: [] },
      ],
    });

    const api = useAIAssistant();
    api.optimizePage();

    expect(store.page.children[0].styles.margin).toBe('8px 0');
    expect(store.page.children[1].styles.margin).toBe('4px');
  });

  it('导出布局推荐常量', () => {
    const api = useAIAssistant();
    expect(api.layoutRecommendations.length).toBeGreaterThan(0);
    expect(api.showAIPanel.value).toBe(false);
  });
});
