<template>
  <div>
    <label class="block text-[10px] text-gray-400 mb-0.5">{{ label }}</label>
    <input
      type="text"
      :value="value"
      :placeholder="placeholder"
      @input="$emit('change', ($event.target as HTMLInputElement).value)"
      class="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
    />
  </div>
</template>

<script setup lang="ts">
interface Props {
  label: string;
  value?: string;
  placeholder?: string;
}

defineProps<Props>();
defineEmits<{
  (e: 'change', value: string): void;
}>();
</script>
