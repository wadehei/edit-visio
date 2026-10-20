<template>
  <StyleSection v-if="componentMeta?.propDefinitions?.length" title="组件属性" icon="🎛️">
    <div class="space-y-2.5">
      <div v-for="propDef in componentMeta.propDefinitions" :key="propDef.name">
        <label class="block text-[11px] text-gray-500 mb-1">{{ propDef.label }}</label>

        <input
          v-if="propDef.type === 'string'"
          type="text"
          :value="getPropValue(propDef.name)"
          :placeholder="propDef.placeholder"
          @input="emitPropChange(propDef.name, ($event.target as HTMLInputElement).value)"
          class="w-full px-2.5 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
        />

        <textarea
          v-else-if="propDef.type === 'textarea'"
          :value="getPropValue(propDef.name)"
          :placeholder="propDef.placeholder"
          @input="emitPropChange(propDef.name, ($event.target as HTMLTextAreaElement).value)"
          class="w-full px-2.5 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
          rows="2"
        />

        <input
          v-else-if="propDef.type === 'number'"
          type="number"
          :value="getPropValue(propDef.name)"
          @input="emitPropChange(propDef.name, Number(($event.target as HTMLInputElement).value))"
          class="w-full px-2.5 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
        />

        <input
          v-else-if="propDef.type === 'color'"
          type="color"
          :value="getPropValue(propDef.name)"
          @input="emitPropChange(propDef.name, ($event.target as HTMLInputElement).value)"
          class="w-full h-7 border border-gray-200 rounded cursor-pointer"
        />

        <label v-else-if="propDef.type === 'boolean'" class="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            :checked="getPropValue(propDef.name)"
            @change="emitPropChange(propDef.name, ($event.target as HTMLInputElement).checked)"
            class="rounded"
          />
          <span class="text-xs text-gray-600">{{ propDef.label }}</span>
        </label>

        <select
          v-else-if="propDef.type === 'select'"
          :value="getPropValue(propDef.name)"
          @change="emitPropChange(propDef.name, ($event.target as HTMLSelectElement).value)"
          class="w-full px-2.5 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
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
          @input="emitPropChange(propDef.name, ($event.target as HTMLInputElement).value)"
          class="w-full px-2.5 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
      </div>
    </div>
  </StyleSection>
</template>

<script setup lang="ts">
import type { ComponentMeta } from '@page-builder/shared';
import StyleSection from '../StyleSection.vue';

const props = defineProps<{
  componentMeta: ComponentMeta;
  componentProps: Record<string, unknown>;
}>();

const emit = defineEmits<{
  (e: 'propChange', propName: string, value: unknown): void;
}>();

const getPropValue = (propName: string): unknown => {
  return props.componentProps[propName];
};

const emitPropChange = (propName: string, value: unknown) => {
  emit('propChange', propName, value);
};
</script>
