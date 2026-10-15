<template>
  <button
    :style="buttonStyles"
  >
    {{ text || '按钮' }}
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ComponentSchema } from '@page-builder/shared';

interface Props {
  schema: ComponentSchema;
}

const props = defineProps<Props>();

interface ButtonProps {
  text: string;
  type?: 'primary' | 'default' | 'dashed';
  size?: 'small' | 'medium' | 'large';
  block?: boolean;
  link?: string;
}

const buttonProps = computed(() => props.schema.props as ButtonProps);

const text = computed(() => buttonProps.value.text);
const type = computed(() => buttonProps.value.type || 'default');
const size = computed(() => buttonProps.value.size || 'medium');
const block = computed(() => buttonProps.value.block || false);

const baseStyles: Record<string, string> = {
  display: block.value ? 'block' : 'inline-block',
  width: block.value ? '100%' : 'auto',
  padding: size.value === 'small' ? '6px 12px' : size.value === 'large' ? '12px 24px' : '8px 16px',
  fontSize: size.value === 'small' ? '12px' : size.value === 'large' ? '16px' : '14px',
  borderRadius: '4px',
  border: '1px solid',
  cursor: 'pointer',
  textAlign: 'center',
  transition: 'all 0.3s',
};

const typeStyles: Record<string, Record<string, string>> = {
  primary: {
    backgroundColor: '#1890ff',
    borderColor: '#1890ff',
    color: '#ffffff',
  },
  default: {
    backgroundColor: '#ffffff',
    borderColor: '#d9d9d9',
    color: '#000000',
  },
  dashed: {
    backgroundColor: '#ffffff',
    borderColor: '#d9d9d9',
    color: '#000000',
    borderStyle: 'dashed',
  },
};

const buttonStyles = computed(() => ({
  ...baseStyles,
  ...typeStyles[type.value],
  ...props.schema.styles,
}));
</script>
