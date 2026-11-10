<template>
  <div
    class="relative group transition-all duration-200"
    :class="{
      'ring-2 ring-blue-500 shadow-md': isSelected && !component.locked,
      'ring-1 ring-blue-300': isHovered && !isSelected && !component.locked,
      'opacity-30': component.visible === false,
      'cursor-not-allowed': component.locked,
      'ring-2 ring-blue-400 ring-offset-1': dragOverPosition === 'inside' && isContainer,
    }"
    :draggable="!component.locked"
    @dragstart="handleDragStart"
    @dragover.prevent="handleDragOver"
    @dragleave="handleDragLeave"
    @drop.stop="handleDrop"
    @dragend="handleDragEnd"
    @click.stop="handleClick"
    @mouseenter.stop="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    @contextmenu.prevent="$emit('contextmenu', $event)"
  >
    <!-- 上方插入指示线 -->
    <div
      v-if="dragOverPosition === 'above'"
      class="absolute -top-1 left-0 right-0 h-0.5 bg-blue-500 z-20 rounded-full"
    >
      <div class="absolute -left-1 -top-1 w-2 h-2 bg-blue-500 rounded-full"></div>
    </div>

    <!-- 下方插入指示线 -->
    <div
      v-if="dragOverPosition === 'below'"
      class="absolute -bottom-1 left-0 right-0 h-0.5 bg-blue-500 z-20 rounded-full"
    >
      <div class="absolute -left-1 -bottom-1 w-2 h-2 bg-blue-500 rounded-full"></div>
    </div>

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

    <component :is="Component" v-if="Component" :schema="component">
      <template v-if="isContainer">
        <div v-if="component.children && component.children.length > 0" class="space-y-2">
          <CanvasComponent
            v-for="(child, childIndex) in component.children"
            :key="child.id"
            :component="child"
            :is-selected="selectedId === child.id"
            :parent-id="component.id"
            :index="childIndex"
            @contextmenu="(e) => $emit('contextmenu', e)"
          />
        </div>
        <div
          v-else
          class="flex flex-col items-center justify-center p-8 text-gray-400 text-xs border-2 border-dashed border-gray-300 rounded transition-colors hover:border-blue-400 hover:bg-blue-50"
          :class="{
            'border-blue-400 bg-blue-50': dragOverPosition === 'inside',
          }"
          @dragover.prevent
          @drop.stop="handleDrop"
        >
          <svg class="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          <span>拖拽组件到此处</span>
        </div>
      </template>
    </component>
    <div v-else class="p-4 bg-red-100 text-red-600 text-sm">未知组件: {{ component.type }}</div>

    <!-- 操作按钮 -->
    <Transition name="fade">
      <div v-if="isSelected" class="absolute -top-6 right-0 flex gap-1 z-20">
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
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import type { ComponentSchema } from '@page-builder/shared';
import {
  getComponentLabel,
  duplicateComponentTree,
  findComponentParentAndIndex,
} from '@page-builder/shared';
import { useEditorStore } from '../stores/editorStore';
import { getComponent, getMeta, isContainerType } from '../registry/componentRegistry';

interface Props {
  component: ComponentSchema;
  isSelected: boolean;
  parentId?: string;
  index?: number;
}

const props = withDefaults(defineProps<Props>(), {
  parentId: 'root',
  index: 0,
});

defineEmits<{
  (e: 'contextmenu', event: MouseEvent): void;
}>();

const editorStore = useEditorStore();
// state：必须用 storeToRefs 保持响应性
const { hoveredId, selectedId, draggedComponentId, draggedComponentType } =
  storeToRefs(editorStore);
// action：是稳定函数，直接从 store 实例解构
const {
  setSelectedId,
  setHoveredId,
  toggleSelection,
  deleteComponent,
  insertComponentTree,
  addComponent,
  moveComponent,
  setDraggedComponentId,
  clearDragState,
} = editorStore;

const Component = computed(() => getComponent(props.component.type));
const isContainer = computed(() => isContainerType(props.component.type));
const isHovered = computed(() => hoveredId.value === props.component.id);

type DropPosition = 'above' | 'below' | 'inside' | null;
const dragOverPosition = ref<DropPosition>(null);

/**
 * 拖拽结束时统一清除所有组件的落点指示状态
 * （dragend 只在源组件上触发，目标组件的 dragOverPosition 需通过全局状态清除
 */
watch([draggedComponentId, draggedComponentType], ([id, type]) => {
  if (!id && !type) {
    dragOverPosition.value = null;
  }
});

const handleClick = (e: MouseEvent) => {
  if (props.component.locked) return;
  if (e.shiftKey) {
    toggleSelection(props.component.id);
  } else {
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
  insertComponentTree(newComponent, props.parentId, props.index + 1);
};

/**
 * 拖拽开始：标记当前组件被拖动
 */
const handleDragStart = (e: DragEvent) => {
  if (props.component.locked) {
    e.preventDefault();
    return;
  }
  setDraggedComponentId(props.component.id);
  if (e.dataTransfer) {
    e.dataTransfer.setData('componentId', props.component.id);
    e.dataTransfer.effectAllowed = 'move';
  }
};

/**
 * 拖拽悬停：根据鼠标位置判断落点（上方/下方/容器内部）
 */
const handleDragOver = (e: DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = draggedComponentId.value ? 'move' : 'copy';
  }

  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  const y = e.clientY - rect.top;
  const h = rect.height;

  if (isContainer.value) {
    // 容器：上下边缘为上方/下方插入，中间区域为放入容器内部
    const edge = Math.min(12, h * 0.15);
    if (y < edge) {
      dragOverPosition.value = 'above';
    } else if (y > h - edge) {
      dragOverPosition.value = 'below';
    } else {
      dragOverPosition.value = 'inside';
    }
  } else {
    // 非容器：上下半分
    dragOverPosition.value = y < h / 2 ? 'above' : 'below';
  }
};

const handleDragLeave = (e: DragEvent) => {
  // 仅当鼠标真正离开当前元素时才清除（避免子元素触发的 dragleave 误清除
  const related = e.relatedTarget as Node | null;
  if (related && (e.currentTarget as HTMLElement).contains(related)) {
    return;
  }
  dragOverPosition.value = null;
};

/**
 * 释放：根据落点位置执行插入或移动
 */
const handleDrop = (e: DragEvent) => {
  e.preventDefault();
  e.stopPropagation();

  const position = dragOverPosition.value;
  dragOverPosition.value = null;

  if (!position) return;

  // 计算目标父级与最终索引
  // targetIndex 语义：组件在最终数组中的期望位置
  let targetParentId: string;
  let targetIndex: number;

  if (position === 'inside' && isContainer.value) {
    targetParentId = props.component.id;
    targetIndex = props.component.children?.length || 0;
  } else {
    targetParentId = props.parentId;
    const targetCompIndex = props.index;

    if (draggedComponentId.value) {
      // 已有组件移动：需考虑源组件删除后目标索引的偏移
      // 若源与目标在同一父级且源在目标之前，删除源会使目标索引左移 1 位
      const sourcePos = findComponentParentAndIndex(
        editorStore.page.children,
        draggedComponentId.value,
      );
      const sourceBeforeTarget =
        sourcePos && sourcePos.parentId === targetParentId && sourcePos.index < targetCompIndex;

      if (position === 'above') {
        targetIndex = sourceBeforeTarget ? targetCompIndex - 1 : targetCompIndex;
      } else {
        // 'below'
        targetIndex = sourceBeforeTarget ? targetCompIndex : targetCompIndex + 1;
      }
    } else {
      // 新组件添加：不涉及删除，直接用目标位置
      targetIndex = position === 'above' ? targetCompIndex : targetCompIndex + 1;
    }
  }

  // 已有组件：移动
  if (draggedComponentId.value) {
    // 防止移动到自身位置不处理（moveComponent 内部已做后代防护）
    if (draggedComponentId.value !== props.component.id || position !== 'inside') {
      moveComponent(draggedComponentId.value, targetParentId, targetIndex);
    }
    clearDragState();
    return;
  }

  // 新组件：添加
  const componentType = draggedComponentType.value || e.dataTransfer?.getData('componentType');
  if (componentType) {
    const meta = getMeta(componentType);
    addComponent(
      componentType,
      targetParentId,
      targetIndex,
      meta?.defaultProps || {},
      meta?.defaultStyles || {},
    );
    clearDragState();
  }
};

const handleDragEnd = () => {
  dragOverPosition.value = null;
  clearDragState();
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
