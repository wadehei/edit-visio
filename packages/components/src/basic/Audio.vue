<template>
  <div :style="audioContainerStyles">
    <audio
      v-if="src"
      :src="src"
      :controls="controls"
      :autoplay="autoplay"
      :loop="loop"
      :muted="muted"
      :style="audioStyles"
    />
    <div v-else :style="placeholderStyles">
      <svg class="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
      </svg>
      <span>请配置音频地址</span>
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

interface AudioProps {
  src: string;
  controls?: boolean;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  width?: string;
}

const audioProps = computed(() => props.schema.props as AudioProps);

const src = computed(() => audioProps.value.src);
const controls = computed(() => audioProps.value.controls !== false);
const autoplay = computed(() => audioProps.value.autoplay || false);
const loop = computed(() => audioProps.value.loop || false);
const muted = computed(() => audioProps.value.muted || false);
const width = computed(() => audioProps.value.width || '100%');

const audioContainerStyles = computed(() => ({
  width: width.value,
  ...props.schema.styles,
}));

const audioStyles = computed(() => ({
  width: '100%',
}));

const placeholderStyles = computed(() => ({
  width: '100%',
  padding: '20px',
  backgroundColor: '#f3f4f6',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#9ca3af',
  borderRadius: '8px',
}));
</script>
