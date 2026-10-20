<template>
  <div class="border-b border-gray-100">
    <button
      @click="isOpen = !isOpen"
      class="w-full px-3 py-2 flex items-center gap-2 hover:bg-gray-50 transition-colors text-left"
    >
      <span class="text-xs">{{ icon }}</span>
      <span class="text-xs font-medium text-gray-700 flex-1">{{ title }}</span>
      <svg
        class="w-3 h-3 text-gray-400 transition-transform"
        :class="{ 'rotate-180': isOpen }"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>
    <div v-if="isOpen" class="px-3 pb-3">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

interface Props {
  title: string;
  icon?: string;
  defaultOpen?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  icon: '',
  defaultOpen: false,
});

const isOpen = ref(props.defaultOpen);
</script>
