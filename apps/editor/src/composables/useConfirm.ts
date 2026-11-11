import { ref } from 'vue';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  /** 危险操作：确认按钮使用红色 */
  danger?: boolean;
}

export interface PromptOptions {
  title?: string;
  /** 输入框上方的补充说明，可省略 */
  message?: string;
  defaultValue?: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
}

interface DialogState {
  open: boolean;
  mode: 'confirm' | 'prompt';
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  danger: boolean;
  inputValue: string;
  placeholder: string;
  resolve: ((value: unknown) => void) | null;
}

const state = ref<DialogState>({
  open: false,
  mode: 'confirm',
  title: '确认操作',
  message: '',
  confirmText: '确定',
  cancelText: '取消',
  danger: false,
  inputValue: '',
  placeholder: '',
  resolve: null,
});

/**
 * 以 Promise 形式弹出应用内确认对话框，替代浏览器原生 confirm。
 * 对话框由全局唯一的 ConfirmDialog 组件（挂载在 App.vue）渲染。
 */
export function confirmDialog(options: ConfirmOptions | string): Promise<boolean> {
  const opts: ConfirmOptions = typeof options === 'string' ? { message: options } : options;
  return new Promise<boolean>((resolve) => {
    state.value = {
      open: true,
      mode: 'confirm',
      title: opts.title ?? '确认操作',
      message: opts.message,
      confirmText: opts.confirmText ?? '确定',
      cancelText: opts.cancelText ?? '取消',
      danger: opts.danger ?? false,
      inputValue: '',
      placeholder: '',
      resolve: resolve as (value: unknown) => void,
    };
  });
}

/**
 * 以 Promise 形式弹出应用内输入对话框，替代浏览器原生 prompt。
 * 确认返回输入内容，取消返回 null。
 */
export function promptDialog(options: PromptOptions | string): Promise<string | null> {
  const opts: PromptOptions = typeof options === 'string' ? { title: options } : options;
  return new Promise<string | null>((resolve) => {
    state.value = {
      open: true,
      mode: 'prompt',
      title: opts.title ?? '请输入',
      message: opts.message ?? '',
      confirmText: opts.confirmText ?? '确定',
      cancelText: opts.cancelText ?? '取消',
      danger: false,
      inputValue: opts.defaultValue ?? '',
      placeholder: opts.placeholder ?? '',
      resolve: resolve as (value: unknown) => void,
    };
  });
}

export function useConfirmState() {
  return state;
}

/** 关闭对话框并按模式回传结果：confirm → boolean，prompt → 文本或 null */
export function resolveDialog(confirmed: boolean) {
  const { resolve, mode, inputValue } = state.value;
  state.value = { ...state.value, open: false, resolve: null };
  if (!resolve) return;
  if (mode === 'prompt') {
    resolve(confirmed ? inputValue : null);
  } else {
    resolve(confirmed);
  }
}
