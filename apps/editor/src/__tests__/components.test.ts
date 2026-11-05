import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import StyleField from '../components/StyleField.vue';
import StyleSection from '../components/StyleSection.vue';

describe('StyleField', () => {
  it('应渲染 label、value 与 placeholder', () => {
    const wrapper = mount(StyleField, {
      props: { label: '背景色', value: '#ffffff', placeholder: '请输入颜色' },
    });

    expect(wrapper.find('label').text()).toBe('背景色');
    const input = wrapper.find('input').element as HTMLInputElement;
    expect(input.value).toBe('#ffffff');
    expect(input.placeholder).toBe('请输入颜色');
  });

  it('输入时应向外 emit change 事件', async () => {
    const wrapper = mount(StyleField, { props: { label: '宽度', value: '' } });

    await wrapper.find('input').setValue('120px');

    expect(wrapper.emitted('change')).toEqual([['120px']]);
  });
});

describe('StyleSection', () => {
  it('默认折叠，点击标题后展开并可再次收起', async () => {
    const wrapper = mount(StyleSection, {
      props: { title: '基础样式' },
      slots: { default: '<span class="content">内容</span>' },
    });

    expect(wrapper.text()).toContain('基础样式');
    expect(wrapper.find('.content').exists()).toBe(false);

    await wrapper.find('button').trigger('click');
    expect(wrapper.find('.content').exists()).toBe(true);

    await wrapper.find('button').trigger('click');
    expect(wrapper.find('.content').exists()).toBe(false);
  });

  it('defaultOpen 为 true 时应默认展开', () => {
    const wrapper = mount(StyleSection, {
      props: { title: '布局', defaultOpen: true },
      slots: { default: '<span class="content">内容</span>' },
    });

    expect(wrapper.find('.content').exists()).toBe(true);
  });
});
