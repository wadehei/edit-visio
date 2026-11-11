<template>
  <div class="flex shrink-0 h-full">
    <!-- 折叠态：窄条，点击展开 -->
    <button
      v-if="collapsed"
      class="w-9 h-full bg-white border-l border-gray-200 flex justify-center pt-3 text-gray-400 hover:text-gray-600 transition-colors"
      title="展开属性面板"
      @click="collapsed = false"
    >
      <PanelRightOpen :size="16" />
    </button>

    <template v-else>
      <!-- 拖拽调宽手柄 -->
      <div
        class="w-1 h-full cursor-col-resize bg-transparent hover:bg-brand-400 transition-colors"
        title="拖拽调整宽度"
        @mousedown.prevent="startResize"
      />

      <div
        class="relative bg-white border-l border-gray-200 flex flex-col"
        :style="{ width: `${panelWidth}px` }"
      >
        <!-- 折叠/展开切换 -->
        <button
          class="absolute -left-3 top-3 z-20 w-6 h-6 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
          title="折叠属性面板"
          @click="collapsed = true"
        >
          <PanelRightClose :size="12" />
        </button>

        <!-- 组件属性编辑 -->
        <template v-if="selectedComponent">
          <div class="p-3 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 class="text-sm font-semibold text-gray-800">属性配置</h2>
              <p class="text-[11px] text-gray-400 mt-0.5">
                {{ componentMeta?.label || selectedComponent.type }}
              </p>
            </div>
            <span class="text-[10px] text-gray-300 font-mono">{{
              selectedComponent.id.slice(0, 8)
            }}</span>
          </div>

          <div class="flex-1 overflow-y-auto">
            <!-- 组件属性 -->
            <ComponentPropsPanel
              v-if="componentMeta?.propDefinitions?.length"
              :component-meta="componentMeta!"
              :component-props="selectedComponent.props"
              @prop-change="handlePropChange"
            />

            <!-- 样式面板 -->
            <StylePanel
              :styles="styles"
              :is-container="isContainerType(selectedComponent.type)"
              @style-change="handleStyleChange"
            />
          </div>
        </template>

        <!-- 页面配置 -->
        <PageConfigPanel
          v-else
          :page="page"
          @page-change="handlePageNameChange"
          @page-prop-change="handlePagePropChange"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { PanelRightClose, PanelRightOpen } from 'lucide-vue-next';
import { useEditorStore } from '../stores/editorStore';
import { getMeta, isContainerType } from '../registry/componentRegistry';
import type { ComponentMeta } from '@page-builder/shared';
import ComponentPropsPanel from './property-panel/ComponentPropsPanel.vue';
import StylePanel from './property-panel/StylePanel.vue';
import PageConfigPanel from './property-panel/PageConfigPanel.vue';

const editorStore = useEditorStore();
// state：必须用 storeToRefs 保持响应性
const { page, selectedId } = storeToRefs(editorStore);
// action：是稳定函数，直接从 store 实例解构
const { updateComponent, setPage, getComponentById } = editorStore;

/** 属性面板宽度约束（px） */
const MIN_PANEL_WIDTH = 240;
const MAX_PANEL_WIDTH = 560;
/** 默认宽度对齐原 w-80（20rem = 320px） */
const panelWidth = ref(320);
const collapsed = ref(false);

/** 拖拽左侧手柄调整面板宽度，向右拖拽变窄、向左变宽 */
const startResize = (event: MouseEvent) => {
  const startX = event.clientX;
  const startWidth = panelWidth.value;
  const onMove = (moveEvent: MouseEvent) => {
    const next = startWidth + (startX - moveEvent.clientX);
    panelWidth.value = Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, next));
  };
  const onUp = () => {
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
  };
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
};

const selectedComponent = computed(() =>
  selectedId.value ? (getComponentById(selectedId.value) ?? null) : null,
);

const componentMeta = computed<ComponentMeta | null>(() => {
  if (!selectedComponent.value) return null;
  return getMeta(selectedComponent.value.type) || null;
});

/** 将组件的 Partial<CSSStyleDeclaration> 样式转换为 StylePanel 所需的 Record 类型 */
const toStyleRecord = (
  source: Partial<CSSStyleDeclaration> | undefined,
): Record<string, string | undefined> => {
  const result: Record<string, string | undefined> = {};
  Object.assign(result, source);
  return result;
};

const styles = computed(() => toStyleRecord(selectedComponent.value?.styles));

const handlePropChange = (propName: string, value: unknown) => {
  if (!selectedComponent.value) return;
  updateComponent(selectedComponent.value.id, {
    props: {
      ...selectedComponent.value.props,
      [propName]: value,
    },
  });
};

const handleStyleChange = (styleName: string, value: string) => {
  if (!selectedComponent.value) return;
  updateComponent(selectedComponent.value.id, {
    styles: {
      ...selectedComponent.value.styles,
      [styleName]: value || undefined,
    },
  });
};

const handlePageNameChange = (_field: 'name', value: string) => {
  setPage({ ...page.value, name: value });
};

const handlePagePropChange = (field: string, value: string | undefined) => {
  setPage({
    ...page.value,
    props: { ...page.value.props, [field]: value },
  });
};
</script>
