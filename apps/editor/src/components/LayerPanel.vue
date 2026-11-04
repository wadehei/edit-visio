<template>
  <div class="space-y-1">
    <div v-if="page.children.length === 0" class="text-gray-400 text-xs text-center py-4">
      暂无组件
    </div>
    <div v-for="component in page.children" :key="component.id">
      <div
        class="flex items-center px-2 py-1 rounded cursor-pointer hover:bg-gray-100 group"
        :class="{
          'bg-blue-50 text-blue-600': selectedId === component.id,
          'opacity-50': component.visible === false,
        }"
        @click="setSelectedId(component.id)"
      >
        <span class="text-xs flex-1 truncate">
          {{ component.locked ? '🔒 ' : '' }}{{ getComponentLabel(component) }}
        </span>
        <!-- 可见性切换 -->
        <button
          class="text-gray-400 hover:text-gray-600 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
          :title="component.visible === false ? '显示' : '隐藏'"
          @click.stop="toggleVisibility(component.id, component.visible)"
        >
          {{ component.visible === false ? '👁️‍🗨️' : '👁️' }}
        </button>
        <!-- 锁定切换 -->
        <button
          class="text-gray-400 hover:text-gray-600 text-xs opacity-0 group-hover:opacity-100 transition-opacity ml-1"
          :title="component.locked ? '解锁' : '锁定'"
          @click.stop="toggleLock(component.id, component.locked)"
        >
          {{ component.locked ? '🔓' : '🔒' }}
        </button>
        <button
          class="text-red-500 hover:text-red-700 text-xs opacity-0 group-hover:opacity-100 transition-opacity ml-1"
          title="删除"
          @click.stop="deleteComponent(component.id)"
        >
          ×
        </button>
      </div>
      <!-- 递归渲染子组件 -->
      <div v-if="component.children && component.children.length > 0" class="ml-4 mt-1">
        <LayerTreeItem :components="component.children" :depth="1" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useEditorStore } from '../stores/editorStore';
import { getComponentLabel } from '@page-builder/shared';

const editorStore = useEditorStore();
// state：必须用 storeToRefs 保持响应性
const { page, selectedId } = storeToRefs(editorStore);
// action：是稳定函数，直接从 store 实例解构
const { setSelectedId, deleteComponent, updateComponent } = editorStore;

const toggleVisibility = (id: string, currentVisible: boolean | undefined) => {
  updateComponent(id, { visible: currentVisible === false ? true : false });
};

const toggleLock = (id: string, currentLocked: boolean | undefined) => {
  updateComponent(id, { locked: !currentLocked });
};
</script>
