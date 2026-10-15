import type { ComponentMeta } from '@page-builder/shared';

export const AudioMeta: ComponentMeta = {
  type: 'audio',
  label: '音频',
  category: 'basic',
  icon: 'audio',
  defaultProps: {
    src: '',
    controls: true,
    autoplay: false,
    loop: false,
    muted: false,
    width: '100%',
  },
  defaultStyles: {},
  allowChildren: false,
  propDefinitions: [
    {
      name: 'src',
      label: '音频地址',
      type: 'string',
      placeholder: 'https://example.com/audio.mp3',
      required: true,
    },
    {
      name: 'controls',
      label: '显示控制',
      type: 'boolean',
      defaultValue: true,
    },
    {
      name: 'autoplay',
      label: '自动播放',
      type: 'boolean',
      defaultValue: false,
    },
    {
      name: 'loop',
      label: '循环播放',
      type: 'boolean',
      defaultValue: false,
    },
    {
      name: 'muted',
      label: '静音',
      type: 'boolean',
      defaultValue: false,
    },
    {
      name: 'width',
      label: '宽度',
      type: 'string',
      defaultValue: '100%',
    },
  ],
};
