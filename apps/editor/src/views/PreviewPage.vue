<template>
  <div class="preview-root" :style="pageStyles">
    <PreviewNode v-for="child in children" :key="child.id" :component="child" />
    <div v-if="isEmpty" class="preview-empty">暂无可预览的内容</div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import type { CSSProperties } from 'vue';
import type { PageSchema } from '@page-builder/shared';
import PreviewNode from '../components/PreviewNode.vue';
import { logger } from '../utils/logger';

/** 与编辑器「预览」写入的键保持一致（localStorage 回退） */
const STORAGE_KEY = 'preview-page';
/** 与编辑器 postMessage 约定的消息类型（主通道） */
const MESSAGE_TYPE = 'page-builder:preview';

const page = ref<PageSchema | null>(null);
const ready = ref(false);

/** 接收编辑器通过 postMessage 推送的最新页面快照（刷新/多标签也不依赖存储） */
const onMessage = (e: MessageEvent) => {
  const data = e.data as { type?: string; schema?: PageSchema } | null;
  if (data && data.type === MESSAGE_TYPE && data.schema) {
    page.value = data.schema;
    ready.value = true;
  }
};

onMounted(() => {
  window.addEventListener('message', onMessage);

  // localStorage 回退：直接打开 /preview 或刷新时使用
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

onUnmounted(() => {
  window.removeEventListener('message', onMessage);
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
