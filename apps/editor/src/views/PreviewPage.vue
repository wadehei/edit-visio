<template>
  <div class="preview-root" :style="pageStyles">
    <PreviewNode v-for="child in children" :key="child.id" :component="child" />
    <div v-if="isEmpty" class="preview-empty">暂无可预览的内容</div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type { CSSProperties } from 'vue';
import type { PageSchema } from '@page-builder/shared';
import PreviewNode from '../components/PreviewNode.vue';
import { logger } from '../utils/logger';

/** 与编辑器「预览」写入的键保持一致 */
const STORAGE_KEY = 'preview-page';

const page = ref<PageSchema | null>(null);
const ready = ref(false);

onMounted(() => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      page.value = JSON.parse(raw) as PageSchema;
    } catch (error) {
      logger.error('PreviewPage', '预览数据解析失败', error);
    }
  }
  ready.value = true;
});

/** 过滤掉被隐藏的顶层组件 */
const children = computed(() =>
  (page.value?.children ?? []).filter((child) => child.visible !== false),
);

const isEmpty = computed(() => ready.value && children.value.length === 0);

const pageStyles = computed<CSSProperties>(() => {
  const pageProps = page.value?.props;
  return {
    minHeight: '100vh',
    backgroundColor: pageProps?.backgroundColor ?? '#ffffff',
    backgroundImage: pageProps?.backgroundImage ? `url(${pageProps.backgroundImage})` : undefined,
    backgroundSize: pageProps?.backgroundImage ? 'cover' : undefined,
    backgroundPosition: pageProps?.backgroundImage ? 'center' : undefined,
    padding: pageProps?.padding ?? '16px',
  };
});
</script>

<style scoped>
.preview-root {
  box-sizing: border-box;
  width: 100%;
}

.preview-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  color: #9ca3af;
  font-size: 14px;
}
</style>
