<template>
  <div
    class="relative transition-all duration-200 group"
    :class="{
      'ring-2 ring-blue-500 shadow-md': isSelected,
      'ring-1 ring-blue-300': isHovered && !isSelected,
    }"
    @click.stop="handleClick"
    @mouseenter.stop="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <!-- 组件类型标签 -->
    <div
      v-if="isSelected || isHovered"
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
          :is-selected="false"
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
import { useEditorStore } from '../stores/editorStore';
import {
  TextComponent, ButtonComponent, ImageComponent, ContainerComponent,
  DividerComponent, SpacerComponent, CardComponent, BadgeComponent,
  RichTextComponent, InputComponent, VideoComponent, AudioComponent, MapComponent,
} from '@page-builder/components';
import {
  TextMeta, ButtonMeta, ImageMeta, ContainerMeta,
  DividerMeta, SpacerMeta, CardMeta, BadgeMeta, RichTextMeta, InputMeta,
  VideoMeta, AudioMeta, MapMeta,
} from '@page-builder/components';

interface Props {
  component: ComponentSchema;
  isSelected: boolean;
}

const props = defineProps<Props>();

const { setSelectedId, setHoveredId, hoveredId, deleteComponent, addComponent } = useEditorStore();

const componentMap: Record<string, any> = {
  text: TextComponent,
  button: ButtonComponent,
  image: ImageComponent,
  container: ContainerComponent,
  divider: DividerComponent,
  spacer: SpacerComponent,
  card: CardComponent,
  badge: BadgeComponent,
  richText: RichTextComponent,
  input: InputComponent,
  video: VideoComponent,
  audio: AudioComponent,
  map: MapComponent,
};

const componentMetas: Record<string, any> = {
  text: TextMeta,
  button: ButtonMeta,
  image: ImageMeta,
  container: ContainerMeta,
  divider: DividerMeta,
  spacer: SpacerMeta,
  card: CardMeta,
  badge: BadgeMeta,
  richText: RichTextMeta,
  input: InputMeta,
  video: VideoMeta,
  audio: AudioMeta,
  map: MapMeta,
};

const Component = computed(() => componentMap[props.component.type]);
const isContainer = computed(() => props.component.type === 'container' || props.component.type === 'card');
const isHovered = computed(() => hoveredId.value === props.component.id);

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

const handleClick = () => {
  setSelectedId(props.component.id);
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
  const duplicateComponent = (comp: any): any => ({
    ...comp,
    id: `comp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    children: comp.children?.map(duplicateComponent) || [],
  });

  const newComponent = duplicateComponent(props.component);
  const { page } = useEditorStore();
  const index = page.value.children.findIndex(c => c.id === props.component.id);
  addComponent(newComponent.type, 'root', index + 1, newComponent.props, newComponent.styles);
};

const handleContainerDrop = (e: DragEvent) => {
  e.preventDefault();
  e.stopPropagation();

  const componentType = e.dataTransfer?.getData('componentType');
  if (componentType) {
    const meta = componentMetas[componentType];
    const index = props.component.children?.length || 0;
    addComponent(
      componentType,
      props.component.id,
      index,
      meta?.defaultProps || {},
      meta?.defaultStyles || {}
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
