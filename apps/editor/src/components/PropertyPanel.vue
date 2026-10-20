<template>
  <!-- 组件属性编辑 -->
  <div
    v-if="selectedComponent"
    class="w-80 bg-white border-l border-gray-200 flex flex-col"
  >
    <div class="p-3 border-b border-gray-200 flex items-center justify-between">
      <div>
        <h2 class="text-sm font-semibold text-gray-800">属性配置</h2>
        <p class="text-[11px] text-gray-400 mt-0.5">{{ componentMeta?.label || selectedComponent.type }}</p>
      </div>
      <span class="text-[10px] text-gray-300 font-mono">{{ selectedComponent.id.slice(0, 8) }}</span>
    </div>

    <div class="flex-1 overflow-y-auto">
      <!-- 组件属性 -->
      <ComponentPropsPanel
        v-if="componentMeta?.propDefinitions?.length"
        :component-meta="componentMeta!"
        :component-props="selectedComponent.props"
        @prop-change="handlePropChange"
      />

      <!-- 样式面板 -->
      <StylePanel
        :styles="styles"
        :is-container="isContainerType(selectedComponent.type)"
        @style-change="handleStyleChange"
      />
    </div>
  </div>

  <!-- 页面配置 -->
  <PageConfigPanel
    v-else
    :page="page"
    @page-change="handlePageNameChange"
    @page-prop-change="handlePagePropChange"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useEditorStore } from '../stores/editorStore';
import { getMeta, isContainerType } from '../registry/componentRegistry';
import type { ComponentMeta } from '@page-builder/shared';
import ComponentPropsPanel from './property-panel/ComponentPropsPanel.vue';
import StylePanel from './property-panel/StylePanel.vue';
import PageConfigPanel from './property-panel/PageConfigPanel.vue';

const { page, selectedId, updateComponent, setPage, getComponentById } = useEditorStore();

const selectedComponent = computed(() =>
  selectedId.value ? getComponentById(selectedId.value) ?? null : null
);

const componentMeta = computed<ComponentMeta | null>(() => {
  if (!selectedComponent.value) return null;
  return getMeta(selectedComponent.value.type) || null;
});

const styles = computed(() => selectedComponent.value?.styles || {});

const handlePropChange = (propName: string, value: unknown) => {
  if (!selectedComponent.value) return;
  updateComponent(selectedComponent.value.id, {
    props: {
      ...selectedComponent.value.props,
      [propName]: value,
    },
  });
};

const handleStyleChange = (styleName: string, value: string) => {
  if (!selectedComponent.value) return;
  updateComponent(selectedComponent.value.id, {
    styles: {
      ...selectedComponent.value.styles,
      [styleName]: value || undefined,
    },
  });
};

const handlePageNameChange = (_field: 'name', value: string) => {
  setPage({ ...page.value, name: value });
};

const handlePagePropChange = (field: string, value: string | undefined) => {
  setPage({
    ...page.value,
    props: { ...page.value.props, [field]: value },
  });
};
</script>
