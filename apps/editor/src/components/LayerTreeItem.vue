<template>
  <div class="space-y-1">
    <div
      v-for="component in components"
      :key="component.id"
      :draggable="renamingId !== component.id"
      @dragstart="handleDragStart($event, component)"
      @dragover.prevent="handleDragOver($event, component)"
      @drop.stop.prevent="handleDrop(component)"
      @dragend="handleDragEnd"
    >
      <div
        class="flex items-center px-2 py-1 rounded cursor-pointer hover:bg-gray-100 group"
        :class="[
          {
            'bg-blue-50 text-blue-600': selectedId === component.id,
            'opacity-50': component.visible === false,
            'border-t-2 border-blue-400': isDropTarget(component.id, 'before'),
            'border-b-2 border-blue-400': isDropTarget(component.id, 'after'),
            'bg-blue-50/60': isDropTarget(component.id, 'inside'),
          },
        ]"
        :style="{ paddingLeft: `${depth * 12 + 8}px` }"
        @click="handleRowClick($event, component.id)"
        @dblclick.stop="startRename(component)"
      >
        <input
          v-if="renamingId === component.id"
          :ref="(el) => registerRenameInput(el)"
          v-model="renameValue"
          class="text-xs flex-1 min-w-0 px-1 py-0.5 border border-blue-400 rounded outline-none bg-white text-gray-800"
          @click.stop
          @keyup.enter="commitRename(component.id)"
          @keyup.esc="cancelRename"
          @blur="commitRename(component.id)"
        />
        <span v-else class="text-xs flex-1 flex items-center gap-1 min-w-0">
          <Lock v-if="component.locked" :size="10" class="text-amber-500 shrink-0" />
          <span class="truncate">{{ getComponentLabel(component) }}</span>
        </span>
        <!-- 可见性切换 -->
        <button
          class="text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          :title="component.visible === false ? '显示' : '隐藏'"
          @click.stop="toggleVisibility(component.id, component.visible)"
        >
          <component :is="component.visible === false ? EyeOff : Eye" :size="12" />
        </button>
        <!-- 锁定切换 -->
        <button
          class="text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity ml-1 shrink-0"
          :title="component.locked ? '解锁' : '锁定'"
          @click.stop="toggleLock(component.id, component.locked)"
        >
          <component :is="component.locked ? Unlock : Lock" :size="12" />
        </button>
        <button
          class="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity ml-1 shrink-0"
          title="删除"
          @click.stop="deleteComponent(component.id)"
        >
          <Trash2 :size="12" />
        </button>
      </div>
      <LayerTreeItem
        v-if="component.children && component.children.length > 0"
        :components="component.children"
        :depth="depth + 1"
        :parent-id="component.id"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Eye, EyeOff, Lock, Trash2, Unlock } from 'lucide-vue-next';
import type { ComponentSchema } from '@page-builder/shared';
import { getComponentLabel } from '@page-builder/shared';
import { storeToRefs } from 'pinia';
import { useEditorStore } from '../stores/editorStore';
import { isContainerType } from '../registry/componentRegistry';

interface Props {
  components: ComponentSchema[];
  depth: number;
  /** 本层组件的父级 ID（顶层为 root），拖拽换位时用于定位目标父级 */
  parentId?: string;
}

const props = withDefaults(defineProps<Props>(), { parentId: 'root' });

const editorStore = useEditorStore();
// state：必须用 storeToRefs 保持响应性
const { selectedId, draggedComponentId } = storeToRefs(editorStore);
// action：是稳定函数，直接从 store 实例解构
const {
  setSelectedId,
  toggleSelection,
  deleteComponent,
  updateComponent,
  moveComponent,
  setDraggedComponentId,
} = editorStore;

const toggleVisibility = (id: string, currentVisible: boolean | undefined) => {
  updateComponent(id, { visible: currentVisible === false ? true : false });
};

const toggleLock = (id: string, currentLocked: boolean | undefined) => {
  updateComponent(id, { locked: !currentLocked });
};

/** 点击行切换选中，Shift 点击追加/移出多选 */
const handleRowClick = (event: MouseEvent, id: string) => {
  if (renamingId.value === id) return;
  if (event.shiftKey) {
    toggleSelection(id);
  } else {
    setSelectedId(id);
  }
};

// ========== 拖拽排序 ==========
type DropPosition = 'before' | 'after' | 'inside';
const dropTarget = ref<{ id: string; position: DropPosition } | null>(null);

const isDropTarget = (id: string, position: DropPosition) =>
  dropTarget.value?.id === id && dropTarget.value.position === position;

const handleDragStart = (event: DragEvent, component: ComponentSchema) => {
  setDraggedComponentId(component.id);
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', component.id);
  }
};

const handleDragOver = (event: DragEvent, component: ComponentSchema) => {
  const sourceId = draggedComponentId.value;
  if (!sourceId || sourceId === component.id) {
    dropTarget.value = null;
    return;
  }
  const el = event.currentTarget as HTMLElement;
  const rect = el.getBoundingClientRect();
  const ratio = rect.height > 0 ? (event.clientY - rect.top) / rect.height : 0.5;
  let position: DropPosition = ratio < 0.5 ? 'before' : 'after';
  // 容器组件中部区域：作为「放入容器内部」处理
  if (isContainerType(component.type) && ratio >= 0.25 && ratio <= 0.75) {
    position = 'inside';
  }
  dropTarget.value = { id: component.id, position };
};

const handleDrop = (component: ComponentSchema) => {
  const sourceId = draggedComponentId.value;
  const target = dropTarget.value;
  dropTarget.value = null;
  setDraggedComponentId(null);
  if (!sourceId || !target || target.id !== component.id) return;

  if (target.position === 'inside') {
    // 追加到容器子级末尾
    moveComponent(sourceId, component.id, component.children?.length ?? 0);
    return;
  }

  const targetIndex = props.components.findIndex((c) => c.id === component.id);
  if (targetIndex === -1) return;
  let index = target.position === 'after' ? targetIndex + 1 : targetIndex;
  // 源与目标同属一个父级：移除源后其后的索引整体前移一位
  const sourceIndex = props.components.findIndex((c) => c.id === sourceId);
  if (sourceIndex !== -1 && sourceIndex < index) index -= 1;
  moveComponent(sourceId, props.parentId, index);
};

const handleDragEnd = () => {
  dropTarget.value = null;
  setDraggedComponentId(null);
};

// ========== 双击重命名 ==========
const renamingId = ref<string | null>(null);
const renameValue = ref('');

/** 函数式 ref：输入框挂载后自动聚焦并全选，便于直接输入替换 */
const registerRenameInput = (el: unknown) => {
  if (el instanceof HTMLInputElement) {
    el.focus();
    el.select();
  }
};

const startRename = (component: ComponentSchema) => {
  renamingId.value = component.id;
  renameValue.value = component.name || getComponentLabel(component);
};

const commitRename = (id: string) => {
  if (renamingId.value !== id) return;
  const name = renameValue.value.trim();
  // 置空则清除自定义名称，回退到默认类型标签
  updateComponent(id, { name: name || undefined });
  renamingId.value = null;
};

const cancelRename = () => {
  renamingId.value = null;
};
</script>
