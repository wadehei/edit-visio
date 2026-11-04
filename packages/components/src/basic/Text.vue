<!--
 * @Author: songshaohui shaohui.song@hjlysz.com
 * @Date: 2026-10-09 23:22:15
 * @LastEditors: songshaohui shaohui.song@hjlysz.com
 * @LastEditTime: 2026-11-04 10:53:50
 * @FilePath: \edit-visio\packages\components\src\basic\Text.vue
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
<template>
  <div :style="componentStyles">
    {{ content || '请输入文本内容' }}
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { CSSProperties } from 'vue';
import type { ComponentSchema } from '@page-builder/shared';

interface Props {
  schema: ComponentSchema;
}

const props = defineProps<Props>();

interface TextProps {
  content: string;
  color?: string;
  fontSize?: string;
  fontWeight?: string;
  textAlign?: 'left' | 'center' | 'right';
}

const textProps = computed(() => props.schema.props as unknown as TextProps);

const content = computed(() => textProps.value.content);

const componentStyles = computed<CSSProperties>(() => ({
  color: textProps.value.color || '#000000',
  fontSize: textProps.value.fontSize || '14px',
  fontWeight: textProps.value.fontWeight || 'normal',
  textAlign: textProps.value.textAlign || 'left',
  ...(props.schema.styles as CSSProperties),
}));
</script>
