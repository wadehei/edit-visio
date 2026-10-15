<template>
  <div :style="richTextStyles" v-html="content || '<p>请输入富文本内容</p>'" />
</template>

<script setup lang="ts">
import { computed } from 'vue';
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

const richTextProps = computed(() => props.schema.props as RichTextProps);

const content = computed(() => richTextProps.value.content);
const color = computed(() => richTextProps.value.color || '#333333');
const fontSize = computed(() => richTextProps.value.fontSize || '14px');
const lineHeight = computed(() => richTextProps.value.lineHeight || '1.6');

const richTextStyles = computed(() => ({
  color: color.value,
  fontSize: fontSize.value,
  lineHeight: lineHeight.value,
  ...props.schema.styles,
}));
</script>
