<template>
  <div class="space-y-1">
    <div v-for="component in components" :key="component.id">
      <div
        class="flex items-center px-2 py-1 rounded cursor-pointer hover:bg-gray-100"
        :class="{ 'bg-blue-50 text-blue-600': selectedId === component.id }"
        :style="{ paddingLeft: `${depth * 12 + 8}px` }"
        @click="setSelectedId(component.id)"
      >
        <span class="text-xs flex-1 truncate">
          {{ getComponentLabel(component) }}
        </span>
        <button
          class="text-red-500 hover:text-red-700 text-xs"
          title="删除"
          @click.stop="deleteComponent(component.id)"
        >
          ×
        </button>
      </div>
      <LayerTreeItem
        v-if="component.children && component.children.length > 0"
        :components="component.children"
        :depth="depth + 1"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ComponentSchema } from '@page-builder/shared';
import { getComponentLabel } from '@page-builder/shared';
import { storeToRefs } from 'pinia';
import { useEditorStore } from '../stores/editorStore';

interface Props {
  components: ComponentSchema[];
  depth: number;
}

defineProps<Props>();

const editorStore = useEditorStore();
// state：必须用 storeToRefs 保持响应性
const { selectedId } = storeToRefs(editorStore);
// action：是稳定函数，直接从 store 实例解构
const { setSelectedId, deleteComponent } = editorStore;
</script>
