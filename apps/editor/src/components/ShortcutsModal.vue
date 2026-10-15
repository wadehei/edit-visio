<template>
  <div
    v-if="showModal"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    @click.self="closeModal"
  >
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
      <div class="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
          <Keyboard :size="20" />
          快捷键列表
        </h2>
        <button @click="closeModal" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          ×
        </button>
      </div>

      <!-- 搜索框 -->
      <div class="p-4 border-b border-gray-200 dark:border-gray-700">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索快捷键..."
          class="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-gray-200"
        />
      </div>

      <div class="flex-1 overflow-y-auto p-4">
        <div v-for="category in filteredCategories" :key="category.name" class="mb-6">
          <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            {{ category.name }}
          </h3>
          <div class="space-y-2">
            <div
              v-for="shortcut in category.shortcuts"
              :key="shortcut.action"
              class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              <div class="flex-1">
                <p class="text-sm text-gray-800 dark:text-gray-200">{{ shortcut.label }}</p>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {{ shortcut.description }}
                </p>
              </div>
              <div class="flex gap-1">
                <kbd
                  v-for="(key, index) in shortcut.keys"
                  :key="index"
                  class="px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono text-gray-700 dark:text-gray-300 shadow-sm"
                >
                  {{ key }}
                </kbd>
              </div>
            </div>
          </div>
        </div>

        <div v-if="filteredCategories.length === 0" class="text-center py-12">
          <p class="text-gray-400">未找到匹配的快捷键</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Keyboard } from 'lucide-vue-next';

interface Shortcut {
  action: string;
  label: string;
  description: string;
  keys: string[];
}

interface ShortcutCategory {
  name: string;
  shortcuts: Shortcut[];
}

const showModal = ref(false);
const searchQuery = ref('');

const shortcutCategories: ShortcutCategory[] = [
  {
    name: '编辑操作',
    shortcuts: [
      {
        action: 'undo',
        label: '撤销',
        description: '撤销上一步操作',
        keys: ['Ctrl', 'Z'],
      },
      {
        action: 'redo',
        label: '重做',
        description: '重做上一步撤销的操作',
        keys: ['Ctrl', 'Y'],
      },
      {
        action: 'redo-alt',
        label: '重做（替代）',
        description: '重做上一步撤销的操作',
        keys: ['Ctrl', 'Shift', 'Z'],
      },
      {
        action: 'delete',
        label: '删除',
        description: '删除选中的组件',
        keys: ['Delete'],
      },
      {
        action: 'duplicate',
        label: '复制',
        description: '复制选中的组件',
        keys: ['Ctrl', 'D'],
      },
    ],
  },
  {
    name: '导航操作',
    shortcuts: [
      {
        action: 'select-up',
        label: '选择上一个',
        description: '选择上一个组件',
        keys: ['↑'],
      },
      {
        action: 'select-down',
        label: '选择下一个',
        description: '选择下一个组件',
        keys: ['↓'],
      },
      {
        action: 'deselect',
        label: '取消选择',
        description: '取消选中组件',
        keys: ['Escape'],
      },
    ],
  },
  {
    name: '文件操作',
    shortcuts: [
      {
        action: 'save',
        label: '保存',
        description: '保存页面为 JSON 文件',
        keys: ['Ctrl', 'S'],
      },
    ],
  },
  {
    name: '视图操作',
    shortcuts: [
      {
        action: 'zoom-in',
        label: '放大',
        description: '放大画布',
        keys: ['Ctrl', '+'],
      },
      {
        action: 'zoom-out',
        label: '缩小',
        description: '缩小画布',
        keys: ['Ctrl', '-'],
      },
      {
        action: 'zoom-reset',
        label: '重置缩放',
        description: '重置画布缩放到 100%',
        keys: ['Ctrl', '0'],
      },
    ],
  },
];

const filteredCategories = computed(() => {
  if (!searchQuery.value) return shortcutCategories;

  const query = searchQuery.value.toLowerCase();
  return shortcutCategories
    .map(category => ({
      ...category,
      shortcuts: category.shortcuts.filter(
        shortcut =>
          shortcut.label.toLowerCase().includes(query) ||
          shortcut.description.toLowerCase().includes(query) ||
          shortcut.keys.some(key => key.toLowerCase().includes(query))
      ),
    }))
    .filter(category => category.shortcuts.length > 0);
});

const openModal = () => {
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  searchQuery.value = '';
};

defineExpose({ openModal });
</script>
