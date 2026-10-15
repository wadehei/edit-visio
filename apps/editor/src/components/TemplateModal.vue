<template>
  <div
    v-if="showModal"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    @click.self="closeModal"
  >
    <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
      <div class="p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 class="text-lg font-semibold text-gray-800">选择模板</h2>
        <button @click="closeModal" class="text-gray-400 hover:text-gray-600">
          ×
        </button>
      </div>
      <div class="flex-1 overflow-y-auto p-4">
        <div class="grid grid-cols-2 gap-4">
          <div
            v-for="template in templates"
            :key="template.id"
            class="border border-gray-200 rounded-lg p-4 hover:border-blue-500 hover:shadow-md cursor-pointer transition-all"
            @click="selectTemplate(template.id)"
          >
            <h3 class="font-medium text-gray-800 mb-2">{{ template.name }}</h3>
            <p class="text-sm text-gray-500">{{ template.description }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useTemplates } from '../composables/useAutoSave';

const { templates, applyTemplate } = useTemplates();

const showModal = ref(false);

const openModal = () => {
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
};

const selectTemplate = (templateId: string) => {
  if (confirm('应用模板会覆盖当前页面内容，确定继续吗？')) {
    applyTemplate(templateId);
    closeModal();
  }
};

defineExpose({ openModal });
</script>
