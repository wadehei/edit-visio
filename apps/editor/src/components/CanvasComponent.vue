<template>
  <div
    class="relative transition-all duration-200 group"
    :class="{
      'ring-2 ring-blue-500 shadow-md': isSelected && !component.locked,
      'ring-1 ring-blue-300': isHovered && !isSelected && !component.locked,
      'opacity-30': component.visible === false,
      'cursor-not-allowed': component.locked,
    }"
    @click.stop="handleClick"
    @mouseenter.stop="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <!-- 锁定标记 -->
    <div
      v-if="component.locked"
      class="absolute -top-6 right-0 px-1.5 py-0.5 bg-amber-500 text-white text-[10px] rounded-t z-20"
    >
      🔒
    </div>

    <!-- 组件类型标签 -->
    <div
      v-if="(isSelected || isHovered) && !component.locked"
      class="absolute -top-6 left-0 px-2 py-0.5 bg-blue-500 text-white text-xs rounded-t z-20 transition-all"
    >
      {{ getComponentLabel(component) }}
    </div>

    <component
      :is="Component"
      v-if="Component"
      :schema="component"
    >
      <div
        v-if="isContainer && component.children && component.children.length > 0"
        class="space-y-2"
      >
        <CanvasComponent
          v-for="child in component.children"
          :key="child.id"
          :component="child"
          :is-selected="selectedId === child.id"
        />
      </div>
      <div
        v-else-if="isContainer"
        class="flex flex-col items-center justify-center p-8 text-gray-400 text-xs border-2 border-dashed border-gray-300 rounded transition-colors hover:border-blue-400 hover:bg-blue-50"
      >
        <svg class="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        <span>拖拽组件到此处</span>
      </div>
    </component>
    <div v-else class="p-4 bg-red-100 text-red-600 text-sm">
      未知组件: {{ component.type }}
    </div>

    <!-- 操作按钮 -->
    <Transition name="fade">
      <div
        v-if="isSelected"
        class="absolute -top-6 right-0 flex gap-1 z-20"
      >
        <button
          class="w-6 h-6 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center text-xs transition-colors"
          title="复制"
          @click.stop="handleDuplicate"
        >
          ⧉
        </button>
        <button
          class="w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs transition-colors"
          title="删除"
          @click.stop="handleDelete"
        >
          ×
        </button>
      </div>
    </Transition>

    <!-- 容器拖拽区域 -->
    <div
      v-if="isContainer && isSelected"
      class="absolute inset-0 flex items-center justify-center bg-blue-50 bg-opacity-50 rounded transition-opacity"
      @dragover.prevent
      @drop.stop="handleContainerDrop"
    >
      <span class="text-blue-600 text-sm font-medium">释放以添加到容器</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ComponentSchema } from '@page-builder/shared';
import { getComponentLabel, duplicateComponentTree } from '@page-builder/shared';
import { useEditorStore } from '../stores/editorStore';
import { getComponent, getMeta, isContainerType } from '../registry/componentRegistry';

interface Props {
  component: ComponentSchema;
  isSelected: boolean;
}

const props = defineProps<Props>();

const { setSelectedId, setHoveredId, hoveredId, selectedId, toggleSelection, deleteComponent, insertComponentTree, page } = useEditorStore();

const Component = computed(() => getComponent(props.component.type));
const isContainer = computed(() => isContainerType(props.component.type));
const isHovered = computed(() => hoveredId.value === props.component.id);

const handleClick = (e: MouseEvent) => {
  // 锁定的组件不可选中
  if (props.component.locked) return;

  if (e.shiftKey) {
    // Shift+Click: 切换多选
    toggleSelection(props.component.id);
  } else {
    // 普通点击: 单选
    setSelectedId(props.component.id);
  }
};

const handleMouseEnter = () => {
  setHoveredId(props.component.id);
};

const handleMouseLeave = () => {
  setHoveredId(null);
};

const handleDelete = () => {
  if (confirm('确定要删除这个组件吗？')) {
    deleteComponent(props.component.id);
  }
};

const handleDuplicate = () => {
  const newComponent = duplicateComponentTree(props.component);
  const index = page.value.children.findIndex(c => c.id === props.component.id);
  // 使用 insertComponentTree 保留子组件结构（addComponent 会忽略 children）
  insertComponentTree(newComponent, 'root', index + 1);
};

const handleContainerDrop = (e: DragEvent) => {
  e.preventDefault();
  e.stopPropagation();

  const componentType = e.dataTransfer?.getData('componentType');
  if (componentType) {
    const meta = getMeta(componentType);
    const index = props.component.children?.length || 0;
    addComponent(
      componentType,
      props.component.id,
      index,
      (meta?.defaultProps as Record<string, unknown>) || {},
      (meta?.defaultStyles as Record<string, string>) || {},
    );
  }
};
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
