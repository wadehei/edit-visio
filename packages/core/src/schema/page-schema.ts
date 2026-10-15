import type { PageSchema, ComponentSchema } from '@page-builder/shared';

/**
 * 创建默认页面
 */
export function createDefaultPage(name: string = '未命名页面'): PageSchema {
  return {
    id: `page-${Date.now()}`,
    name,
    version: '1.0.0',
    props: {
      title: name,
      backgroundColor: '#ffffff',
    },
    children: [],
  };
}

/**
 * 验证页面 Schema
 */
export function validatePageSchema(page: PageSchema): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!page.id) {
    errors.push('页面 ID 不能为空');
  }

  if (!page.name) {
    errors.push('页面名称不能为空');
  }

  if (!page.props.title) {
    errors.push('页面标题不能为空');
  }

  if (!page.props.backgroundColor) {
    errors.push('背景颜色不能为空');
  }

  // 验证组件
  const validateComponent = (component: ComponentSchema, path: string) => {
    if (!component.id) {
      errors.push(`${path}: 组件 ID 不能为空`);
    }

    if (!component.type) {
      errors.push(`${path}: 组件类型不能为空`);
    }

    if (component.children) {
      component.children.forEach((child, index) => {
        validateComponent(child, `${path}.children[${index}]`);
      });
    }
  };

  page.children.forEach((child, index) => {
    validateComponent(child, `children[${index}]`);
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 序列化页面为 JSON
 */
export function serializePage(page: PageSchema): string {
  return JSON.stringify(page, null, 2);
}

/**
 * 反序列化 JSON 为页面
 */
export function deserializePage(json: string): PageSchema {
  try {
    const page = JSON.parse(json) as PageSchema;
    const validation = validatePageSchema(page);

    if (!validation.valid) {
      throw new Error(`Schema 验证失败: ${validation.errors.join(', ')}`);
    }

    return page;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('JSON 解析失败');
    }
    throw error;
  }
}
