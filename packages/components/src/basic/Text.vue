<template>
  <div
    :style="componentStyles"
  >
    {{ content || '请输入文本内容' }}
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ComponentSchema } from '@page-builder/shared';

interface Props {
  schema: ComponentSchema;
}

const props = defineProps<Props>();

interface TextProps {
  content: string;
  color?: string;
  fontSize?: string;
  fontWeight?: string;
  textAlign?: 'left' | 'center' | 'right';
}

const textProps = computed(() => props.schema.props as TextProps);

const content = computed(() => textProps.value.content);

const componentStyles = computed(() => ({
  color: textProps.value.color || '#000000',
  fontSize: textProps.value.fontSize || '14px',
  fontWeight: textProps.value.fontWeight || 'normal',
  textAlign: textProps.value.textAlign || 'left',
  ...props.schema.styles,
}));
</script>
