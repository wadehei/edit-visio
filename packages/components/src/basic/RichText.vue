<template>
  <div :style="richTextStyles" v-html="sanitizedContent" />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { CSSProperties } from 'vue';
import DOMPurify from 'dompurify';
import type { ComponentSchema } from '@page-builder/shared';

interface Props {
  schema: ComponentSchema;
}

const props = defineProps<Props>();

interface RichTextProps {
  content: string;
  color?: string;
  fontSize?: string;
  lineHeight?: string;
}

// props 缺失时兜底为空对象，避免渲染期读取 undefined.content 抛错
const richTextProps = computed(() => (props.schema.props || {}) as unknown as RichTextProps);

const color = computed(() => richTextProps.value.color || '#333333');
const fontSize = computed(() => richTextProps.value.fontSize || '14px');
const lineHeight = computed(() => richTextProps.value.lineHeight || '1.6');

const richTextStyles = computed<CSSProperties>(() => ({
  color: color.value,
  fontSize: fontSize.value,
  lineHeight: lineHeight.value,
  ...(props.schema.styles as CSSProperties),
}));

// 带 target 的链接补 rel，防止反向 tabnabbing（模块级注册一次）
DOMPurify.addHook('afterSanitizeAttributes', (node: Element) => {
  if (node.tagName === 'A' && node.getAttribute('target')) {
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

// 使用 DOMPurify 清理 HTML，防止 XSS 攻击
const sanitizedContent = computed(() => {
  const raw = richTextProps.value.content || '<p>请输入富文本内容</p>';
  return DOMPurify.sanitize(raw, {
    ALLOWED_TAGS: [
      'p',
      'br',
      'strong',
      'em',
      'u',
      's',
      'b',
      'i',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'ul',
      'ol',
      'li',
      'blockquote',
      'a',
      'img',
      'span',
      'div',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
      'pre',
      'code',
    ],
    ALLOWED_ATTR: ['style', 'href', 'src', 'alt', 'title', 'class', 'target'],
  });
});
</script>
