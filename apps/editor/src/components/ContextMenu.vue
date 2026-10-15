<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl py-2 min-w-[160px] border border-gray-200 dark:border-gray-700"
      :style="{ left: x + 'px', top: y + 'px' }"
      @click="handleClick"
    >
      <button
        v-for="item in menuItems"
        :key="item.action"
        @click="executeAction(item.action)"
        class="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors"
        :class="{ 'text-red-600 dark:text-red-400': item.action === 'delete' }"
      >
        <component :is="item.icon" :size="16" />
        {{ item.label }}
        <span v-if="item.shortcut" class="ml-auto text-xs text-gray-400">
          {{ item.shortcut }}
        </span>
      </button>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { Copy, Trash2, ArrowUp, ArrowDown, Layers, Edit } from 'lucide-vue-next';
import { useEditorStore } from '../stores/editorStore';

interface MenuItem {
  action: string;
  label: string;
  icon: any;
  shortcut?: string;
}

const { selectedId, deleteComponent, moveComponent, page } = useEditorStore();

const visible = ref(false);
const x = ref(0);
const y = ref(0);
const targetComponentId = ref<string | null>(null);

const menuItems = computed<MenuItem[]>(() => {
  if (!targetComponentId.value) return [];

  const components = page.value.children;
  const index = components.findIndex(c => c.id === targetComponentId.value);

  const items: MenuItem[] = [
    { action: 'copy', label: '复制', icon: Copy, shortcut: 'Ctrl+D' },
    { action: 'edit', label: '编辑', icon: Edit },
  ];

  // 上移
  if (index > 0) {
    items.push({ action: 'moveUp', label: '上移', icon: ArrowUp, shortcut: '↑' });
  }

  // 下移
  if (index < components.length - 1) {
    items.push({ action: 'moveDown', label: '下移', icon: ArrowDown, shortcut: '↓' });
  }

  items.push(
    { action: 'bringToFront', label: '置顶', icon: Layers },
    { action: 'delete', label: '删除', icon: Trash2, shortcut: 'Delete' }
  );

  return items;
});

const show = (event: MouseEvent, componentId: string) => {
  event.preventDefault();
  x.value = event.clientX;
  y.value = event.clientY;
  targetComponentId.value = componentId;
  visible.value = true;
};

const hide = () => {
  visible.value = false;
  targetComponentId.value = null;
};

const handleClick = () => {
  hide();
};

const executeAction = (action: string) => {
  if (!targetComponentId.value) return;

  const components = page.value.children;
  const index = components.findIndex(c => c.id === targetComponentId.value);

  switch (action) {
    case 'copy':
      // 复制逻辑
      alert('复制功能开发中...');
      break;
    case 'edit':
      // 编辑逻辑
      break;
    case 'moveUp':
      if (index > 0) {
        moveComponent(targetComponentId.value, 'root', index - 1);
      }
      break;
    case 'moveDown':
      if (index < components.length - 1) {
        moveComponent(targetComponentId.value, 'root', index + 2);
      }
      break;
    case 'bringToFront':
      moveComponent(targetComponentId.value, 'root', components.length - 1);
      break;
    case 'delete':
      if (confirm('确定要删除这个组件吗？')) {
        deleteComponent(targetComponentId.value);
      }
      break;
  }

  hide();
};

// 点击外部关闭
const handleClickOutside = (e: MouseEvent) => {
  const target = e.target as HTMLElement;
  if (!target.closest('.fixed')) {
    hide();
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});

defineExpose({ show });
</script>
