<template>
  <div class="relative">
    <button
      @click="handleClick"
      class="p-2 hover:bg-purple-50 dark:hover:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded transition-colors"
      title="AI 助手"
    >
      <Sparkles :size="18" />
    </button>

    <!-- AI 建议面板 -->
    <div
      v-if="showPanel"
      class="absolute right-0 top-full mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl w-80 max-h-96 overflow-y-auto z-50"
    >
      <div class="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 class="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
          <Sparkles :size="16" class="text-purple-600" />
          AI 智能建议
        </h3>
      </div>

      <div class="p-4">
        <div v-if="recommendations.length === 0" class="text-center py-8">
          <p class="text-sm text-gray-500 dark:text-gray-400">暂无建议</p>
          <button
            @click="analyzePage"
            class="mt-2 px-4 py-2 bg-purple-500 text-white rounded text-sm hover:bg-purple-600"
          >
            分析页面
          </button>
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="rec in recommendations"
            :key="rec.id"
            class="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer"
            @click="rec.action"
          >
            <div class="flex items-start gap-2">
              <div class="flex-1">
                <h4 class="text-sm font-medium text-gray-800 dark:text-gray-200">
                  {{ rec.title }}
                </h4>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {{ rec.description }}
                </p>
              </div>
              <span class="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded">
                {{ rec.type === 'component' ? '组件' : rec.type === 'layout' ? '布局' : '文案' }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="showLayoutPanel" class="border-t border-gray-200 dark:border-gray-700 p-4">
        <h4 class="text-sm font-medium text-gray-800 dark:text-gray-200 mb-3">推荐布局</h4>
        <div class="space-y-2">
          <div
            v-for="(layout, index) in layoutRecommendations"
            :key="index"
            class="p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-purple-500 dark:hover:border-purple-500 cursor-pointer transition-colors"
            @click="applyLayout(index)"
          >
            <h5 class="text-sm font-medium text-gray-800 dark:text-gray-200">
              {{ layout.name }}
            </h5>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {{ layout.description }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Sparkles } from 'lucide-vue-next';
import { useAIAssistant } from '../composables/useAIAssistant';

const {
  showAIPanel,
  recommendations,
  layoutRecommendations,
  analyzePage,
  applyLayout,
} = useAIAssistant();

const showPanel = ref(false);
const showLayoutPanel = ref(false);

const handleClick = () => {
  showPanel.value = !showPanel.value;
  if (showPanel.value && recommendations.value.length === 0) {
    analyzePage();
  }
};

// 点击外部关闭
const handleClickOutside = (e: MouseEvent) => {
  const target = e.target as HTMLElement;
  if (!target.closest('.relative')) {
    showPanel.value = false;
  }
};

if (typeof window !== 'undefined') {
  window.addEventListener('click', handleClickOutside);
}
</script>
