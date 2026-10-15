import type { ComponentMeta } from '@page-builder/shared';

export const TextMeta: ComponentMeta = {
  type: 'text',
  label: '文本',
  category: 'basic',
  icon: 'text',
  defaultProps: {
    content: '请输入文本内容',
    color: '#000000',
    fontSize: '14px',
    fontWeight: 'normal',
    textAlign: 'left',
  },
  defaultStyles: {
    padding: '8px',
  },
  allowChildren: false,
  propDefinitions: [
    {
      name: 'content',
      label: '文本内容',
      type: 'textarea',
      defaultValue: '请输入文本内容',
      required: true,
    },
    {
      name: 'color',
      label: '文字颜色',
      type: 'color',
      defaultValue: '#000000',
    },
    {
      name: 'fontSize',
      label: '字体大小',
      type: 'select',
      options: [
        { label: '12px', value: '12px' },
        { label: '14px', value: '14px' },
        { label: '16px', value: '16px' },
        { label: '18px', value: '18px' },
        { label: '20px', value: '20px' },
        { label: '24px', value: '24px' },
      ],
      defaultValue: '14px',
    },
    {
      name: 'fontWeight',
      label: '字重',
      type: 'select',
      options: [
        { label: '正常', value: 'normal' },
        { label: '粗体', value: 'bold' },
      ],
      defaultValue: 'normal',
    },
    {
      name: 'textAlign',
      label: '对齐方式',
      type: 'select',
      options: [
        { label: '左对齐', value: 'left' },
        { label: '居中', value: 'center' },
        { label: '右对齐', value: 'right' },
      ],
      defaultValue: 'left',
    },
  ],
};
