<template>
  <div :style="cardStyles">
    <div v-if="title" :style="titleStyles">{{ title }}</div>
    <div :style="contentStyles">
      <slot />
    </div>
    <div v-if="footer" :style="footerStyles">{{ footer }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ComponentSchema } from '@page-builder/shared';

interface Props {
  schema: ComponentSchema;
}

const props = defineProps<Props>();

interface CardProps {
  title?: string;
  footer?: string;
  backgroundColor?: string;
  borderRadius?: string;
  padding?: string;
  shadow?: 'none' | 'small' | 'medium' | 'large';
}

const cardProps = computed(() => props.schema.props as CardProps);

const title = computed(() => cardProps.value.title);
const footer = computed(() => cardProps.value.footer);
const backgroundColor = computed(() => cardProps.value.backgroundColor || '#ffffff');
const borderRadius = computed(() => cardProps.value.borderRadius || '8px');
const padding = computed(() => cardProps.value.padding || '16px');
const shadow = computed(() => cardProps.value.shadow || 'small');

const shadowMap: Record<string, string> = {
  none: 'none',
  small: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  medium: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  large: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
};

const cardStyles = computed(() => ({
  backgroundColor: backgroundColor.value,
  borderRadius: borderRadius.value,
  boxShadow: shadowMap[shadow.value],
  overflow: 'hidden',
  ...props.schema.styles,
}));

const titleStyles = computed(() => ({
  padding: padding.value,
  paddingBottom: '12px',
  fontSize: '16px',
  fontWeight: '600',
  color: '#000000',
  borderBottom: '1px solid #f0f0f0',
}));

const contentStyles = computed(() => ({
  padding: padding.value,
}));

const footerStyles = computed(() => ({
  padding: padding.value,
  paddingTop: '12px',
  fontSize: '14px',
  color: '#666666',
  borderTop: '1px solid #f0f0f0',
}));
</script>
