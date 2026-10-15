import type { ComponentMeta } from '@page-builder/shared';

export const VideoMeta: ComponentMeta = {
  type: 'video',
  label: '视频',
  category: 'basic',
  icon: 'video',
  defaultProps: {
    src: '',
    poster: '',
    controls: true,
    autoplay: false,
    loop: false,
    muted: false,
    width: '100%',
    height: 'auto',
    borderRadius: '0',
  },
  defaultStyles: {},
  allowChildren: false,
  propDefinitions: [
    {
      name: 'src',
      label: '视频地址',
      type: 'string',
      placeholder: 'https://example.com/video.mp4',
      required: true,
    },
    {
      name: 'poster',
      label: '封面图',
      type: 'image',
      placeholder: 'https://example.com/poster.jpg',
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
    {
      name: 'height',
      label: '高度',
      type: 'string',
      defaultValue: 'auto',
    },
    {
      name: 'borderRadius',
      label: '圆角',
      type: 'string',
      defaultValue: '0',
    },
  ],
};
