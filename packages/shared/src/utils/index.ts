/**
 * 生成唯一 ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 深拷贝对象
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

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
 * 合并样式对象
 */
export function mergeStyles(
  ...styles: Array<Partial<CSSStyleDeclaration> | undefined>
): Partial<CSSStyleDeclaration> {
  return styles.reduce((merged, style) => {
    if (!style) return merged;
    return { ...merged, ...style };
  }, {});
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
 * 根据 ID 查找组件
 */
export function findComponentById(
  components: import('../types').ComponentSchema[],
  id: string
): import('../types').ComponentSchema | null {
  for (const component of components) {
    if (component.id === id) {
      return component;
    }

    if (component.children) {
      const found = findComponentById(component.children, id);
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
