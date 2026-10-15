import type { ComponentMeta } from '@page-builder/shared';

export const CountdownMeta: ComponentMeta = {
  type: 'countdown',
  label: '倒计时',
  category: 'basic',
  icon: 'countdown',
  defaultProps: {
    targetDate: new Date(Date.now() + 86400000 * 7).toISOString(),
    backgroundColor: '#f3f4f6',
    numberColor: '#ffffff',
    numberSize: '24px',
    numberBg: '#3b82f6',
    labelColor: '#6b7280',
    separatorColor: '#6b7280',
    padding: '16px',
    borderRadius: '8px',
  },
  defaultStyles: {},
  allowChildren: false,
  propDefinitions: [
    {
      name: 'targetDate',
      label: '目标时间',
      type: 'string',
      placeholder: '2024-12-31T23:59:59',
      required: true,
    },
    {
      name: 'backgroundColor',
      label: '背景颜色',
      type: 'color',
      defaultValue: '#f3f4f6',
    },
    {
      name: 'numberColor',
      label: '数字颜色',
      type: 'color',
      defaultValue: '#ffffff',
    },
    {
      name: 'numberBg',
      label: '数字背景',
      type: 'color',
      defaultValue: '#3b82f6',
    },
    {
      name: 'numberSize',
      label: '数字大小',
      type: 'string',
      defaultValue: '24px',
    },
    {
      name: 'padding',
      label: '内边距',
      type: 'string',
      defaultValue: '16px',
    },
    {
      name: 'borderRadius',
      label: '圆角',
      type: 'string',
      defaultValue: '8px',
    },
  ],
};
