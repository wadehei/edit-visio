<template>
  <div :style="dividerStyles" />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ComponentSchema } from '@page-builder/shared';

interface Props {
  schema: ComponentSchema;
}

const props = defineProps<Props>();

interface DividerProps {
  color?: string;
  thickness?: string;
  style?: 'solid' | 'dashed' | 'dotted';
  margin?: string;
}

const dividerProps = computed(() => props.schema.props as DividerProps);

const color = computed(() => dividerProps.value.color || '#e8e8e8');
const thickness = computed(() => dividerProps.value.thickness || '1px');
const style = computed(() => dividerProps.value.style || 'solid');
const margin = computed(() => dividerProps.value.margin || '16px 0');

const dividerStyles = computed(() => ({
  height: thickness.value,
  backgroundColor: style.value === 'solid' ? color.value : 'transparent',
  borderTop: style.value !== 'solid' ? `${thickness.value} ${style.value} ${color.value}` : 'none',
  margin: margin.value,
  ...props.schema.styles,
}));
</script>
