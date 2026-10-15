import type { ComponentMeta } from '@page-builder/shared';

export const ProgressMeta: ComponentMeta = {
  type: 'progress',
  label: '进度条',
  category: 'basic',
  icon: 'progress',
  defaultProps: {
    value: 50,
    label: '进度',
    showValue: true,
    height: '8px',
    trackColor: '#e5e7eb',
    fillColor: '#3b82f6',
    borderRadius: '4px',
    labelColor: '#374151',
    valueColor: '#6b7280',
  },
  defaultStyles: {
    padding: '8px',
  },
  allowChildren: false,
  propDefinitions: [
    {
      name: 'value',
      label: '进度值(0-100)',
      type: 'number',
      defaultValue: 50,
      required: true,
    },
    {
      name: 'label',
      label: '标签',
      type: 'string',
      placeholder: '进度',
    },
    {
      name: 'showValue',
      label: '显示数值',
      type: 'boolean',
      defaultValue: true,
    },
    {
      name: 'height',
      label: '高度',
      type: 'string',
      defaultValue: '8px',
    },
    {
      name: 'trackColor',
      label: '轨道颜色',
      type: 'color',
      defaultValue: '#e5e7eb',
    },
    {
      name: 'fillColor',
      label: '填充颜色',
      type: 'color',
      defaultValue: '#3b82f6',
    },
    {
      name: 'borderRadius',
      label: '圆角',
      type: 'string',
      defaultValue: '4px',
    },
  ],
};
