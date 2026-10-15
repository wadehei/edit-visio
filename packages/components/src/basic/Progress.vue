<template>
  <div :style="progressStyles">
    <div v-if="label" :style="labelStyles">{{ label }}</div>
    <div :style="trackStyles">
      <div :style="fillStyles" />
    </div>
    <div v-if="showValue" :style="valueStyles">{{ value }}%</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ComponentSchema } from '@page-builder/shared';

interface Props {
  schema: ComponentSchema;
}

const props = defineProps<Props>();

interface ProgressProps {
  value: number;
  label?: string;
  showValue?: boolean;
  height?: string;
  trackColor?: string;
  fillColor?: string;
  borderRadius?: string;
  labelColor?: string;
  valueColor?: string;
}

const progressProps = computed(() => props.schema.props as ProgressProps);

const value = computed(() => Math.min(100, Math.max(0, progressProps.value.value || 0)));
const label = computed(() => progressProps.value.label);
const showValue = computed(() => progressProps.value.showValue !== false);
const height = computed(() => progressProps.value.height || '8px');
const trackColor = computed(() => progressProps.value.trackColor || '#e5e7eb');
const fillColor = computed(() => progressProps.value.fillColor || '#3b82f6');
const borderRadius = computed(() => progressProps.value.borderRadius || '4px');
const labelColor = computed(() => progressProps.value.labelColor || '#374151');
const valueColor = computed(() => progressProps.value.valueColor || '#6b7280');

const progressStyles = computed(() => ({
  width: '100%',
  ...props.schema.styles,
}));

const labelStyles = computed(() => ({
  color: labelColor.value,
  fontSize: '14px',
  marginBottom: '8px',
}));

const trackStyles = computed(() => ({
  width: '100%',
  height: height.value,
  backgroundColor: trackColor.value,
  borderRadius: borderRadius.value,
  overflow: 'hidden',
}));

const fillStyles = computed(() => ({
  width: `${value.value}%`,
  height: '100%',
  backgroundColor: fillColor.value,
  borderRadius: borderRadius.value,
  transition: 'width 0.3s ease',
}));

const valueStyles = computed(() => ({
  color: valueColor.value,
  fontSize: '12px',
  marginTop: '4px',
  textAlign: 'right',
}));
</script>
