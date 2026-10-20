/**
 * 轻量级 toast 提示工具
 * 使用 Tailwind CSS 样式，无需额外依赖
 */

type ToastType = 'success' | 'error' | 'warning' | 'info';

/** Toast 默认显示时长（毫秒） */
const DEFAULT_DURATION_MS = 3000;
/** Toast 退出动画时长（毫秒），需与 CSS duration-300 一致 */
const EXIT_ANIMATION_MS = 300;

let toastContainer: HTMLDivElement | null = null;

function getContainer(): HTMLDivElement {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none';
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
}

const typeStyles: Record<ToastType, string> = {
  success: 'bg-green-500 text-white',
  error: 'bg-red-500 text-white',
  warning: 'bg-yellow-500 text-white',
  info: 'bg-blue-500 text-white',
};

export function toast(message: string, type: ToastType = 'info', duration = DEFAULT_DURATION_MS): void {
  const container = getContainer();

  const el = document.createElement('div');
  el.className = `px-4 py-2 rounded-lg shadow-lg text-sm font-medium pointer-events-auto transition-all duration-300 transform translate-x-full opacity-0 ${typeStyles[type]}`;
  el.textContent = message;

  container.appendChild(el);

  // 触发动画
  requestAnimationFrame(() => {
    el.classList.remove('translate-x-full', 'opacity-0');
    el.classList.add('translate-x-0', 'opacity-100');
  });

  // 自动移除
  setTimeout(() => {
    el.classList.remove('translate-x-0', 'opacity-100');
    el.classList.add('translate-x-full', 'opacity-0');
    setTimeout(() => {
      el.remove();
    }, EXIT_ANIMATION_MS);
  }, duration);
}
