import type { ComponentMeta } from '@page-builder/shared';

export const ContainerMeta: ComponentMeta = {
  type: 'container',
  label: '容器',
  category: 'basic',
  icon: 'container',
  defaultProps: {
    direction: 'column',
    gap: '8px',
    padding: '16px',
  },
  defaultStyles: {
    backgroundColor: '#f5f5f5',
    minHeight: '100px',
  },
  allowChildren: true,
  propDefinitions: [
    {
      name: 'direction',
      label: '排列方向',
      type: 'select',
      options: [
        { label: '纵向', value: 'column' },
        { label: '横向', value: 'row' },
      ],
      defaultValue: 'column',
    },
    {
      name: 'gap',
      label: '间距',
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
  ],
};
