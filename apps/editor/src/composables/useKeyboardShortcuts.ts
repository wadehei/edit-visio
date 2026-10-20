import { onMounted, onUnmounted } from 'vue';
import { useEditorStore } from '../stores/editorStore';
import {
  findComponentInTree,
  duplicateComponentTree,
  saveAsJSON,
} from '@page-builder/shared';

export function useKeyboardShortcuts() {
  const {
    undo,
    redo,
    deleteComponent,
    selectedId,
    page,
    setSelectedId,
    insertComponentTree,
    copyComponent,
    pasteComponent,
  } = useEditorStore();

  const handleKeyDown = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    const isInput = target.tagName === 'INPUT' ||
                    target.tagName === 'TEXTAREA' ||
                    target.isContentEditable;

    // 如果在输入框中，不处理快捷键
    if (isInput) return;

    // Ctrl/Cmd + Z - 撤销
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      undo();
    }

    // Ctrl/Cmd + Y 或 Ctrl/Cmd + Shift + Z - 重做
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault();
      redo();
    }

    // Ctrl/Cmd + C - 复制
    if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedId.value) {
      e.preventDefault();
      copyComponent();
    }

    // Ctrl/Cmd + V - 粘贴
    if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
      e.preventDefault();
      pasteComponent();
    }

    // Delete / Backspace - 删除选中组件
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId.value) {
      e.preventDefault();
      if (confirm('确定要删除这个组件吗？')) {
        deleteComponent(selectedId.value);
      }
    }

    // 方向键 - 选择相邻组件
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const components = page.value.children;
      if (components.length === 0) return;

      if (!selectedId.value) {
        setSelectedId(components[0].id);
        return;
      }

      const currentIndex = components.findIndex(c => c.id === selectedId.value);
      if (currentIndex === -1) return;

      if (e.key === 'ArrowUp' && currentIndex > 0) {
        setSelectedId(components[currentIndex - 1].id);
      } else if (e.key === 'ArrowDown' && currentIndex < components.length - 1) {
        setSelectedId(components[currentIndex + 1].id);
      }
    }

    // Escape - 取消选择
    if (e.key === 'Escape') {
      setSelectedId(null);
    }

    // Ctrl/Cmd + S - 保存
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveAsJSON(page.value);
    }

    // Ctrl/Cmd + D - 复制组件（快捷方式）
    if ((e.ctrlKey || e.metaKey) && e.key === 'd' && selectedId.value) {
      e.preventDefault();
      handleDuplicate();
    }
  };

  const handleDuplicate = () => {
    if (!selectedId.value) return;

    const component = findComponentInTree(page.value.children, selectedId.value);
    if (!component) return;

    const newComponent = duplicateComponentTree(component);
    const index = page.value.children.findIndex(c => c.id === selectedId.value);

    // 使用 insertComponentTree 保留子组件结构（addComponent 会忽略 children）
    insertComponentTree(newComponent, 'root', index + 1);
  };

  onMounted(() => {
    window.addEventListener('keydown', handleKeyDown);
  });

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown);
  });
}
