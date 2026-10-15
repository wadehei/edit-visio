<template>
  <!-- 对齐辅助线 -->
  <svg
    v-if="showGuides && guides.length > 0"
    class="absolute inset-0 pointer-events-none z-20"
    :style="{ width: '100%', height: '100%' }"
  >
    <line
      v-for="(guide, index) in guides"
      :key="index"
      :x1="guide.type === 'vertical' ? guide.position : 0"
      :y1="guide.type === 'horizontal' ? guide.position : 0"
      :x2="guide.type === 'vertical' ? guide.position : '100%'"
      :y2="guide.type === 'horizontal' ? guide.position : '100%'"
      stroke="#3b82f6"
      stroke-width="1"
      stroke-dasharray="4,4"
      opacity="0.8"
    />
    <!-- 对齐点标记 -->
    <circle
      v-for="(guide, index) in guides"
      :key="'point-' + index"
      :cx="guide.type === 'vertical' ? guide.position : '50%'"
      :cy="guide.type === 'horizontal' ? guide.position : '50%'"
      r="3"
      fill="#3b82f6"
    />
  </svg>
</template>

<script setup lang="ts">
import { useAlignmentGuides } from '../composables/useAlignmentGuides';

const { guides, showGuides } = useAlignmentGuides();
</script>
