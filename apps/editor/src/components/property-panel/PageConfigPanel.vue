<template>
  <div class="w-80 bg-white border-l border-gray-200 flex flex-col">
    <div class="p-3 border-b border-gray-200">
      <h2 class="text-sm font-semibold text-gray-800">页面配置</h2>
    </div>
    <div class="flex-1 overflow-y-auto">
      <StyleSection title="基本信息" :icon="FileText" :default-open="true">
        <div class="space-y-2">
          <div>
            <label class="block text-[10px] text-gray-400 mb-0.5">页面名称</label>
            <input
              type="text"
              :value="page.name"
              class="w-full px-2.5 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
              @input="emitPageChange('name', ($event.target as HTMLInputElement).value)"
            />
          </div>
          <div>
            <label class="block text-[10px] text-gray-400 mb-0.5">页面标题</label>
            <input
              type="text"
              :value="page.props.title"
              class="w-full px-2.5 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
              @input="emitPagePropChange('title', ($event.target as HTMLInputElement).value)"
            />
          </div>
        </div>
      </StyleSection>

      <StyleSection title="页面背景" :icon="Palette">
        <div class="space-y-2">
          <div>
            <label class="block text-[10px] text-gray-400 mb-0.5">背景颜色</label>
            <input
              type="color"
              :value="page.props.backgroundColor"
              class="w-full h-7 border border-gray-200 rounded cursor-pointer"
              @input="
                emitPagePropChange('backgroundColor', ($event.target as HTMLInputElement).value)
              "
            />
          </div>
          <StyleField
            label="背景图片"
            :value="page.props.backgroundImage || ''"
            placeholder="https://example.com/bg.jpg"
            @change="handleBackgroundImageChange"
          />
        </div>
      </StyleSection>

      <StyleSection title="图层结构" :icon="Layers" :default-open="true">
        <LayerPanel />
      </StyleSection>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PageSchema } from '@page-builder/shared';
import { FileText, Layers, Palette } from 'lucide-vue-next';
import LayerPanel from '../LayerPanel.vue';
import StyleSection from '../StyleSection.vue';
import StyleField from '../StyleField.vue';

defineProps<{
  page: PageSchema;
}>();

const emit = defineEmits<{
  (e: 'pageChange', field: 'name', value: string): void;
  (e: 'pagePropChange', field: string, value: string | undefined): void;
}>();

const emitPageChange = (field: 'name', value: string) => {
  emit('pageChange', field, value);
};

const emitPagePropChange = (field: string, value: string) => {
  emit('pagePropChange', field, value);
};

const handleBackgroundImageChange = (value: string) => {
  emit('pagePropChange', 'backgroundImage', value || undefined);
};
</script>
