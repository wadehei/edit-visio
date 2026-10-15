import type { ComponentMeta } from '@page-builder/shared';

export const CarouselMeta: ComponentMeta = {
  type: 'carousel',
  label: '轮播图',
  category: 'basic',
  icon: 'carousel',
  defaultProps: {
    slides: [
      { image: 'https://via.placeholder.com/375x200/3b82f6/ffffff?text=Slide+1', alt: '图片1' },
      { image: 'https://via.placeholder.com/375x200/8b5cf6/ffffff?text=Slide+2', alt: '图片2' },
      { image: 'https://via.placeholder.com/375x200/ec4899/ffffff?text=Slide+3', alt: '图片3' },
    ],
    autoplay: true,
    interval: 3000,
    showArrows: true,
    showIndicators: true,
    height: '200px',
    borderRadius: '8px',
  },
  defaultStyles: {},
  allowChildren: false,
  propDefinitions: [
    {
      name: 'autoplay',
      label: '自动播放',
      type: 'boolean',
      defaultValue: true,
    },
    {
      name: 'interval',
      label: '切换间隔(ms)',
      type: 'number',
      defaultValue: 3000,
    },
    {
      name: 'showArrows',
      label: '显示箭头',
      type: 'boolean',
      defaultValue: true,
    },
    {
      name: 'showIndicators',
      label: '显示指示器',
      type: 'boolean',
      defaultValue: true,
    },
    {
      name: 'height',
      label: '高度',
      type: 'string',
      defaultValue: '200px',
    },
    {
      name: 'borderRadius',
      label: '圆角',
      type: 'string',
      defaultValue: '8px',
    },
  ],
};
