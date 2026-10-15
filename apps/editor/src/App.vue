<template>
  <router-view />
  <TemplateModal ref="templateModal" />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import TemplateModal from './components/TemplateModal.vue';

const templateModal = ref<InstanceType<typeof TemplateModal> | null>(null);
</script>
