<template>
  <div :style="countdownStyles">
    <div class="flex items-center justify-center gap-2">
      <div v-for="(unit, index) in timeUnits" :key="index" class="flex items-center gap-2">
        <div class="flex flex-col items-center">
          <div
            :style="numberStyles"
            class="flex items-center justify-center font-bold"
          >
            {{ unit.value }}
          </div>
          <div class="text-xs mt-1" :style="labelStyles">
            {{ unit.label }}
          </div>
        </div>
        <span v-if="index < timeUnits.length - 1" :style="separatorStyles">:</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import type { ComponentSchema } from '@page-builder/shared';

interface Props {
  schema: ComponentSchema;
}

const props = defineProps<Props>();

interface CountdownProps {
  targetDate: string;
  backgroundColor?: string;
  numberColor?: string;
  numberSize?: string;
  numberBg?: string;
  labelColor?: string;
  separatorColor?: string;
  padding?: string;
  borderRadius?: string;
}

const countdownProps = computed(() => props.schema.props as CountdownProps);

const targetDate = computed(() => new Date(countdownProps.value.targetDate || Date.now() + 86400000));
const backgroundColor = computed(() => countdownProps.value.backgroundColor || '#f3f4f6');
const numberColor = computed(() => countdownProps.value.numberColor || '#ffffff');
const numberSize = computed(() => countdownProps.value.numberSize || '24px');
const numberBg = computed(() => countdownProps.value.numberBg || '#3b82f6');
const labelColor = computed(() => countdownProps.value.labelColor || '#6b7280');
const separatorColor = computed(() => countdownProps.value.separatorColor || '#6b7280');
const padding = computed(() => countdownProps.value.padding || '16px');
const borderRadius = computed(() => countdownProps.value.borderRadius || '8px');

const remainingTime = ref({
  days: 0,
  hours: 0,
  minutes: 0,
  seconds: 0,
});

let timer: ReturnType<typeof setInterval> | null = null;

const timeUnits = computed(() => [
  { value: remainingTime.value.days.toString().padStart(2, '0'), label: '天' },
  { value: remainingTime.value.hours.toString().padStart(2, '0'), label: '时' },
  { value: remainingTime.value.minutes.toString().padStart(2, '0'), label: '分' },
  { value: remainingTime.value.seconds.toString().padStart(2, '0'), label: '秒' },
]);

const countdownStyles = computed(() => ({
  backgroundColor: backgroundColor.value,
  padding: padding.value,
  borderRadius: borderRadius.value,
  ...props.schema.styles,
}));

const numberStyles = computed(() => ({
  color: numberColor.value,
  fontSize: numberSize.value,
  backgroundColor: numberBg.value,
  width: '48px',
  height: '48px',
  borderRadius: '6px',
}));

const labelStyles = computed(() => ({
  color: labelColor.value,
}));

const separatorStyles = computed(() => ({
  color: separatorColor.value,
  fontSize: numberSize.value,
  fontWeight: 'bold',
}));

const updateCountdown = () => {
  const now = new Date().getTime();
  const distance = targetDate.value.getTime() - now;

  if (distance < 0) {
    remainingTime.value = { days: 0, hours: 0, minutes: 0, seconds: 0 };
    if (timer) clearInterval(timer);
    return;
  }

  remainingTime.value = {
    days: Math.floor(distance / (1000 * 60 * 60 * 24)),
    hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((distance % (1000 * 60)) / 1000),
  };
};

onMounted(() => {
  updateCountdown();
  timer = setInterval(updateCountdown, 1000);
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
});
</script>
