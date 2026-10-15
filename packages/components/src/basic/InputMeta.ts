import type { ComponentMeta } from '@page-builder/shared';

export const InputMeta: ComponentMeta = {
  type: 'input',
  label: '输入框',
  category: 'basic',
  icon: 'input',
  defaultProps: {
    label: '标签',
    placeholder: '请输入',
    inputType: 'text',
    disabled: false,
    size: 'medium',
  },
  defaultStyles: {},
  allowChildren: false,
  propDefinitions: [
    {
      name: 'label',
      label: '标签文本',
      type: 'string',
      defaultValue: '标签',
      placeholder: '标签',
    },
    {
      name: 'placeholder',
      label: '占位文本',
      type: 'string',
      defaultValue: '请输入',
      placeholder: '请输入',
    },
    {
      name: 'inputType',
      label: '输入类型',
      type: 'select',
      options: [
        { label: '文本', value: 'text' },
        { label: '密码', value: 'password' },
        { label: '数字', value: 'number' },
        { label: '邮箱', value: 'email' },
        { label: '电话', value: 'tel' },
      ],
      defaultValue: 'text',
    },
    {
      name: 'disabled',
      label: '禁用',
      type: 'boolean',
      defaultValue: false,
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
