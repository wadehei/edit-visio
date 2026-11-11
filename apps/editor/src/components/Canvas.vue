<template>
  <div class="flex-1 overflow-auto bg-gray-100 p-8 relative">
    <!-- 设备切换器 -->
    <DeviceSwitcher />

    <!-- 缩放控制 -->
    <div
      class="absolute top-4 left-4 z-30 bg-white rounded-lg shadow-lg p-2 flex gap-2 items-center"
    >
      <button
        class="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded"
        title="缩小"
        @click="zoomOut"
      >
        −
      </button>
      <span class="text-sm text-gray-700 min-w-[50px] text-center">
        {{ Math.round(canvasScale * 100) }}%
      </span>
      <button
        class="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded"
        title="放大"
        @click="zoomIn"
      >
        +
      </button>
      <button class="px-2 py-1 text-xs hover:bg-gray-100 rounded" title="重置" @click="resetZoom">
        重置
      </button>
      <div class="w-px h-6 bg-gray-300" />
      <button
        class="px-2 py-1 text-xs hover:bg-gray-100 rounded"
        :class="{ 'bg-blue-100 text-blue-600': showGrid }"
        title="显示网格"
        @click="toggleGrid"
      >
        网格
      </button>
      <button
        class="px-2 py-1 text-xs hover:bg-gray-100 rounded"
        :class="{ 'bg-blue-100 text-blue-600': snapToGrid }"
        title="吸附网格"
        @click="toggleSnapToGrid"
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
        @dragover.prevent="handleCanvasDragOver"
        @drop="handleCanvasDrop"
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
              <div class="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
                <LayoutTemplate :size="30" class="text-gray-300" />
              </div>
              <p class="text-sm text-gray-500 font-medium">从左侧拖拽组件到此处</p>
              <p class="text-xs mt-2 text-gray-300">或点击工具栏「使用模板」快速开始</p>
              <div class="flex items-center gap-4 mt-5 text-[11px] text-gray-400">
                <span class="flex items-center gap-1">
                  <MousePointerClick :size="12" />
                  拖拽添加
                </span>
                <span class="flex items-center gap-1">
                  <Layers :size="12" />
                  图层调整
                </span>
                <span class="flex items-center gap-1">
                  <Eye :size="12" />
                  实时预览
                </span>
              </div>
            </div>
          </Transition>

          <div v-if="page.children.length > 0" class="space-y-2">
            <TransitionGroup name="list">
              <CanvasComponent
                v-for="(component, index) in page.children"
                :key="component.id"
                :component="component"
                :is-selected="selectedId === component.id"
                :parent-id="'root'"
                :index="index"
                @contextmenu="(e) => handleContextMenu(e, component.id)"
              />
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
import { storeToRefs } from 'pinia';
import { Eye, Layers, LayoutTemplate, MousePointerClick } from 'lucide-vue-next';
import { useEditorStore } from '../stores/editorStore';
import { useDevicePreview } from '../composables/useDevicePreview';
import CanvasComponent from './CanvasComponent.vue';
import DeviceSwitcher from './DeviceSwitcher.vue';
import ContextMenu from './ContextMenu.vue';
import { getMeta } from '../registry/componentRegistry';

const editorStore = useEditorStore();
// state：必须用 storeToRefs 保持响应性
const { page, selectedId, canvasScale, canvasOffset, showGrid, snapToGrid, gridSize } =
  storeToRefs(editorStore);
// action：是稳定函数，直接从 store 实例解构
const {
  setSelectedId,
  addComponent,
  setCanvasScale,
  setCanvasOffset,
  toggleGrid,
  toggleSnapToGrid,
  clearDragState,
} = editorStore;

const { currentDeviceConfig } = useDevicePreview();

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

/**
 * 画布空白区域的 dragover：允许从组件面板拖入新组件追加到末尾
 */
const handleCanvasDragOver = (e: DragEvent) => {
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'copy';
  }
};

/**
 * 画布空白区域的 drop：将新组件追加到根级末尾
 * （组件之间的插入/重排由 CanvasComponent 自行处理）
 */
const handleCanvasDrop = (e: DragEvent) => {
  e.preventDefault();

  // 优先读取 store 中的拖拽类型（dragover 期间 dataTransfer.getData 不可用）
  const componentType =
    editorStore.draggedComponentType || e.dataTransfer?.getData('componentType');

  if (componentType) {
    const meta = getMeta(componentType);
    const index = page.value.children.length;
    addComponent(componentType, 'root', index, meta?.defaultProps || {}, meta?.defaultStyles || {});
  }
  clearDragState();
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
