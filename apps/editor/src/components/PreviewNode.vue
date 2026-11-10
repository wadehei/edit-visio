<template>
  <component :is="Component" v-if="Component" :schema="component">
    <template v-if="isContainer && visibleChildren.length > 0">
      <PreviewNode v-for="child in visibleChildren" :key="child.id" :component="child" />
    </template>
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ComponentSchema } from '@page-builder/shared';
import { getComponent, isContainerType } from '../registry/componentRegistry';

const props = defineProps<{ component: ComponentSchema }>();

/** 解析组件对应的 Vue 组件；未注册类型返回 undefined，预览时静默跳过 */
const Component = computed(() => getComponent(props.component.type));

/** 仅容器类型渲染子组件，与编辑态 keep 一致 */
const isContainer = computed(() => isContainerType(props.component.type));

/** 过滤掉被隐藏的子组件（visible === false 预览时不渲染） */
const visibleChildren = computed(() =>
  (props.component.children ?? []).filter((child) => child.visible !== false),
);
</script>
