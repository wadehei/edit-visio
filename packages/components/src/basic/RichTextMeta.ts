import type { ComponentMeta } from '@page-builder/shared';

export const RichTextMeta: ComponentMeta = {
  type: 'richText',
  label: '富文本',
  category: 'basic',
  icon: 'richText',
  defaultProps: {
    content: '<p>请输入富文本内容</p>',
    color: '#333333',
    fontSize: '14px',
    lineHeight: '1.6',
  },
  defaultStyles: {
    padding: '8px',
  },
  allowChildren: false,
  propDefinitions: [
    {
      name: 'content',
      label: 'HTML 内容',
      type: 'textarea',
      defaultValue: '<p>请输入富文本内容</p>',
      required: true,
    },
    {
      name: 'color',
      label: '文字颜色',
      type: 'color',
      defaultValue: '#333333',
    },
    {
      name: 'fontSize',
      label: '字体大小',
      type: 'string',
      defaultValue: '14px',
      placeholder: '14px',
    },
    {
      name: 'lineHeight',
      label: '行高',
      type: 'string',
      defaultValue: '1.6',
      placeholder: '1.6',
    },
  ],
};
