import type { ComponentMeta } from '@page-builder/shared';

export const ButtonMeta: ComponentMeta = {
  type: 'button',
  label: '按钮',
  category: 'basic',
  icon: 'button',
  defaultProps: {
    text: '按钮',
    type: 'default',
    size: 'medium',
    block: false,
  },
  defaultStyles: {},
  allowChildren: false,
  propDefinitions: [
    {
      name: 'text',
      label: '按钮文字',
      type: 'string',
      defaultValue: '按钮',
      required: true,
    },
    {
      name: 'type',
      label: '按钮类型',
      type: 'select',
      options: [
        { label: '主要', value: 'primary' },
        { label: '默认', value: 'default' },
        { label: '虚线', value: 'dashed' },
      ],
      defaultValue: 'default',
    },
    {
      name: 'size',
      label: '按钮大小',
      type: 'select',
      options: [
        { label: '小', value: 'small' },
        { label: '中', value: 'medium' },
        { label: '大', value: 'large' },
      ],
      defaultValue: 'medium',
    },
    {
      name: 'block',
      label: '块级按钮',
      type: 'boolean',
      defaultValue: false,
    },
    {
      name: 'link',
      label: '点击链接',
      type: 'string',
      placeholder: 'https://example.com',
    },
  ],
};
