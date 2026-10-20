import type { PageSchema } from '@page-builder/shared';

export interface Template {
  id: string;
  name: string;
  description: string;
  data: PageSchema;
}

export const templates: Template[] = [
  {
    id: 'blank',
    name: '空白页面',
    description: '从空白页面开始',
    data: {
      id: 'page-blank',
      name: '空白页面',
      version: '1.0.0',
      props: {
        title: '空白页面',
        backgroundColor: '#ffffff',
      },
      children: [],
    },
  },
  {
    id: 'landing',
    name: '落地页',
    description: '产品介绍落地页模板',
    data: {
      id: 'page-landing',
      name: '产品介绍',
      version: '1.0.0',
      props: {
        title: '产品介绍',
        backgroundColor: '#ffffff',
      },
      children: [
        {
          id: 'text-title',
          type: 'text',
          props: {
            content: '欢迎来到我们的产品',
            color: '#000000',
            fontSize: '24px',
            fontWeight: 'bold',
            textAlign: 'center',
          },
          styles: { padding: '24px', margin: '0 0 16px 0' },
          children: [],
        },
        {
          id: 'image-hero',
          type: 'image',
          props: {
            src: 'https://via.placeholder.com/375x200',
            alt: '产品图片',
            width: '100%',
            height: '200px',
            objectFit: 'cover',
          },
          styles: {},
          children: [],
        },
        {
          id: 'text-desc',
          type: 'text',
          props: {
            content: '这是一个简单的产品介绍模板，您可以根据需要修改内容。',
            color: '#666666',
            fontSize: '14px',
            textAlign: 'left',
          },
          styles: { padding: '16px', margin: '16px 0' },
          children: [],
        },
        {
          id: 'button-cta',
          type: 'button',
          props: {
            text: '立即了解',
            type: 'primary',
            size: 'large',
            block: true,
          },
          styles: { margin: '16px' },
          children: [],
        },
      ],
    },
  },
  {
    id: 'profile',
    name: '个人主页',
    description: '个人介绍页面模板',
    data: {
      id: 'page-profile',
      name: '个人主页',
      version: '1.0.0',
      props: {
        title: '个人主页',
        backgroundColor: '#f5f5f5',
      },
      children: [
        {
          id: 'container-header',
          type: 'container',
          props: { direction: 'column', gap: '12px', padding: '24px' },
          styles: { backgroundColor: '#ffffff', margin: '0 0 16px 0' },
          children: [
            {
              id: 'text-name',
              type: 'text',
              props: {
                content: '张三',
                color: '#000000',
                fontSize: '20px',
                fontWeight: 'bold',
                textAlign: 'center',
              },
              styles: {},
              children: [],
            },
            {
              id: 'badge-title',
              type: 'badge',
              props: { text: '前端工程师', type: 'primary', size: 'medium' },
              styles: {},
              children: [],
            },
          ],
        },
        {
          id: 'card-about',
          type: 'card',
          props: {
            title: '关于我',
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            padding: '16px',
            shadow: 'small',
          },
          styles: { margin: '16px' },
          children: [
            {
              id: 'text-about',
              type: 'text',
              props: {
                content: '热爱前端开发，专注于 Vue 和 React 技术栈。',
                color: '#666666',
                fontSize: '14px',
              },
              styles: {},
              children: [],
            },
          ],
        },
      ],
    },
  },
];
