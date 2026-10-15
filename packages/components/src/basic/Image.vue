<template>
  <img
    :src="src || 'https://via.placeholder.com/300x200'"
    :alt="alt"
    :style="imageStyles"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ComponentSchema } from '@page-builder/shared';

interface Props {
  schema: ComponentSchema;
}

const props = defineProps<Props>();

interface ImageProps {
  src: string;
  alt?: string;
  width?: string;
  height?: string;
  objectFit?: 'cover' | 'contain' | 'fill';
  borderRadius?: string;
}

const imageProps = computed(() => props.schema.props as ImageProps);

const src = computed(() => imageProps.value.src);
const alt = computed(() => imageProps.value.alt || '');
const width = computed(() => imageProps.value.width || '100%');
const height = computed(() => imageProps.value.height || 'auto');
const objectFit = computed(() => imageProps.value.objectFit || 'cover');
const borderRadius = computed(() => imageProps.value.borderRadius || '0');

const imageStyles = computed(() => ({
  width: width.value,
  height: height.value,
  objectFit: objectFit.value,
  borderRadius: borderRadius.value,
  display: 'block',
  ...props.schema.styles,
}));
</script>
