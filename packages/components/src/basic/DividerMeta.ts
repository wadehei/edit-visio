import type { ComponentMeta } from '@page-builder/shared';

export const DividerMeta: ComponentMeta = {
  type: 'divider',
  label: '分割线',
  category: 'basic',
  icon: 'divider',
  defaultProps: {
    color: '#e8e8e8',
    thickness: '1px',
    style: 'solid',
    margin: '16px 0',
  },
  defaultStyles: {},
  allowChildren: false,
  propDefinitions: [
    {
      name: 'color',
      label: '颜色',
      type: 'color',
      defaultValue: '#e8e8e8',
    },
    {
      name: 'thickness',
      label: '粗细',
      type: 'string',
      defaultValue: '1px',
      placeholder: '1px',
    },
    {
      name: 'style',
      label: '样式',
      type: 'select',
      options: [
        { label: '实线', value: 'solid' },
        { label: '虚线', value: 'dashed' },
        { label: '点线', value: 'dotted' },
      ],
      defaultValue: 'solid',
    },
    {
      name: 'margin',
      label: '外边距',
      type: 'string',
      defaultValue: '16px 0',
      placeholder: '16px 0',
    },
  ],
};
