import { describe, it, expect, beforeEach, afterEach, beforeAll, vi, type Mock } from 'vitest';
import { defineComponent, h } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';

vi.mock('../composables/useConfirm', () => ({
  confirmDialog: vi.fn(() => Promise.resolve(true)),
  promptDialog: vi.fn(() => Promise.resolve(null)),
}));
vi.mock('../utils/toast', () => ({ toast: vi.fn() }));

import { useDevicePreview } from '../composables/useDevicePreview';
import { useTheme } from '../composables/useTheme';
import { useKeyboardShortcuts } from '../composables/useKeyboardShortcuts';
import { useAIAssistant } from '../composables/useAIAssistant';
import { confirmDialog } from '../composables/useConfirm';
import { useEditorStore } from '../stores/editorStore';
import { logger } from '../utils/logger';
import type { ComponentSchema } from '@page-builder/shared';

// 内置确认对话框的 Promise 桩：默认返回 true，用例可按需覆盖
beforeEach(() => {
  vi.mocked(confirmDialog).mockResolvedValue(true);
});

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

describe('useTheme', () => {
  let prefersDark = false;
  let addListenerCalls: Array<{ type: string; cb: (e: MediaQueryListEvent) => void }> = [];
  let removeListenerCalls: Array<{ type: string; cb: (e: MediaQueryListEvent) => void }> = [];
  let matchMediaMock: Mock;

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
    matchMediaMock = vi.fn(() => makeMediaQueryList());
    vi.stubGlobal('matchMedia', matchMediaMock);
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

  it('环境不支持 matchMedia 时跳过监听并正常卸载', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => null),
    );

    const { result, unmount } = mountComposable(() => useTheme());

    expect(result.themeConfig.value.mode).toBe('light');
    expect(addListenerCalls).toHaveLength(0);
    expect(() => unmount()).not.toThrow();
    expect(removeListenerCalls).toHaveLength(0);
  });

  it('system 模式下通过深色偏好媒体查询判断主题', () => {
    const { result } = mountComposable(() => useTheme());
    // 清空 setup 阶段的调用，确保断言只针对 isDark 内部的 matchMedia 调用
    matchMediaMock.mockClear();
    result.setThemeMode('system');

    expect(result.isDark.value).toBe(false);
    expect(matchMediaMock).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
  });

  it('浅色主题下根元素不包含 dark 类', () => {
    const { result } = mountComposable(() => useTheme());
    expect(result.isDark.value).toBe(false);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('从深色切换到浅色时移除 dark 类', () => {
    const { result } = mountComposable(() => useTheme());
    result.setThemeMode('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    result.setThemeMode('light');
    expect(result.isDark.value).toBe(false);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('读取本地配置异常时以精确参数记录错误', () => {
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('read failure');
    });

    mountComposable(() => useTheme());

    expect(errorSpy).toHaveBeenCalledWith(
      'Theme',
      'Failed to load theme config',
      expect.any(Error),
    );
    getItemSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('保存配置异常时以精确参数记录错误', () => {
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
    const { result } = mountComposable(() => useTheme());
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('write failure');
    });

    result.setPrimaryColor('#123456');

    expect(errorSpy).toHaveBeenCalledWith(
      'Theme',
      'Failed to save theme config',
      expect.any(Error),
    );
    setItemSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('非 system 模式下系统主题变化不覆盖手动设置的主色变量', () => {
    const { result } = mountComposable(() => useTheme());
    document.documentElement.style.setProperty('--primary-color', '#123456');

    prefersDark = true;
    addListenerCalls[0].cb({ matches: true } as MediaQueryListEvent);

    expect(result.themeConfig.value.mode).toBe('light');
    expect(document.documentElement.style.getPropertyValue('--primary-color')).toBe('#123456');
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

  /** 派发可取消的按键事件并返回事件对象，用于断言 preventDefault 是否生效 */
  function pressEvent(init: KeyboardEventInit, target: EventTarget = window): KeyboardEvent {
    const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
    target.dispatchEvent(event);
    return event;
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

  it('Delete 经确认后删除选中组件', async () => {
    const store = useEditorStore();
    mountComposable(() => useKeyboardShortcuts());

    store.addComponent('text', 'root', 0);
    vi.mocked(confirmDialog).mockResolvedValue(true);

    press({ key: 'Delete' });
    await flushPromises();
    expect(store.page.children).toHaveLength(0);
  });

  it('取消确认时不删除', async () => {
    const store = useEditorStore();
    mountComposable(() => useKeyboardShortcuts());

    store.addComponent('text', 'root', 0);
    vi.mocked(confirmDialog).mockResolvedValue(false);

    press({ key: 'Backspace' });
    await flushPromises();
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

  it('撤销/重做/粘贴/方向键/保存均阻止默认行为', () => {
    mountComposable(() => useKeyboardShortcuts());

    expect(pressEvent({ key: 'z', ctrlKey: true }).defaultPrevented).toBe(true);
    expect(pressEvent({ key: 'y', ctrlKey: true }).defaultPrevented).toBe(true);
    expect(pressEvent({ key: 'z', ctrlKey: true, shiftKey: true }).defaultPrevented).toBe(true);
    expect(pressEvent({ key: 'v', ctrlKey: true }).defaultPrevented).toBe(true);
    expect(pressEvent({ key: 'ArrowUp' }).defaultPrevented).toBe(true);
    expect(pressEvent({ key: 'ArrowDown' }).defaultPrevented).toBe(true);
    expect(pressEvent({ key: 's', ctrlKey: true }).defaultPrevented).toBe(true);
  });

  it('复制/删除/复制组件均阻止默认行为', () => {
    const store = useEditorStore();
    mountComposable(() => useKeyboardShortcuts());
    store.addComponent('text', 'root', 0);
    vi.mocked(confirmDialog).mockResolvedValue(false);

    expect(pressEvent({ key: 'c', ctrlKey: true }).defaultPrevented).toBe(true);
    expect(pressEvent({ key: 'Delete' }).defaultPrevented).toBe(true);
    expect(pressEvent({ key: 'd', ctrlKey: true }).defaultPrevented).toBe(true);
  });

  it('TEXTAREA 与 contentEditable 元素内不响应快捷键', () => {
    const store = useEditorStore();
    mountComposable(() => useKeyboardShortcuts());
    store.addComponent('text', 'root', 0);

    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);

    const editable = document.createElement('div');
    Object.defineProperty(editable, 'isContentEditable', { value: true, configurable: true });
    document.body.appendChild(editable);

    press({ key: 'z', ctrlKey: true }, textarea);
    press({ key: 'z', ctrlKey: true }, editable);

    expect(store.page.children).toHaveLength(1);
  });

  it('方向键在首尾边界不越界', () => {
    const store = useEditorStore();
    mountComposable(() => useKeyboardShortcuts());

    store.addComponent('text', 'root', 0);
    const first = store.page.children[0];
    store.addComponent('button', 'root', 1);
    const second = store.page.children[1];

    store.setSelectedId(first.id);
    press({ key: 'ArrowUp' });
    expect(store.selectedId).toBe(first.id);

    store.setSelectedId(second.id);
    press({ key: 'ArrowDown' });
    expect(store.selectedId).toBe(second.id);

    press({ key: 'ArrowUp' });
    expect(store.selectedId).toBe(first.id);
  });

  it('选中项不在列表中时方向键不改变选中', () => {
    const store = useEditorStore();
    mountComposable(() => useKeyboardShortcuts());
    store.addComponent('text', 'root', 0);
    store.setSelectedId('ghost');

    press({ key: 'ArrowDown' });
    expect(store.selectedId).toBe('ghost');
  });

  it('普通按键不触发任何快捷键副作用', () => {
    const store = useEditorStore();
    mountComposable(() => useKeyboardShortcuts());
    store.addComponent('text', 'root', 0);
    press({ key: 'c', ctrlKey: true }); // 填充剪贴板以便检测误触发的粘贴
    expect(store.clipboard).toHaveLength(1);

    const childrenBefore = store.page.children.length;
    const selectedBefore = store.selectedId;
    const ev = pressEvent({ key: 'x' });

    expect(store.page.children).toHaveLength(childrenBefore);
    expect(store.selectedId).toBe(selectedBefore);
    expect(clickSpy).not.toHaveBeenCalled();
    expect(ev.defaultPrevented).toBe(false);
  });

  it('未按重做快捷键时不触发重做', () => {
    const store = useEditorStore();
    mountComposable(() => useKeyboardShortcuts());
    store.addComponent('text', 'root', 0);
    press({ key: 'z', ctrlKey: true });
    expect(store.page.children).toHaveLength(0);

    press({ key: 'x' });
    expect(store.page.children).toHaveLength(0);
  });

  it('无选中时 Ctrl+C 不调用复制', () => {
    const store = useEditorStore();
    const copySpy = vi.spyOn(store, 'copyComponent');
    mountComposable(() => useKeyboardShortcuts());
    store.addComponent('text', 'root', 0);
    store.setSelectedId(null);

    press({ key: 'c', ctrlKey: true });
    expect(copySpy).not.toHaveBeenCalled();
  });

  it('无选中时 Delete 不调用删除', () => {
    const store = useEditorStore();
    const deleteSpy = vi.spyOn(store, 'deleteComponent');
    mountComposable(() => useKeyboardShortcuts());
    store.addComponent('text', 'root', 0);
    store.setSelectedId(null);

    press({ key: 'Delete' });
    expect(deleteSpy).not.toHaveBeenCalled();
  });

  it('Delete 以选中 id 调用 deleteComponent 并校验确认文案', async () => {
    const store = useEditorStore();
    const deleteSpy = vi.spyOn(store, 'deleteComponent');
    vi.mocked(confirmDialog).mockResolvedValue(true);
    mountComposable(() => useKeyboardShortcuts());
    store.addComponent('text', 'root', 0);
    const id = store.page.children[0].id;

    press({ key: 'Delete' });
    await flushPromises();

    expect(confirmDialog).toHaveBeenCalledWith({
      title: '删除组件',
      message: '确定要删除这个组件吗？',
      confirmText: '删除',
      danger: true,
    });
    expect(deleteSpy).toHaveBeenCalledWith(id);
  });

  it('Ctrl+D 将复制件插入到原组件之后', () => {
    const store = useEditorStore();
    const insertSpy = vi.spyOn(store, 'insertComponentTree');
    mountComposable(() => useKeyboardShortcuts());

    store.addComponent('text', 'root', 0);
    const first = store.page.children[0];
    store.addComponent('button', 'root', 1);
    store.addComponent('image', 'root', 2);
    store.setSelectedId(first.id);

    press({ key: 'd', ctrlKey: true });

    expect(insertSpy).toHaveBeenCalledTimes(1);
    const [inserted, parentId, index] = insertSpy.mock.calls[0];
    expect(parentId).toBe('root');
    expect(index).toBe(1);
    expect(inserted.id).not.toBe(first.id);
    expect(inserted.type).toBe('text');
    expect(store.page.children.map((c) => c.type)).toEqual(['text', 'text', 'button', 'image']);
  });

  it('缺少 Ctrl/Cmd 修饰键时不触发撤销', () => {
    const store = useEditorStore();
    mountComposable(() => useKeyboardShortcuts());
    store.addComponent('text', 'root', 0);

    press({ key: 'z' });
    expect(store.page.children).toHaveLength(1);
  });

  it('缺少 Ctrl/Cmd 修饰键时不触发重做', () => {
    const store = useEditorStore();
    mountComposable(() => useKeyboardShortcuts());
    store.addComponent('text', 'root', 0);
    press({ key: 'z', ctrlKey: true });
    expect(store.page.children).toHaveLength(0);

    press({ key: 'y' });
    expect(store.page.children).toHaveLength(0);
  });

  it('Ctrl/Cmd + Shift + 非 Z/Y 键不触发重做', () => {
    const store = useEditorStore();
    mountComposable(() => useKeyboardShortcuts());
    store.addComponent('text', 'root', 0);
    press({ key: 'z', ctrlKey: true });
    expect(store.page.children).toHaveLength(0);

    press({ key: 'a', ctrlKey: true, shiftKey: true });
    expect(store.page.children).toHaveLength(0);
  });

  it('缺少 Ctrl/Cmd 修饰键时不触发复制', () => {
    const store = useEditorStore();
    mountComposable(() => useKeyboardShortcuts());
    store.addComponent('text', 'root', 0);

    press({ key: 'c' });
    expect(store.clipboard).toHaveLength(0);
  });

  it('缺少 Ctrl/Cmd 修饰键时不触发粘贴', () => {
    const store = useEditorStore();
    mountComposable(() => useKeyboardShortcuts());
    store.addComponent('text', 'root', 0);
    press({ key: 'c', ctrlKey: true });
    expect(store.clipboard).toHaveLength(1);

    press({ key: 'v' });
    expect(store.page.children).toHaveLength(1);
  });

  it('缺少 Ctrl/Cmd 修饰键时不触发保存与复制组件', () => {
    const store = useEditorStore();
    mountComposable(() => useKeyboardShortcuts());
    store.addComponent('text', 'root', 0);
    clickSpy.mockClear();

    press({ key: 's' });
    press({ key: 'd' });

    expect(clickSpy).not.toHaveBeenCalled();
    expect(store.page.children).toHaveLength(1);
  });

  it('Ctrl/Cmd + 非 C 键不触发复制', () => {
    const store = useEditorStore();
    const copySpy = vi.spyOn(store, 'copyComponent');
    mountComposable(() => useKeyboardShortcuts());
    store.addComponent('text', 'root', 0);

    press({ key: 'v', ctrlKey: true });
    expect(copySpy).not.toHaveBeenCalled();
  });

  it('Backspace 经确认后删除选中组件', async () => {
    const store = useEditorStore();
    const deleteSpy = vi.spyOn(store, 'deleteComponent');
    vi.mocked(confirmDialog).mockResolvedValue(true);
    mountComposable(() => useKeyboardShortcuts());
    store.addComponent('text', 'root', 0);
    const id = store.page.children[0].id;

    press({ key: 'Backspace' });
    await flushPromises();

    expect(deleteSpy).toHaveBeenCalledWith(id);
  });

  it('Ctrl+D 按选中组件在列表中的真实索引插入', () => {
    const store = useEditorStore();
    const insertSpy = vi.spyOn(store, 'insertComponentTree');
    mountComposable(() => useKeyboardShortcuts());

    store.addComponent('text', 'root', 0);
    store.addComponent('button', 'root', 1);
    store.addComponent('image', 'root', 2);

    press({ key: 'd', ctrlKey: true });

    expect(insertSpy).toHaveBeenCalledTimes(1);
    expect(insertSpy.mock.calls[0][2]).toBe(3);
  });

  it('选中 id 在树中不存在时不执行复制', () => {
    const store = useEditorStore();
    const insertSpy = vi.spyOn(store, 'insertComponentTree');
    mountComposable(() => useKeyboardShortcuts());
    store.addComponent('text', 'root', 0);
    store.setSelectedId('ghost');

    press({ key: 'd', ctrlKey: true });

    expect(insertSpy).not.toHaveBeenCalled();
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

  it('行动按钮 / 图片 / 布局建议的动作均可执行', () => {
    const store = useEditorStore();
    store.addComponent('text', 'root', 0);

    const api = useAIAssistant();
    api.analyzePage();

    // 逐条执行建议动作，覆盖按钮、图片与布局模板三个回调
    api.recommendations.value.forEach((rec) => rec.action());

    const types = store.page.children.map((c) => c.type);
    expect(types).toContain('button');
    expect(types).toContain('image');
    expect(api.showAIPanel.value).toBe(true);
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

  it('generateText 随机索引可返回不同文案', () => {
    const api = useAIAssistant();
    const heroResults = new Set<string>();
    const ctaResults = new Set<string>();
    for (let i = 0; i < 100; i++) {
      heroResults.add(api.generateText('hero'));
      ctaResults.add(api.generateText('cta'));
    }
    expect(heroResults.size).toBeGreaterThan(1);
    expect(ctaResults.size).toBeGreaterThan(1);
  });

  it('空页面标题建议的动作使用精确参数添加文本组件', () => {
    const store = useEditorStore();
    const addSpy = vi.spyOn(store, 'addComponent');
    const api = useAIAssistant();
    api.analyzePage();

    const rec = api.recommendations.value[0];
    expect(rec.title).toBe('添加页面标题');
    expect(rec.description).toBe('一个好的标题能吸引用户注意力');

    rec.action();

    expect(addSpy).toHaveBeenCalledTimes(1);
    const [type, parentId, index, props, styles] = addSpy.mock.calls[0];
    expect(type).toBe('text');
    expect(parentId).toBe('root');
    expect(index).toBe(0);
    expect(['欢迎来到我们的产品', '开启全新体验', '创新改变生活', '品质成就未来']).toContain(
      (props as Record<string, unknown>).content,
    );
    expect(props).toMatchObject({
      color: '#000000',
      fontSize: '24px',
      fontWeight: 'bold',
      textAlign: 'center',
    });
    expect(styles).toEqual({ padding: '24px', margin: '0 0 16px 0' });
  });

  it('按钮建议的动作使用精确参数', () => {
    const store = useEditorStore();
    store.addComponent('text', 'root', 0);
    const addSpy = vi.spyOn(store, 'addComponent');
    const api = useAIAssistant();
    api.analyzePage();

    const rec = api.recommendations.value.find((r) => r.title === '添加行动按钮')!;
    expect(rec.type).toBe('component');
    expect(rec.description).toBe('引导用户采取行动');

    rec.action();

    const [type, parentId, index, props, styles] = addSpy.mock.calls[0];
    expect(type).toBe('button');
    expect(parentId).toBe('root');
    expect(index).toBe(1);
    expect(['立即开始', '了解更多', '免费试用', '联系我们']).toContain(
      (props as Record<string, unknown>).text,
    );
    expect(props).toMatchObject({ type: 'primary', size: 'large', block: true });
    expect(styles).toEqual({ margin: '16px' });
  });

  it('图片建议的动作使用精确参数', () => {
    const store = useEditorStore();
    store.addComponent('text', 'root', 0);
    const addSpy = vi.spyOn(store, 'addComponent');
    const api = useAIAssistant();
    api.analyzePage();

    const rec = api.recommendations.value.find((r) => r.title === '添加图片')!;
    expect(rec.type).toBe('component');
    expect(rec.description).toBe('图片能让页面更生动');

    rec.action();

    const [type, parentId, index, props, styles] = addSpy.mock.calls[0];
    expect(type).toBe('image');
    expect(parentId).toBe('root');
    expect(index).toBe(1);
    expect(props).toEqual({
      src: 'https://via.placeholder.com/375x200',
      alt: '配图',
      width: '100%',
      height: '200px',
      objectFit: 'cover',
    });
    expect(styles).toEqual({});
  });

  it('布局建议使用精确类型与文案', () => {
    const api = useAIAssistant();
    api.analyzePage();

    const rec = api.recommendations.value.find((r) => r.type === 'layout')!;
    expect(rec.title).toBe('使用布局模板');
    expect(rec.description).toBe('快速搭建专业页面');
  });

  it('applyLayout 为每种组件类型传入精确默认 props', () => {
    const store = useEditorStore();
    const addSpy = vi.spyOn(store, 'addComponent');
    const api = useAIAssistant();

    api.applyLayout(0);

    expect(addSpy).toHaveBeenCalledTimes(4);
    const calls = addSpy.mock.calls;
    expect(calls[0][0]).toBe('text');
    expect(calls[0][2]).toBe(0);
    expect(calls[0][3]).toEqual({ content: '请输入内容', color: '#333333', fontSize: '14px' });
    expect(calls[1][0]).toBe('image');
    expect(calls[1][2]).toBe(1);
    expect(calls[1][3]).toEqual({
      src: 'https://via.placeholder.com/375x200',
      alt: '图片',
      width: '100%',
    });
    expect(calls[2][3]).toEqual({ content: '请输入内容', color: '#333333', fontSize: '14px' });
    expect(calls[3][0]).toBe('button');
    expect(calls[3][3]).toEqual({ text: '按钮', type: 'primary', size: 'medium' });

    for (const call of calls) {
      expect(call[1]).toBe('root');
      expect(call[4]).toEqual({});
    }
  });

  it('applyLayout 覆盖卡片与分割线默认 props', () => {
    const store = useEditorStore();
    const addSpy = vi.spyOn(store, 'addComponent');
    const api = useAIAssistant();

    api.applyLayout(1);
    expect(addSpy.mock.calls[1][3]).toEqual({
      title: '卡片标题',
      backgroundColor: '#ffffff',
      padding: '16px',
    });

    addSpy.mockClear();
    api.applyLayout(2);
    const dividerCall = addSpy.mock.calls.find((c) => c[0] === 'divider')!;
    expect(dividerCall[3]).toEqual({ color: '#e8e8e8', thickness: '1px', style: 'solid' });
  });
});
