<template>
  <div class="flex flex-col h-full bg-gray-50">
    <Toolbar @open-template-modal="$emit('openTemplateModal')" />
    <div class="flex flex-1 overflow-hidden">
      <ComponentPanel />
      <Canvas />
      <PropertyPanel />
    </div>
  </div>
</template>

<script setup lang="ts">
import ComponentPanel from './ComponentPanel.vue';
import Canvas from './Canvas.vue';
import PropertyPanel from './PropertyPanel.vue';
import Toolbar from './Toolbar.vue';

defineEmits<{
  (e: 'openTemplateModal'): void;
}>();
</script>
