import { describe, it, expect } from 'vitest';
import {
  createDefaultPage,
  validatePageSchema,
  serializePage,
  deserializePage,
} from '@page-builder/core';
import type { PageSchema } from '@page-builder/shared';

describe('createDefaultPage', () => {
  it('should create a page with default values', () => {
    const page = createDefaultPage();
    expect(page.id).toMatch(/^page-/);
    expect(page.name).toBe('未命名页面');
    expect(page.version).toBe('1.0.0');
    expect(page.props.title).toBe('未命名页面');
    expect(page.props.backgroundColor).toBe('#ffffff');
    expect(page.children).toEqual([]);
  });

  it('should accept custom name', () => {
    const page = createDefaultPage('我的页面');
    expect(page.name).toBe('我的页面');
    expect(page.props.title).toBe('我的页面');
  });

  it('should generate unique IDs for each page', () => {
    const page1 = createDefaultPage();
    const page2 = createDefaultPage();
    expect(page1.id).not.toBe(page2.id);
  });
});

describe('validatePageSchema', () => {
  it('should validate a correct page', () => {
    const page = createDefaultPage('测试');
    const result = validatePageSchema(page);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject page without id', () => {
    const page = createDefaultPage();
    page.id = '';
    const result = validatePageSchema(page);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('ID'))).toBe(true);
  });

  it('should reject page without name', () => {
    const page = createDefaultPage();
    page.name = '';
    const result = validatePageSchema(page);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('名称'))).toBe(true);
  });

  it('should reject page without title', () => {
    const page = createDefaultPage();
    page.props.title = '';
    const result = validatePageSchema(page);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('标题'))).toBe(true);
  });

  it('should reject page without background color', () => {
    const page = createDefaultPage();
    page.props.backgroundColor = '';
    const result = validatePageSchema(page);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('背景颜色'))).toBe(true);
  });

  it('should validate nested components', () => {
    const page: PageSchema = {
      id: 'page-1',
      name: 'Test',
      version: '1.0.0',
      props: { title: 'Test', backgroundColor: '#fff' },
      children: [
        {
          id: 'comp-1',
          type: 'text',
          props: {},
          styles: {},
          children: [
            {
              id: '', // Invalid: empty ID
              type: 'button',
              props: {},
              styles: {},
              children: [],
            },
          ],
        },
      ],
    };
    const result = validatePageSchema(page);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe('serializePage / deserializePage', () => {
  it('should roundtrip a page through JSON', () => {
    const original = createDefaultPage('序列化测试');
    original.children = [
      {
        id: 'comp-1',
        type: 'text',
        props: { content: 'hello' },
        styles: { padding: '8px' },
        children: [],
      },
    ];

    const json = serializePage(original);
    const deserialized = deserializePage(json);

    expect(deserialized.id).toBe(original.id);
    expect(deserialized.name).toBe(original.name);
    expect(deserialized.children).toHaveLength(1);
    expect(deserialized.children[0].props.content).toBe('hello');
  });

  it('should throw on invalid JSON', () => {
    expect(() => deserializePage('not valid json')).toThrow();
  });

  it('should throw on schema validation failure', () => {
    const invalidJson = JSON.stringify({ id: '', name: '', version: '1.0.0', props: { title: '', backgroundColor: '' }, children: [] });
    expect(() => deserializePage(invalidJson)).toThrow();
  });
});
