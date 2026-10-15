<template>
  <div :style="spacerStyles" />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ComponentSchema } from '@page-builder/shared';

interface Props {
  schema: ComponentSchema;
}

const props = defineProps<Props>();

interface SpacerProps {
  height?: string;
  backgroundColor?: string;
}

const spacerProps = computed(() => props.schema.props as SpacerProps);

const height = computed(() => spacerProps.value.height || '20px');
const backgroundColor = computed(() => spacerProps.value.backgroundColor || 'transparent');

const spacerStyles = computed(() => ({
  height: height.value,
  backgroundColor: backgroundColor.value,
  ...props.schema.styles,
}));
</script>
