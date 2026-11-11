<template>
  <div class="space-y-1">
    <div v-if="page.children.length === 0" class="text-gray-400 text-xs text-center py-4">
      暂无组件
    </div>
    <!-- 顶层与子层统一由 LayerTreeItem 渲染，保证可见/锁定/拖拽/重命名能力一致 -->
    <LayerTreeItem v-else :components="page.children" :depth="0" parent-id="root" />
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useEditorStore } from '../stores/editorStore';
import LayerTreeItem from './LayerTreeItem.vue';

const editorStore = useEditorStore();
// state：必须用 storeToRefs 保持响应性
const { page } = storeToRefs(editorStore);
</script>
