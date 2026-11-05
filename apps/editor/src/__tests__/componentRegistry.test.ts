import { describe, it, expect } from 'vitest';
import {
  getComponent,
  getMeta,
  getAllMetas,
  getRegisteredTypes,
  isContainerType,
} from '../registry/componentRegistry';

const ALL_TYPES = [
  'text',
  'button',
  'image',
  'container',
  'divider',
  'spacer',
  'card',
  'badge',
  'richText',
  'input',
  'video',
  'audio',
  'map',
  'carousel',
  'countdown',
  'progress',
];

describe('componentRegistry', () => {
  it('getComponent 应返回已注册的 Vue 组件', () => {
    expect(getComponent('text')).toBeDefined();
    expect(getComponent('container')).toBeDefined();
  });

  it('getMeta 应返回与类型一致的元数据', () => {
    expect(getMeta('text')?.type).toBe('text');
    expect(getMeta('text')?.label).toBe('文本');
  });

  it('未注册类型应返回 undefined', () => {
    expect(getComponent('__nope__')).toBeUndefined();
    expect(getMeta('__nope__')).toBeUndefined();
  });

  it('getAllMetas 应返回全部注册元数据', () => {
    const metas = getAllMetas();
    expect(metas).toHaveLength(ALL_TYPES.length);
    expect(metas.map((m) => m.type).sort()).toEqual([...ALL_TYPES].sort());
  });

  it('getRegisteredTypes 应返回全部类型键', () => {
    expect(getRegisteredTypes()).toHaveLength(ALL_TYPES.length);
    expect(getRegisteredTypes()).toEqual(expect.arrayContaining(ALL_TYPES));
  });

  it('isContainerType 应依据 allowChildren 判断', () => {
    expect(isContainerType('container')).toBe(true);
    expect(isContainerType('text')).toBe(false);
    expect(isContainerType('__nope__')).toBe(false);
  });
});
