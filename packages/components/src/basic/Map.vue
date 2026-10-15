<template>
  <div :style="mapContainerStyles">
    <iframe
      v-if="src"
      :src="src"
      :style="mapStyles"
      frameborder="0"
      allowfullscreen
    />
    <div v-else :style="placeholderStyles">
      <svg class="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
      <span>请配置地图地址</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ComponentSchema } from '@page-builder/shared';

interface Props {
  schema: ComponentSchema;
}

const props = defineProps<Props>();

interface MapProps {
  src: string;
  width?: string;
  height?: string;
  borderRadius?: string;
}

const mapProps = computed(() => props.schema.props as MapProps);

const src = computed(() => mapProps.value.src);
const width = computed(() => mapProps.value.width || '100%');
const height = computed(() => mapProps.value.height || '300px');
const borderRadius = computed(() => mapProps.value.borderRadius || '0');

const mapContainerStyles = computed(() => ({
  width: width.value,
  height: height.value,
  borderRadius: borderRadius.value,
  overflow: 'hidden',
  ...props.schema.styles,
}));

const mapStyles = computed(() => ({
  width: '100%',
  height: '100%',
  border: 'none',
}));

const placeholderStyles = computed(() => ({
  width: '100%',
  height: height.value,
  backgroundColor: '#f3f4f6',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#9ca3af',
}));
</script>
