<template>
  <div
    :style="containerStyles"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ComponentSchema } from '@page-builder/shared';

interface Props {
  schema: ComponentSchema;
}

const props = defineProps<Props>();

interface ContainerProps {
  direction?: 'row' | 'column';
  gap?: string;
  padding?: string;
}

const containerProps = computed(() => props.schema.props as ContainerProps);

const direction = computed(() => containerProps.value.direction || 'column');
const gap = computed(() => containerProps.value.gap || '8px');
const padding = computed(() => containerProps.value.padding || '16px');

const containerStyles = computed(() => ({
  display: 'flex',
  flexDirection: direction.value,
  gap: gap.value,
  padding: padding.value,
  ...props.schema.styles,
}));
</script>
