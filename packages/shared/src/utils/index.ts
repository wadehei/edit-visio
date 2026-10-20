/**
 * HTML 实体转义（防止 XSS 攻击）
 * 用于将用户输入的安全拼接到 HTML 字符串中
 */
const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHTML(str: string): string {
  return str.replace(/[&<>"']/g, (char) => HTML_ESCAPE_MAP[char]);
}

/**
 * 生成唯一 ID（使用 crypto.randomUUID 保证唯一性）
 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // fallback for environments without crypto.randomUUID
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * 深拷贝对象
 * - 优先使用原生 structuredClone（支持 Date, RegExp, Map, Set, ArrayBuffer 等）
 * - structuredClone 无法处理 Vue Proxy 时，fallback 到手动递归
 *
 * 注意：不使用 JSON.parse/stringify 中间层，因为它会静默丢失
 * undefined、函数、Symbol，且无法处理循环引用
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // 优先使用原生 structuredClone（性能最优，类型保留完整）
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(obj);
    } catch {
      // Proxy 或不可克隆的对象，继续 fallback
    }
  }

  // 最终 fallback: 手动递归克隆
  if (Array.isArray(obj)) {
    return obj.map((item) => deepClone(item)) as unknown as T;
  }

  const cloned = {} as T;
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }

  return cloned;
}

/**
 * 查找组件在树中的路径
 */
export function findComponentPath(
  components: import('../types').ComponentSchema[],
  targetId: string,
  path: string[] = []
): string[] | null {
  for (const component of components) {
    if (component.id === targetId) {
      return [...path, component.id];
    }

    if (component.children) {
      const found = findComponentPath(component.children, targetId, [...path, component.id]);
      if (found) return found;
    }
  }

  return null;
}

/**
 * 更新组件
 */
export function updateComponent(
  components: import('../types').ComponentSchema[],
  id: string,
  updater: (component: import('../types').ComponentSchema) => import('../types').ComponentSchema
): import('../types').ComponentSchema[] {
  return components.map((component) => {
    if (component.id === id) {
      return updater(component);
    }

    if (component.children) {
      return {
        ...component,
        children: updateComponent(component.children, id, updater),
      };
    }

    return component;
  });
}

/**
 * 删除组件
 */
export function removeComponent(
  components: import('../types').ComponentSchema[],
  id: string
): import('../types').ComponentSchema[] {
  return components
    .filter((component) => component.id !== id)
    .map((component) => {
      if (component.children) {
        return {
          ...component,
          children: removeComponent(component.children, id),
        };
      }
      return component;
    });
}

/**
 * 插入组件到指定位置
 */
export function insertComponent(
  components: import('../types').ComponentSchema[],
  parentId: string,
  index: number,
  newComponent: import('../types').ComponentSchema
): import('../types').ComponentSchema[] {
  return components.map((component) => {
    if (component.id === parentId) {
      const children = component.children || [];
      const newChildren = [...children];
      newChildren.splice(index, 0, newComponent);
      return {
        ...component,
        children: newChildren,
      };
    }

    if (component.children) {
      return {
        ...component,
        children: insertComponent(component.children, parentId, index, newComponent),
      };
    }

    return component;
  });
}

/**
 * 组件类型标签映射（统一所有面板的标签显示）
 */
const COMPONENT_LABELS: Record<string, string> = {
  text: '📝 文本',
  button: '🔘 按钮',
  image: '🖼️ 图片',
  container: '📦 容器',
  divider: '➖ 分割线',
  spacer: '↕️ 间距',
  card: '🎴 卡片',
  badge: '🏷️ 徽章',
  richText: '📄 富文本',
  input: '⌨️ 输入框',
  video: '🎬 视频',
  audio: '🎵 音频',
  map: '🗺️ 地图',
  carousel: '🎠 轮播图',
  countdown: '⏳ 倒计时',
  progress: '📊 进度条',
};

/**
 * 获取组件的显示标签
 */
export function getComponentLabel(component: import('../types').ComponentSchema): string {
  return COMPONENT_LABELS[component.type] || component.type;
}

/**
 * 深拷贝组件并生成新 ID（用于复制组件）
 */
export function duplicateComponentTree(
  component: import('../types').ComponentSchema
): import('../types').ComponentSchema {
  return {
    ...component,
    id: generateId(),
    props: deepClone(component.props),
    styles: deepClone(component.styles),
    children: component.children?.map(duplicateComponentTree) || [],
  };
}

/**
 * 在组件树中查找组件（返回组件及其父级索引信息）
 */
export function findComponentInTree(
  components: import('../types').ComponentSchema[],
  id: string
): import('../types').ComponentSchema | null {
  for (const component of components) {
    if (component.id === id) {
      return component;
    }
    if (component.children) {
      const found = findComponentInTree(component.children, id);
      if (found) return found;
    }
  }
  return null;
}

/**
 * 将页面对象保存为 JSON 文件下载
 */
export function saveAsJSON(page: import('../types').PageSchema, filename?: string): void {
  const json = JSON.stringify(page, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `${page.name}.json`;
  a.click();
  // 延迟释放 URL，确保大文件下载启动后再回收（立即 revoke 可能导致下载中断）
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
