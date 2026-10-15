import type { ComponentMeta } from '@page-builder/shared';

export const MapMeta: ComponentMeta = {
  type: 'map',
  label: '地图',
  category: 'basic',
  icon: 'map',
  defaultProps: {
    src: '',
    width: '100%',
    height: '300px',
    borderRadius: '0',
  },
  defaultStyles: {},
  allowChildren: false,
  propDefinitions: [
    {
      name: 'src',
      label: '地图地址',
      type: 'string',
      placeholder: 'https://maps.google.com/...',
      required: true,
    },
    {
      name: 'width',
      label: '宽度',
      type: 'string',
      defaultValue: '100%',
    },
    {
      name: 'height',
      label: '高度',
      type: 'string',
      defaultValue: '300px',
    },
    {
      name: 'borderRadius',
      label: '圆角',
      type: 'string',
      defaultValue: '0',
    },
  ],
};
