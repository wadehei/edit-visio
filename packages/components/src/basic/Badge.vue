<template>
  <div :style="badgeStyles">
    {{ text }}
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ComponentSchema } from '@page-builder/shared';

interface Props {
  schema: ComponentSchema;
}

const props = defineProps<Props>();

interface BadgeProps {
  text: string;
  type?: 'primary' | 'success' | 'warning' | 'danger' | 'default';
  size?: 'small' | 'medium' | 'large';
}

const badgeProps = computed(() => props.schema.props as BadgeProps);

const text = computed(() => badgeProps.value.text);
const type = computed(() => badgeProps.value.type || 'default');
const size = computed(() => badgeProps.value.size || 'medium');

const colorMap: Record<string, { bg: string; color: string; border: string }> = {
  primary: { bg: '#e6f7ff', color: '#1890ff', border: '#91d5ff' },
  success: { bg: '#f6ffed', color: '#52c41a', border: '#b7eb8f' },
  warning: { bg: '#fffbe6', color: '#faad14', border: '#ffe58f' },
  danger: { bg: '#fff2f0', color: '#ff4d4f', border: '#ffccc7' },
  default: { bg: '#fafafa', color: '#666666', border: '#d9d9d9' },
};

const sizeMap: Record<string, { padding: string; fontSize: string }> = {
  small: { padding: '2px 8px', fontSize: '12px' },
  medium: { padding: '4px 12px', fontSize: '14px' },
  large: { padding: '6px 16px', fontSize: '16px' },
};

const badgeStyles = computed(() => ({
  display: 'inline-block',
  padding: sizeMap[size.value].padding,
  fontSize: sizeMap[size.value].fontSize,
  backgroundColor: colorMap[type.value].bg,
  color: colorMap[type.value].color,
  border: `1px solid ${colorMap[type.value].border}`,
  borderRadius: '4px',
  ...props.schema.styles,
}));
</script>
