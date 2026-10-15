import type { ComponentMeta } from '@page-builder/shared';

export const CardMeta: ComponentMeta = {
  type: 'card',
  label: '卡片',
  category: 'basic',
  icon: 'card',
  defaultProps: {
    title: '卡片标题',
    footer: '',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    padding: '16px',
    shadow: 'small',
  },
  defaultStyles: {},
  allowChildren: true,
  propDefinitions: [
    {
      name: 'title',
      label: '标题',
      type: 'string',
      defaultValue: '卡片标题',
      placeholder: '卡片标题',
    },
    {
      name: 'footer',
      label: '底部内容',
      type: 'string',
      placeholder: '底部内容（可选）',
    },
    {
      name: 'backgroundColor',
      label: '背景颜色',
      type: 'color',
      defaultValue: '#ffffff',
    },
    {
      name: 'borderRadius',
      label: '圆角',
      type: 'string',
      defaultValue: '8px',
      placeholder: '8px',
    },
    {
      name: 'padding',
      label: '内边距',
      type: 'string',
      defaultValue: '16px',
      placeholder: '16px',
    },
    {
      name: 'shadow',
      label: '阴影',
      type: 'select',
      options: [
        { label: '无', value: 'none' },
        { label: '小', value: 'small' },
        { label: '中', value: 'medium' },
        { label: '大', value: 'large' },
      ],
      defaultValue: 'small',
    },
  ],
};
