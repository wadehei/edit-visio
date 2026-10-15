<template>
  <div class="space-y-1">
    <div v-if="page.children.length === 0" class="text-gray-400 text-xs text-center py-4">
      暂无组件
    </div>
    <div
      v-for="component in page.children"
      :key="component.id"
    >
      <div
        class="flex items-center px-2 py-1 rounded cursor-pointer hover:bg-gray-100"
        :class="{ 'bg-blue-50 text-blue-600': selectedId === component.id }"
        @click="setSelectedId(component.id)"
      >
        <span class="text-xs flex-1 truncate">
          {{ getComponentLabel(component) }}
        </span>
        <button
          @click.stop="deleteComponent(component.id)"
          class="text-red-500 hover:text-red-700 text-xs"
          title="删除"
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
import { useEditorStore } from '../stores/editorStore';
import type { ComponentSchema } from '@page-builder/shared';

const { page, selectedId, setSelectedId, deleteComponent } = useEditorStore();

const getComponentLabel = (component: ComponentSchema) => {
  const labels: Record<string, string> = {
    text: '📝 文本',
    button: '🔘 按钮',
    image: '🖼️ 图片',
    container: '📦 容器',
    divider: '➖ 分割线',
    spacer: '↕️ 间距',
    card: '🎴 卡片',
    badge: '🏷️ 徽章',
    richText: '📄 富文本',
    input: '⌨️ 输入框',
  };
  return labels[component.type] || component.type;
};
</script>
