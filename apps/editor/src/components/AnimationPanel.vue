<template>
  <div v-if="showPanel" class="border-t border-gray-200 dark:border-gray-700 p-4">
    <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">动画效果</h3>

    <!-- 动画类型选择 -->
    <div class="mb-4">
      <label class="block text-xs text-gray-600 dark:text-gray-400 mb-2">动画类型</label>
      <div class="grid grid-cols-2 gap-2">
        <button
          v-for="category in animationCategories"
          :key="category.name"
          @click="expandedCategory = expandedCategory === category.name ? '' : category.name"
          class="px-3 py-2 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors text-left"
        >
          {{ category.name }}
        </button>
      </div>

      <!-- 动画列表 -->
      <div v-if="expandedCategory" class="mt-2 space-y-1">
        <button
          v-for="anim in getCategoryAnimations(expandedCategory)"
          :key="anim"
          @click="selectAnimation(anim)"
          class="w-full px-3 py-2 text-xs text-left rounded transition-colors"
          :class="currentAnimation.type === anim
            ? 'bg-blue-500 text-white'
            : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'"
        >
          {{ getAnimationLabel(anim) }}
          <span
            v-if="currentAnimation.type === anim"
            @click.stop="previewAnimation(anim)"
            class="ml-2 text-xs"
          >
            ▶
          </span>
        </button>
      </div>
    </div>

    <!-- 动画参数 -->
    <div v-if="currentAnimation.type !== 'none'" class="space-y-3">
      <div>
        <label class="block text-xs text-gray-600 dark:text-gray-400 mb-1">
          持续时间: {{ currentAnimation.duration }}ms
        </label>
        <input
          type="range"
          :value="currentAnimation.duration"
          @input="setDuration(Number(($event.target as HTMLInputElement).value))"
          min="100"
          max="2000"
          step="100"
          class="w-full"
        />
      </div>

      <div>
        <label class="block text-xs text-gray-600 dark:text-gray-400 mb-1">
          延迟: {{ currentAnimation.delay }}ms
        </label>
        <input
          type="range"
          :value="currentAnimation.delay"
          @input="setDelay(Number(($event.target as HTMLInputElement).value))"
          min="0"
          max="2000"
          step="100"
          class="w-full"
        />
      </div>

      <div>
        <label class="block text-xs text-gray-600 dark:text-gray-400 mb-1">重复</label>
        <select
          :value="currentAnimation.iteration"
          @change="setIteration(($event.target as HTMLSelectElement).value as 'once' | 'infinite')"
          class="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded"
        >
          <option value="once">一次</option>
          <option value="infinite">无限循环</option>
        </select>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useAnimation } from '../composables/useAnimation';
import type { AnimationType } from '../composables/useAnimation';

interface Props {
  showPanel: boolean;
}

defineProps<Props>();

const {
  currentAnimation,
  animationCategories,
  setAnimation,
  setDuration,
  setDelay,
  setIteration,
} = useAnimation();

const expandedCategory = ref('');

const getCategoryAnimations = (categoryName: string) => {
  const category = animationCategories.find(c => c.name === categoryName);
  return category?.animations || [];
};

const getAnimationLabel = (type: string) => {
  const labels: Record<string, string> = {
    fadeIn: '淡入',
    fadeInUp: '向上淡入',
    fadeInDown: '向下淡入',
    fadeInLeft: '向左淡入',
    fadeInRight: '向右淡入',
    slideInUp: '向上滑入',
    slideInDown: '向下滑入',
    slideInLeft: '向左滑入',
    slideInRight: '向右滑入',
    zoomIn: '放大进入',
    bounceIn: '弹跳进入',
    rotateIn: '旋转进入',
    flipIn: '翻转进入',
  };
  return labels[type] || type;
};

const selectAnimation = (type: AnimationType) => {
  setAnimation(type);
};

const previewAnimation = (type: AnimationType) => {
  // 预览动画效果
  setAnimation(type);
};
</script>
