import { onMounted, onUnmounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useEditorStore } from '../stores/editorStore';
import { findComponentInTree, duplicateComponentTree, saveAsJSON } from '@page-builder/shared';
import { confirmDialog } from './useConfirm';
import { toast } from '../utils/toast';

export function useKeyboardShortcuts() {
  const editorStore = useEditorStore();
  // state：必须用 storeToRefs 保持响应性
  const { selectedId, page, selectedIds, clipboard } = storeToRefs(editorStore);
  // action：是稳定函数，直接从 store 实例解构
  const {
    undo,
    redo,
    deleteComponent,
    setSelectedId,
    insertComponentTree,
    copyComponent,
    pasteComponent,
  } = editorStore;

  const handleKeyDown = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    const isInput =
      target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

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
      const count = selectedIds.value.length;
      toast(count > 1 ? `已复制 ${count} 个组件` : '已复制组件', 'success');
    }

    // Ctrl/Cmd + V - 粘贴
    if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
      e.preventDefault();
      if (clipboard.value.length === 0) {
        toast('剪贴板为空，请先复制组件', 'warning');
      } else {
        pasteComponent();
        toast('已粘贴组件', 'success');
      }
    }

    // Delete / Backspace - 删除选中组件
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId.value) {
      e.preventDefault();
      const id = selectedId.value;
      void confirmDialog({
        title: '删除组件',
        message: '确定要删除这个组件吗？',
        confirmText: '删除',
        danger: true,
      }).then((ok) => {
        if (ok) deleteComponent(id);
      });
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

      const currentIndex = components.findIndex((c) => c.id === selectedId.value);
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
      toast('已快速复制组件', 'success');
    }
  };

  const handleDuplicate = () => {
    // Stryker disable next-line ConditionalExpression: 等价变异。handleDuplicate 唯一的调用点（第 94 行 Ctrl+D 分支）已要求 selectedId.value 为真，故进入此函数时 !selectedId.value 恒为 false、该早返回不可达，删除后行为完全一致。
    if (!selectedId.value) return;

    const component = findComponentInTree(page.value.children, selectedId.value);
    if (!component) return;

    const newComponent = duplicateComponentTree(component);
    const index = page.value.children.findIndex((c) => c.id === selectedId.value);

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
