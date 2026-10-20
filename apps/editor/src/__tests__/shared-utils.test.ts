import { describe, it, expect } from 'vitest';
import {
  generateId,
  deepClone,
  findComponentPath,
  updateComponent,
  removeComponent,
  insertComponent,
  getComponentLabel,
  duplicateComponentTree,
  findComponentInTree,
  escapeHTML,
} from '@page-builder/shared';
import type { ComponentSchema, PageSchema } from '@page-builder/shared';

// ========== generateId ==========

describe('generateId', () => {
  it('should generate unique IDs', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateId());
    }
    expect(ids.size).toBe(100);
  });

  it('should return a non-empty string', () => {
    const id = generateId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });
});

// ========== deepClone ==========

describe('deepClone', () => {
  it('should clone primitive values', () => {
    expect(deepClone(42)).toBe(42);
    expect(deepClone('hello')).toBe('hello');
    expect(deepClone(true)).toBe(true);
    expect(deepClone(null)).toBe(null);
    expect(deepClone(undefined)).toBe(undefined);
  });

  it('should clone arrays', () => {
    const arr = [1, [2, 3], { a: 4 }];
    const cloned = deepClone(arr);
    expect(cloned).toEqual(arr);
    expect(cloned).not.toBe(arr);
    expect(cloned[1]).not.toBe(arr[1]);
    expect(cloned[2]).not.toBe(arr[2]);
  });

  it('should clone objects deeply', () => {
    const obj = { a: 1, b: { c: 2, d: [3, 4] } };
    const cloned = deepClone(obj);
    expect(cloned).toEqual(obj);
    expect(cloned).not.toBe(obj);
    expect(cloned.b).not.toBe(obj.b);
    expect(cloned.b.d).not.toBe(obj.b.d);
  });

  it('should clone ComponentSchema objects', () => {
    const component: ComponentSchema = {
      id: 'test-1',
      type: 'text',
      props: { content: 'hello' },
      styles: { padding: '8px' },
      children: [
        {
          id: 'child-1',
          type: 'button',
          props: { text: 'click' },
          styles: {},
          children: [],
        },
      ],
    };
    const cloned = deepClone(component);
    expect(cloned).toEqual(component);
    expect(cloned).not.toBe(component);
    expect(cloned.children![0]).not.toBe(component.children![0]);
  });
});

// ========== Component Tree Utilities ==========

const createTestTree = (): ComponentSchema[] => [
  {
    id: 'root-1',
    type: 'text',
    props: { content: 'first' },
    styles: {},
    children: [],
  },
  {
    id: 'root-2',
    type: 'container',
    props: {},
    styles: {},
    children: [
      {
        id: 'child-1',
        type: 'text',
        props: { content: 'nested' },
        styles: {},
        children: [],
      },
      {
        id: 'child-2',
        type: 'button',
        props: { text: 'click' },
        styles: {},
        children: [],
      },
    ],
  },
];

describe('findComponentInTree', () => {
  it('should find root-level component', () => {
    const tree = createTestTree();
    const found = findComponentInTree(tree, 'root-2');
    expect(found).not.toBeNull();
    expect(found!.type).toBe('container');
  });

  it('should find deeply nested component', () => {
    const tree = createTestTree();
    const found = findComponentInTree(tree, 'child-2');
    expect(found).not.toBeNull();
    expect(found!.type).toBe('button');
  });

  it('should return null for non-existent id', () => {
    const tree = createTestTree();
    expect(findComponentInTree(tree, 'missing')).toBeNull();
  });
});

describe('findComponentPath', () => {
  it('should return path for root-level component', () => {
    const tree = createTestTree();
    const path = findComponentPath(tree, 'root-1');
    expect(path).toEqual(['root-1']);
  });

  it('should return path for nested component', () => {
    const tree = createTestTree();
    const path = findComponentPath(tree, 'child-1');
    expect(path).toEqual(['root-2', 'child-1']);
  });

  it('should return null for non-existent id', () => {
    const tree = createTestTree();
    expect(findComponentPath(tree, 'missing')).toBeNull();
  });
});

describe('updateComponent', () => {
  it('should update root-level component', () => {
    const tree = createTestTree();
    const updated = updateComponent(tree, 'root-1', (comp) => ({
      ...comp,
      props: { content: 'updated' },
    }));
    expect(updated[0].props.content).toBe('updated');
    // Original tree should not be mutated (immutability)
    expect(tree[0].props.content).toBe('first');
  });

  it('should update nested component', () => {
    const tree = createTestTree();
    const updated = updateComponent(tree, 'child-1', (comp) => ({
      ...comp,
      props: { content: 'nested-updated' },
    }));
    expect(updated[1].children![0].props.content).toBe('nested-updated');
  });
});

describe('removeComponent', () => {
  it('should remove root-level component', () => {
    const tree = createTestTree();
    const result = removeComponent(tree, 'root-1');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('root-2');
  });

  it('should remove nested component', () => {
    const tree = createTestTree();
    const result = removeComponent(tree, 'child-1');
    expect(result).toHaveLength(2);
    expect(result[1].children).toHaveLength(1);
    expect(result[1].children![0].id).toBe('child-2');
  });
});

describe('insertComponent', () => {
  it('should insert component at specified index', () => {
    const tree = createTestTree();
    const newComp: ComponentSchema = {
      id: 'inserted',
      type: 'divider',
      props: {},
      styles: {},
      children: [],
    };
    const result = insertComponent(tree, 'root-2', 1, newComp);
    expect(result[1].children).toHaveLength(3);
    expect(result[1].children![1].id).toBe('inserted');
  });

  it('should insert at beginning when index is 0', () => {
    const tree = createTestTree();
    const newComp: ComponentSchema = {
      id: 'first',
      type: 'divider',
      props: {},
      styles: {},
      children: [],
    };
    const result = insertComponent(tree, 'root-2', 0, newComp);
    expect(result[1].children![0].id).toBe('first');
  });
});

// ========== getComponentLabel ==========

describe('getComponentLabel', () => {
  it('should return label for known component types', () => {
    expect(getComponentLabel({ id: '1', type: 'text', props: {}, styles: {} })).toContain('文本');
    expect(getComponentLabel({ id: '2', type: 'button', props: {}, styles: {} })).toContain('按钮');
    expect(getComponentLabel({ id: '3', type: 'image', props: {}, styles: {} })).toContain('图片');
  });

  it('should return type name for unknown component types', () => {
    expect(getComponentLabel({ id: '1', type: 'unknown-type', props: {}, styles: {} })).toBe('unknown-type');
  });

  it('should include all registered component types', () => {
    const types = ['text', 'button', 'image', 'container', 'divider', 'spacer', 'card', 'badge', 'richText', 'input', 'video', 'audio', 'map', 'carousel', 'countdown', 'progress'];
    types.forEach((type) => {
      const label = getComponentLabel({ id: '1', type, props: {}, styles: {} });
      expect(label).not.toBe(type); // Should have emoji prefix, not just the raw type
    });
  });
});

// ========== duplicateComponentTree ==========

describe('duplicateComponentTree', () => {
  it('should create a deep copy with new ID', () => {
    const component: ComponentSchema = {
      id: 'original',
      type: 'text',
      props: { content: 'hello' },
      styles: { padding: '8px' },
      children: [],
    };
    const duplicated = duplicateComponentTree(component);
    expect(duplicated.id).not.toBe('original');
    expect(duplicated.type).toBe('text');
    expect(duplicated.props).toEqual({ content: 'hello' });
    expect(duplicated.props).not.toBe(component.props);
  });

  it('should recursively duplicate children with new IDs', () => {
    const component: ComponentSchema = {
      id: 'parent',
      type: 'container',
      props: {},
      styles: {},
      children: [
        {
          id: 'child-1',
          type: 'text',
          props: { content: 'a' },
          styles: {},
          children: [],
        },
        {
          id: 'child-2',
          type: 'text',
          props: { content: 'b' },
          styles: {},
          children: [],
        },
      ],
    };
    const duplicated = duplicateComponentTree(component);
    expect(duplicated.id).not.toBe('parent');
    expect(duplicated.children).toHaveLength(2);
    expect(duplicated.children![0].id).not.toBe('child-1');
    expect(duplicated.children![1].id).not.toBe('child-2');
    expect(duplicated.children![0].id).not.toBe(duplicated.children![1].id);
  });
});

// ========== escapeHTML ==========

describe('escapeHTML', () => {
  it('should escape all dangerous HTML characters', () => {
    expect(escapeHTML('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    );
  });

  it('should escape ampersands', () => {
    expect(escapeHTML('foo & bar')).toBe('foo &amp; bar');
  });

  it('should escape single quotes', () => {
    expect(escapeHTML("it's")).toBe('it&#39;s');
  });

  it('should return empty string for empty input', () => {
    expect(escapeHTML('')).toBe('');
  });

  it('should not modify safe strings', () => {
    expect(escapeHTML('hello world 123')).toBe('hello world 123');
  });

  it('should escape all five entities together', () => {
    expect(escapeHTML(`&<>"'`)).toBe('&amp;&lt;&gt;&quot;&#39;');
  });
});
