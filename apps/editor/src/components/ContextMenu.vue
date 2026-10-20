<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl py-1.5 min-w-[180px] border border-gray-200 dark:border-gray-700"
      :style="{ left: x + 'px', top: y + 'px' }"
    >
      <template v-for="item in menuItems" :key="item.action">
        <div v-if="item.action === 'separator'" class="my-1 border-t border-gray-100 dark:border-gray-700" />
        <button
          v-else
          @click="executeAction(item.action)"
          class="w-full px-3 py-1.5 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors"
          :class="{
            'text-red-600 dark:text-red-400': item.action === 'delete',
            'text-gray-400 cursor-not-allowed': item.disabled,
          }"
          :disabled="item.disabled"
        >
          <span class="w-4 text-center">{{ item.icon }}</span>
          <span class="flex-1">{{ item.label }}</span>
          <span v-if="item.shortcut" class="text-[10px] text-gray-400">
            {{ item.shortcut }}
          </span>
        </button>
      </template>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue';
import { useEditorStore } from '../stores/editorStore';

interface MenuItem {
  action: string;
  label: string;
  icon: string;
  shortcut?: string;
  disabled?: boolean;
}

const {
  selectedId, setSelectedId, deleteComponent, moveComponent, page,
  copyComponent, pasteComponent, clipboard, updateComponent,
} = useEditorStore();

const visible = ref(false);
const x = ref(0);
const y = ref(0);
const targetComponentId = ref<string | null>(null);

const menuItems = computed<MenuItem[]>(() => {
  const id = targetComponentId.value;
  if (!id) return [];

  const components = page.value.children;
  const index = components.findIndex(c => c.id === id);
  const component = components[index];
  if (!component) return [];

  const items: MenuItem[] = [
    { action: 'copy', label: '复制', icon: '📋', shortcut: 'Ctrl+C' },
    { action: 'paste', label: '粘贴', icon: '📄', shortcut: 'Ctrl+V', disabled: clipboard.value.length === 0 },
    { action: 'duplicate', label: '快速复制', icon: '⧉', shortcut: 'Ctrl+D' },
    { action: 'separator_1', label: '', icon: '' },
  ];

  // 上移
  items.push({
    action: 'moveUp',
    label: '上移一层',
    icon: '↑',
    shortcut: '',
    disabled: index <= 0,
  });

  // 下移
  items.push({
    action: 'moveDown',
    label: '下移一层',
    icon: '↓',
    shortcut: '',
    disabled: index >= components.length - 1,
  });

  // 置顶
  items.push({
    action: 'bringToFront',
    label: '移到顶部',
    icon: '⬆',
    disabled: index >= components.length - 1,
  });

  // 置底
  items.push({
    action: 'sendToBack',
    label: '移到底部',
    icon: '⬇',
    disabled: index <= 0,
  });

  items.push({ action: 'separator_2', label: '', icon: '' });

  // 锁定/解锁
  items.push({
    action: 'toggleLock',
    label: component.locked ? '解锁' : '锁定',
    icon: component.locked ? '🔓' : '🔒',
  });

  // 显示/隐藏
  items.push({
    action: 'toggleVisibility',
    label: component.visible === false ? '显示' : '隐藏',
    icon: component.visible === false ? '👁️' : '🙈',
  });

  items.push({ action: 'separator_3', label: '', icon: '' });

  // 删除
  items.push({
    action: 'delete',
    label: '删除',
    icon: '🗑️',
    shortcut: 'Delete',
  });

  return items;
});

const show = (event: MouseEvent, componentId: string) => {
  event.preventDefault();
  event.stopPropagation();
  x.value = event.clientX;
  y.value = event.clientY;
  targetComponentId.value = componentId;
  setSelectedId(componentId);
  visible.value = true;
};

const hide = () => {
  visible.value = false;
  targetComponentId.value = null;
};

const executeAction = (action: string) => {
  const id = targetComponentId.value;
  if (!id) return;

  const components = page.value.children;
  const index = components.findIndex(c => c.id === id);

  switch (action) {
    case 'copy':
      setSelectedId(id);
      copyComponent();
      break;
    case 'paste':
      pasteComponent();
      break;
    case 'duplicate':
      setSelectedId(id);
      copyComponent();
      pasteComponent();
      break;
    case 'moveUp':
      if (index > 0) {
        moveComponent(id, 'root', index - 1);
      }
      break;
    case 'moveDown':
      if (index < components.length - 1) {
        moveComponent(id, 'root', index + 1);
      }
      break;
    case 'bringToFront':
      moveComponent(id, 'root', components.length - 1);
      break;
    case 'sendToBack':
      moveComponent(id, 'root', 0);
      break;
    case 'toggleLock': {
      const comp = components[index];
      if (comp) {
        updateComponent(id, { locked: !comp.locked } as any);
      }
      break;
    }
    case 'toggleVisibility': {
      const comp = components[index];
      if (comp) {
        updateComponent(id, { visible: comp.visible === false ? true : false } as any);
      }
      break;
    }
    case 'delete':
      deleteComponent(id);
      break;
  }

  hide();
};

// 点击外部关闭
const handleClickOutside = (e: MouseEvent) => {
  if (visible.value) {
    hide();
  }
};

document.addEventListener('click', handleClickOutside);
document.addEventListener('contextmenu', (e) => {
  // 如果点击的不是菜单本身，关闭菜单
  const target = e.target as HTMLElement;
  if (!target.closest('.fixed.z-50') && visible.value) {
    hide();
  }
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});

defineExpose({ show });
</script>
