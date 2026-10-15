import type { ComponentMeta } from '@page-builder/shared';

export const BadgeMeta: ComponentMeta = {
  type: 'badge',
  label: '徽章',
  category: 'basic',
  icon: 'badge',
  defaultProps: {
    text: '徽章',
    type: 'default',
    size: 'medium',
  },
  defaultStyles: {},
  allowChildren: false,
  propDefinitions: [
    {
      name: 'text',
      label: '文本',
      type: 'string',
      defaultValue: '徽章',
      required: true,
    },
    {
      name: 'type',
      label: '类型',
      type: 'select',
      options: [
        { label: '主要', value: 'primary' },
        { label: '成功', value: 'success' },
        { label: '警告', value: 'warning' },
        { label: '危险', value: 'danger' },
        { label: '默认', value: 'default' },
      ],
      defaultValue: 'default',
    },
    {
      name: 'size',
      label: '大小',
      type: 'select',
      options: [
        { label: '小', value: 'small' },
        { label: '中', value: 'medium' },
        { label: '大', value: 'large' },
      ],
      defaultValue: 'medium',
    },
  ],
};
