<template>
  <div class="flex-1 overflow-auto bg-gray-100 p-8 relative">
    <!-- 设备切换器 -->
    <DeviceSwitcher />

    <!-- 缩放控制 -->
    <div class="absolute top-4 left-4 z-30 bg-white rounded-lg shadow-lg p-2 flex gap-2 items-center">
      <button
        @click="zoomOut"
        class="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded"
        title="缩小"
      >
        −
      </button>
      <span class="text-sm text-gray-700 min-w-[50px] text-center">
        {{ Math.round(canvasScale * 100) }}%
      </span>
      <button
        @click="zoomIn"
        class="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded"
        title="放大"
      >
        +
      </button>
      <button
        @click="resetZoom"
        class="px-2 py-1 text-xs hover:bg-gray-100 rounded"
        title="重置"
      >
        重置
      </button>
      <div class="w-px h-6 bg-gray-300" />
      <button
        @click="toggleGrid"
        class="px-2 py-1 text-xs hover:bg-gray-100 rounded"
        :class="{ 'bg-blue-100 text-blue-600': showGrid }"
        title="显示网格"
      >
        网格
      </button>
      <button
        @click="toggleSnapToGrid"
        class="px-2 py-1 text-xs hover:bg-gray-100 rounded"
        :class="{ 'bg-blue-100 text-blue-600': snapToGrid }"
        title="吸附网格"
      >
        吸附
      </button>
    </div>

    <!-- 画布容器 -->
    <div
      class="flex items-start justify-center pt-16 min-h-full"
      :style="{
        transform: `scale(${canvasScale}) translate(${canvasOffset.x}px, ${canvasOffset.y}px)`,
        transformOrigin: 'top center',
      }"
    >
      <div
        class="bg-white shadow-lg rounded-lg overflow-hidden transition-all duration-300 relative"
        :style="canvasStyles"
        @click="handleCanvasClick"
        @dragover.prevent="handleDragOver"
        @drop="handleDrop"
      >
        <!-- 网格背景 -->
        <div
          v-if="showGrid"
          class="absolute inset-0 pointer-events-none"
          :style="{
            backgroundImage: `linear-gradient(to right, #e5e7eb 1px, transparent 1px),
                              linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)`,
            backgroundSize: `${gridSize}px ${gridSize}px`,
          }"
        />

        <div class="p-4 min-h-[600px] relative">
          <Transition name="fade">
            <div
              v-if="page.children.length === 0"
              class="flex flex-col items-center justify-center h-64 text-gray-400"
            >
              <svg class="w-16 h-16 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p class="text-sm">从左侧拖拽组件到此处</p>
              <p class="text-xs mt-2 text-gray-300">或使用模板快速开始</p>
            </div>
          </Transition>

          <div v-if="page.children.length > 0" class="space-y-2">
            <TransitionGroup name="list">
              <div
                v-for="(component, index) in page.children"
                :key="component.id"
                class="relative group"
                draggable="true"
                @dragstart="handleComponentDragStart($event, component.id)"
                @dragover.prevent="handleComponentDragOver($event, index)"
                @drop.stop="handleComponentDrop($event, index)"
                @dragend="handleComponentDragEnd"
                @contextmenu.prevent="handleContextMenu($event, component.id)"
              >
                <div
                  v-if="dragOverIndex === index && draggedComponentId"
                  class="absolute -top-1 left-0 right-0 h-0.5 bg-blue-500 z-10"
                >
                  <div class="absolute -left-1 -top-1 w-2 h-2 bg-blue-500 rounded-full"></div>
                </div>

                <CanvasComponent
                  :component="component"
                  :is-selected="selectedId === component.id"
                />
              </div>
            </TransitionGroup>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 右键菜单 -->
  <ContextMenu ref="contextMenuRef" />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useEditorStore } from '../stores/editorStore';
import { useDevicePreview } from '../composables/useDevicePreview';
import CanvasComponent from './CanvasComponent.vue';
import DeviceSwitcher from './DeviceSwitcher.vue';
import ContextMenu from './ContextMenu.vue';
import { getMeta } from '../registry/componentRegistry';

const {
  page, selectedId, setSelectedId, addComponent, moveComponent, setDragging,
  canvasScale, canvasOffset, showGrid, snapToGrid, gridSize,
  setCanvasScale, setCanvasOffset, toggleGrid, toggleSnapToGrid,
} = useEditorStore();

const { currentDeviceConfig } = useDevicePreview();

const draggedComponentId = ref<string | null>(null);
const dragOverIndex = ref<number | null>(null);
const contextMenuRef = ref<InstanceType<typeof ContextMenu> | null>(null);

const handleContextMenu = (e: MouseEvent, componentId: string) => {
  contextMenuRef.value?.show(e, componentId);
};

const canvasStyles = computed(() => ({
  width: `${currentDeviceConfig.value.width}px`,
  minHeight: `${currentDeviceConfig.value.height}px`,
  backgroundColor: page.value.props.backgroundColor,
  backgroundImage: page.value.props.backgroundImage
    ? `url(${page.value.props.backgroundImage})`
    : undefined,
}));

const zoomIn = () => {
  setCanvasScale(canvasScale.value + 0.1);
};

const zoomOut = () => {
  setCanvasScale(canvasScale.value - 0.1);
};

const resetZoom = () => {
  setCanvasScale(1);
  setCanvasOffset(0, 0);
};

const handleCanvasClick = (e: MouseEvent) => {
  if (e.target === e.currentTarget) {
    setSelectedId(null);
  }
};

const handleDragOver = (e: DragEvent) => {
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'copy';
  }
};

const handleDrop = (e: DragEvent) => {
  e.preventDefault();
  const componentType = e.dataTransfer?.getData('componentType');

  if (componentType) {
    const meta = getMeta(componentType);
    const index = page.value.children.length;
    addComponent(
      componentType,
      'root',
      index,
      (meta?.defaultProps as Record<string, unknown>) || {},
      (meta?.defaultStyles as Record<string, string>) || {},
    );
    setDragging(false);
  }
};

const handleComponentDragStart = (e: DragEvent, componentId: string) => {
  draggedComponentId.value = componentId;
  if (e.dataTransfer) {
    e.dataTransfer.setData('componentId', componentId);
    e.dataTransfer.effectAllowed = 'move';
  }
};

const handleComponentDragOver = (e: DragEvent, index: number) => {
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'move';
  }
  dragOverIndex.value = index;
};

const handleComponentDrop = (e: DragEvent, targetIndex: number) => {
  e.preventDefault();
  e.stopPropagation();

  if (draggedComponentId.value) {
    moveComponent(draggedComponentId.value, 'root', targetIndex);
    draggedComponentId.value = null;
    dragOverIndex.value = null;
  }
};

const handleComponentDragEnd = () => {
  draggedComponentId.value = null;
  dragOverIndex.value = null;
};
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}

.list-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.list-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

.list-move {
  transition: transform 0.3s ease;
}
</style>
