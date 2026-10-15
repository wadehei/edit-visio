<template>
  <div class="space-y-1">
    <div
      v-for="component in components"
      :key="component.id"
    >
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
          @click.stop="deleteComponent(component.id)"
          class="text-red-500 hover:text-red-700 text-xs"
          title="删除"
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
import { useEditorStore } from '../stores/editorStore';

interface Props {
  components: ComponentSchema[];
  depth: number;
}

defineProps<Props>();

const { selectedId, setSelectedId, deleteComponent } = useEditorStore();

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
