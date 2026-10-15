<template>
  <div
    class="w-80 bg-white border-l border-gray-200 flex flex-col"
    v-if="selectedComponent"
  >
    <div class="p-4 border-b border-gray-200">
      <h2 class="text-lg font-semibold text-gray-800">属性配置</h2>
      <p class="text-xs text-gray-500 mt-1">
        组件类型: {{ selectedComponent.type }}
      </p>
    </div>
    <div class="flex-1 overflow-y-auto p-4">
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">组件 ID</label>
          <input
            type="text"
            :value="selectedComponent.id"
            disabled
            class="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded text-sm text-gray-600"
          />
        </div>

        <div v-if="componentMeta">
          <h3 class="text-sm font-medium text-gray-700 mb-3">组件属性</h3>
          <div class="space-y-3">
            <div v-for="propDef in componentMeta.propDefinitions" :key="propDef.name">
              <label class="block text-xs text-gray-600 mb-1">{{ propDef.label }}</label>

              <input
                v-if="propDef.type === 'string'"
                type="text"
                :value="getPropValue(propDef.name)"
                :placeholder="propDef.placeholder"
                @input="handlePropChange(propDef.name, ($event.target as HTMLInputElement).value)"
                class="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              />

              <textarea
                v-else-if="propDef.type === 'textarea'"
                :value="getPropValue(propDef.name)"
                :placeholder="propDef.placeholder"
                @input="handlePropChange(propDef.name, ($event.target as HTMLTextAreaElement).value)"
                class="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                rows="3"
              />

              <input
                v-else-if="propDef.type === 'number'"
                type="number"
                :value="getPropValue(propDef.name)"
                @input="handlePropChange(propDef.name, Number(($event.target as HTMLInputElement).value))"
                class="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              />

              <input
                v-else-if="propDef.type === 'color'"
                type="color"
                :value="getPropValue(propDef.name)"
                @input="handlePropChange(propDef.name, ($event.target as HTMLInputElement).value)"
                class="w-full h-8 border border-gray-300 rounded"
              />

              <label v-else-if="propDef.type === 'boolean'" class="flex items-center">
                <input
                  type="checkbox"
                  :checked="getPropValue(propDef.name)"
                  @change="handlePropChange(propDef.name, ($event.target as HTMLInputElement).checked)"
                  class="mr-2"
                />
                <span class="text-sm text-gray-700">{{ propDef.label }}</span>
              </label>

              <select
                v-else-if="propDef.type === 'select'"
                :value="getPropValue(propDef.name)"
                @change="handlePropChange(propDef.name, ($event.target as HTMLSelectElement).value)"
                class="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              >
                <option v-for="option in propDef.options" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>

              <input
                v-else-if="propDef.type === 'image'"
                type="text"
                :value="getPropValue(propDef.name)"
                placeholder="https://example.com/image.jpg"
                @input="handlePropChange(propDef.name, ($event.target as HTMLInputElement).value)"
                class="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              />
            </div>
          </div>
        </div>

        <div>
          <h3 class="text-sm font-medium text-gray-700 mb-3">样式配置</h3>
          <div class="space-y-2">
            <div>
              <label class="block text-xs text-gray-600 mb-1">背景颜色</label>
              <input
                type="color"
                :value="selectedComponent.styles.backgroundColor || '#ffffff'"
                @input="handleStyleChange('backgroundColor', ($event.target as HTMLInputElement).value)"
                class="w-full h-8 border border-gray-300 rounded"
              />
            </div>
            <div>
              <label class="block text-xs text-gray-600 mb-1">内边距 (px)</label>
              <input
                type="number"
                :value="parseInt(selectedComponent.styles.padding || '0')"
                @input="handleStyleChange('padding', `${($event.target as HTMLInputElement).value}px`)"
                class="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              />
            </div>
            <div>
              <label class="block text-xs text-gray-600 mb-1">外边距 (px)</label>
              <input
                type="number"
                :value="parseInt(selectedComponent.styles.margin || '0')"
                @input="handleStyleChange('margin', `${($event.target as HTMLInputElement).value}px`)"
                class="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              />
            </div>
            <div>
              <label class="block text-xs text-gray-600 mb-1">圆角 (px)</label>
              <input
                type="number"
                :value="parseInt(selectedComponent.styles.borderRadius || '0')"
                @input="handleStyleChange('borderRadius', `${($event.target as HTMLInputElement).value}px`)"
                class="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 页面配置 -->
  <div
    v-else
    class="w-80 bg-white border-l border-gray-200 flex flex-col"
  >
    <div class="p-4 border-b border-gray-200">
      <h2 class="text-lg font-semibold text-gray-800">页面配置</h2>
    </div>
    <div class="flex-1 overflow-y-auto p-4">
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">页面名称</label>
          <input
            type="text"
            :value="page.name"
            @input="handlePageNameChange"
            class="w-full px-3 py-2 border border-gray-300 rounded text-sm"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">页面标题</label>
          <input
            type="text"
            :value="page.props.title"
            @input="handlePageTitleChange"
            class="w-full px-3 py-2 border border-gray-300 rounded text-sm"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">背景颜色</label>
          <input
            type="color"
            :value="page.props.backgroundColor"
            @input="handlePageBgColorChange"
            class="w-full h-8 border border-gray-300 rounded"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">背景图片</label>
          <input
            type="text"
            :value="page.props.backgroundImage || ''"
            @input="handlePageBgImageChange"
            placeholder="https://example.com/bg.jpg"
            class="w-full px-3 py-2 border border-gray-300 rounded text-sm"
          />
        </div>

        <div class="border-t border-gray-200 pt-4">
          <h3 class="text-sm font-medium text-gray-700 mb-3">图层结构</h3>
          <LayerPanel />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useEditorStore } from '../stores/editorStore';
import { findComponentById } from '@page-builder/shared';
import {
  TextMeta, ButtonMeta, ImageMeta, ContainerMeta,
  DividerMeta, SpacerMeta, CardMeta, BadgeMeta, RichTextMeta, InputMeta,
} from '@page-builder/components';
import type { ComponentMeta } from '@page-builder/shared';
import LayerPanel from './LayerPanel.vue';
import LayerTreeItem from './LayerTreeItem.vue';

const { page, selectedId, updateComponent, setPage } = useEditorStore();

const selectedComponent = computed(() =>
  selectedId.value ? findComponentById(page.value.children, selectedId.value) : null
);

const componentMetas: Record<string, ComponentMeta> = {
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
};

const componentMeta = computed(() => {
  if (!selectedComponent.value) return null;
  return componentMetas[selectedComponent.value.type] || null;
});

const getPropValue = (propName: string) => {
  if (!selectedComponent.value) return undefined;
  return selectedComponent.value.props[propName];
};

const handlePropChange = (propName: string, value: any) => {
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
      [styleName]: value,
    },
  });
};

const handlePageNameChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  setPage({ ...page.value, name: target.value });
};

const handlePageTitleChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  setPage({
    ...page.value,
    props: { ...page.value.props, title: target.value },
  });
};

const handlePageBgColorChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  setPage({
    ...page.value,
    props: { ...page.value.props, backgroundColor: target.value },
  });
};

const handlePageBgImageChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  setPage({
    ...page.value,
    props: { ...page.value.props, backgroundImage: target.value || undefined },
  });
};
</script>
