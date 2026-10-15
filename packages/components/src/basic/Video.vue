<template>
  <div :style="videoContainerStyles">
    <video
      v-if="src"
      :src="src"
      :controls="controls"
      :autoplay="autoplay"
      :loop="loop"
      :muted="muted"
      :poster="poster"
      :style="videoStyles"
    />
    <div v-else :style="placeholderStyles">
      <svg class="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
      <span>请配置视频地址</span>
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

interface VideoProps {
  src: string;
  poster?: string;
  controls?: boolean;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  width?: string;
  height?: string;
  borderRadius?: string;
}

const videoProps = computed(() => props.schema.props as VideoProps);

const src = computed(() => videoProps.value.src);
const poster = computed(() => videoProps.value.poster);
const controls = computed(() => videoProps.value.controls !== false);
const autoplay = computed(() => videoProps.value.autoplay || false);
const loop = computed(() => videoProps.value.loop || false);
const muted = computed(() => videoProps.value.muted || false);
const width = computed(() => videoProps.value.width || '100%');
const height = computed(() => videoProps.value.height || 'auto');
const borderRadius = computed(() => videoProps.value.borderRadius || '0');

const videoContainerStyles = computed(() => ({
  width: width.value,
  height: height.value,
  borderRadius: borderRadius.value,
  overflow: 'hidden',
  ...props.schema.styles,
}));

const videoStyles = computed(() => ({
  width: '100%',
  height: '100%',
  objectFit: 'cover',
}));

const placeholderStyles = computed(() => ({
  width: '100%',
  height: '200px',
  backgroundColor: '#f3f4f6',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#9ca3af',
}));
</script>
