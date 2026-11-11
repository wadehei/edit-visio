<template>
  <div class="border-b border-gray-100">
    <button
      class="w-full px-3 py-2 flex items-center gap-2 hover:bg-gray-50 transition-colors text-left"
      @click="isOpen = !isOpen"
    >
      <component
        :is="icon"
        v-if="icon"
        :size="12"
        class="text-gray-400 shrink-0"
        aria-hidden="true"
      />
      <span class="text-xs font-medium text-gray-700 flex-1">{{ title }}</span>
      <ChevronDown
        :size="12"
        class="text-gray-400 transition-transform shrink-0"
        :class="{ 'rotate-180': isOpen }"
        aria-hidden="true"
      />
    </button>
    <div v-if="isOpen" class="px-3 pb-3">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, type Component } from 'vue';
import { ChevronDown } from 'lucide-vue-next';

interface Props {
  title: string;
  /** 标题图标：统一使用 lucide-vue-next 图标组件 */
  icon?: Component;
  defaultOpen?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  icon: undefined,
  defaultOpen: false,
});

const isOpen = ref(props.defaultOpen);
</script>
