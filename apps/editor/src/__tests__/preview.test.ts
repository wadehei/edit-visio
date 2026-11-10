import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import type { ComponentSchema, PageSchema } from '@page-builder/shared';

const loggerError = vi.hoisted(() => vi.fn());

vi.mock('../utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: loggerError },
}));

import PreviewPage from '../views/PreviewPage.vue';
import PreviewNode from '../components/PreviewNode.vue';

function makeComponent(
  overrides: Partial<ComponentSchema> & Pick<ComponentSchema, 'id' | 'type'>,
): ComponentSchema {
  return { props: {}, styles: {}, ...overrides };
}

function makePage(overrides: Partial<PageSchema> = {}): PageSchema {
  return {
    id: 'page-1',
    name: '预览页',
    version: '1',
    props: { title: '预览', backgroundColor: '#ffffff' },
    children: [],
    ...overrides,
  };
}

describe('PreviewPage', () => {
  beforeEach(() => {
    localStorage.clear();
    loggerError.mockClear();
  });

  it('无快照数据时展示空状态并使用默认样式', async () => {
    const wrapper = mount(PreviewPage);
    await flushPromises();

    expect(wrapper.find('.preview-empty').exists()).toBe(true);
    expect(wrapper.find('.preview-empty').text()).toBe('暂无可预览的内容');
    const style = wrapper.find('.preview-root').attributes('style');
    expect(style).toContain('background-color: rgb(255, 255, 255)');
    expect(style).toContain('padding: 16px');
    expect(style).not.toContain('background-image');
  });

  it('渲染快照中的组件、过滤不可见项并应用页面样式', async () => {
    localStorage.setItem(
      'preview-page',
      JSON.stringify(
        makePage({
          props: {
            title: '预览',
            backgroundColor: '#ffeeee',
            backgroundImage: 'https://a/b.png',
            padding: '24px',
          },
          children: [
            makeComponent({ id: 't1', type: 'text', props: { content: '你好' } }),
            makeComponent({
              id: 'c1',
              type: 'container',
              props: {},
              children: [
                makeComponent({ id: 't2', type: 'text', props: { content: '容器内' } }),
                makeComponent({
                  id: 't3',
                  type: 'text',
                  props: { content: '隐藏项' },
                  visible: false,
                }),
              ],
            }),
            makeComponent({ id: 'c2', type: 'container', props: {}, children: [] }),
            makeComponent({ id: 'u1', type: 'unknown-type', props: {} }),
          ],
        }),
      ),
    );

    const wrapper = mount(PreviewPage);
    await flushPromises();

    expect(wrapper.find('.preview-empty').exists()).toBe(false);
    expect(wrapper.text()).toContain('你好');
    expect(wrapper.text()).toContain('容器内');
    expect(wrapper.text()).not.toContain('隐藏项');
    const style = wrapper.find('.preview-root').attributes('style');
    expect(style).toContain('background-color: rgb(255, 238, 238)');
    expect(style).toContain('background-image');
    expect(style).toContain('padding: 24px');
  });

  it('快照 JSON 非法时记录错误并展示空状态', async () => {
    localStorage.setItem('preview-page', '{invalid json');
    const wrapper = mount(PreviewPage);
    await flushPromises();

    expect(loggerError).toHaveBeenCalledWith('PreviewPage', '预览数据解析失败', expect.anything());
    expect(wrapper.find('.preview-empty').exists()).toBe(true);
  });

  it('顶层组件全部不可见时展示空状态', async () => {
    localStorage.setItem(
      'preview-page',
      JSON.stringify(
        makePage({
          children: [
            makeComponent({
              id: 't1',
              type: 'text',
              props: { content: 'x' },
              visible: false,
            }),
          ],
        }),
      ),
    );

    const wrapper = mount(PreviewPage);
    await flushPromises();

    expect(wrapper.find('.preview-empty').exists()).toBe(true);
  });
});

describe('PreviewNode', () => {
  it('未注册组件类型不渲染任何内容', () => {
    const wrapper = mount(PreviewNode, {
      props: { component: makeComponent({ id: 'x', type: 'not-registered' }) },
    });

    expect(wrapper.find('div').exists()).toBe(false);
  });

  it('非容器组件不渲染其子组件', () => {
    const wrapper = mount(PreviewNode, {
      props: {
        component: makeComponent({
          id: 't1',
          type: 'text',
          props: { content: '父级' },
          children: [makeComponent({ id: 'c1', type: 'text', props: { content: '不应出现' } })],
        }),
      },
    });

    expect(wrapper.text()).toContain('父级');
    expect(wrapper.text()).not.toContain('不应出现');
  });

  it('容器组件递归渲染可见子组件并过滤隐藏项', () => {
    const wrapper = mount(PreviewNode, {
      props: {
        component: makeComponent({
          id: 'c1',
          type: 'container',
          props: {},
          children: [
            makeComponent({ id: 'a', type: 'text', props: { content: '可见' } }),
            makeComponent({
              id: 'b',
              type: 'text',
              props: { content: '不可见' },
              visible: false,
            }),
          ],
        }),
      },
    });

    expect(wrapper.text()).toContain('可见');
    expect(wrapper.text()).not.toContain('不可见');
  });

  it('容器组件无非空可见子组件时不渲染插槽内容', () => {
    // 容器未声明 children 属性，覆盖 `children ?? []` 兜底分支
    const wrapper = mount(PreviewNode, {
      props: {
        component: makeComponent({ id: 'c1', type: 'container', props: {} }),
      },
    });

    expect(wrapper.text()).toBe('');
  });
});
