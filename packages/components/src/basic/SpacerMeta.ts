import type { ComponentMeta } from '@page-builder/shared';

export const SpacerMeta: ComponentMeta = {
  type: 'spacer',
  label: '间距',
  category: 'basic',
  icon: 'spacer',
  defaultProps: {
    height: '20px',
    backgroundColor: 'transparent',
  },
  defaultStyles: {},
  allowChildren: false,
  propDefinitions: [
    {
      name: 'height',
      label: '高度',
      type: 'string',
      defaultValue: '20px',
      placeholder: '20px',
    },
    {
      name: 'backgroundColor',
      label: '背景颜色',
      type: 'color',
      defaultValue: 'transparent',
    },
  ],
};
