<template>
  <div :style="inputStyles">
    <label v-if="label" :style="labelStyles">{{ label }}</label>
    <input
      :type="inputType"
      :placeholder="placeholder"
      :disabled="disabled"
      :style="inputFieldStyles"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ComponentSchema } from '@page-builder/shared';

interface Props {
  schema: ComponentSchema;
}

const props = defineProps<Props>();

interface InputProps {
  label?: string;
  placeholder?: string;
  inputType?: 'text' | 'password' | 'number' | 'email' | 'tel';
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
}

const inputProps = computed(() => props.schema.props as InputProps);

const label = computed(() => inputProps.value.label);
const placeholder = computed(() => inputProps.value.placeholder || '请输入');
const inputType = computed(() => inputProps.value.inputType || 'text');
const disabled = computed(() => inputProps.value.disabled || false);
const size = computed(() => inputProps.value.size || 'medium');

const sizeMap: Record<string, { padding: string; fontSize: string }> = {
  small: { padding: '6px 12px', fontSize: '12px' },
  medium: { padding: '8px 12px', fontSize: '14px' },
  large: { padding: '12px 16px', fontSize: '16px' },
};

const inputStyles = computed(() => ({
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  ...props.schema.styles,
}));

const labelStyles = computed(() => ({
  fontSize: '14px',
  fontWeight: '500',
  color: '#333333',
}));

const inputFieldStyles = computed(() => ({
  padding: sizeMap[size.value].padding,
  fontSize: sizeMap[size.value].fontSize,
  border: '1px solid #d9d9d9',
  borderRadius: '4px',
  outline: 'none',
  transition: 'border-color 0.3s',
  backgroundColor: disabled.value ? '#f5f5f5' : '#ffffff',
  cursor: disabled.value ? 'not-allowed' : 'text',
}));
</script>
