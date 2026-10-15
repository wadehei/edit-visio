import type { ComponentMeta } from '@page-builder/shared';

export const ImageMeta: ComponentMeta = {
  type: 'image',
  label: '图片',
  category: 'basic',
  icon: 'image',
  defaultProps: {
    src: 'https://via.placeholder.com/300x200',
    alt: '',
    width: '100%',
    height: 'auto',
    objectFit: 'cover',
    borderRadius: '0',
  },
  defaultStyles: {},
  allowChildren: false,
  propDefinitions: [
    {
      name: 'src',
      label: '图片地址',
      type: 'image',
      required: true,
    },
    {
      name: 'alt',
      label: '替代文本',
      type: 'string',
      placeholder: '图片描述',
    },
    {
      name: 'width',
      label: '宽度',
      type: 'string',
      defaultValue: '100%',
      placeholder: '100% 或 300px',
    },
    {
      name: 'height',
      label: '高度',
      type: 'string',
      defaultValue: 'auto',
      placeholder: 'auto 或 200px',
    },
    {
      name: 'objectFit',
      label: '填充模式',
      type: 'select',
      options: [
        { label: '覆盖', value: 'cover' },
        { label: '包含', value: 'contain' },
        { label: '拉伸', value: 'fill' },
      ],
      defaultValue: 'cover',
    },
    {
      name: 'borderRadius',
      label: '圆角',
      type: 'string',
      defaultValue: '0',
      placeholder: '0 或 8px',
    },
  ],
};
