import { onMounted, onUnmounted } from 'vue';
import { useEditorStore } from '../stores/editorStore';

export function useKeyboardShortcuts() {
  const {
    undo,
    redo,
    deleteComponent,
    selectedId,
    page,
    setSelectedId,
    history,
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
      handleSave();
    }

    // Ctrl/Cmd + D - 复制组件
    if ((e.ctrlKey || e.metaKey) && e.key === 'd' && selectedId.value) {
      e.preventDefault();
      handleDuplicate();
    }
  };

  const handleSave = () => {
    const json = JSON.stringify(page.value, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${page.value.name}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDuplicate = () => {
    if (!selectedId.value) return;

    const findComponent = (components: any[]): any => {
      for (const component of components) {
        if (component.id === selectedId.value) {
          return component;
        }
        if (component.children) {
          const found = findComponent(component.children);
          if (found) return found;
        }
      }
      return null;
    };

    const component = findComponent(page.value.children);
    if (!component) return;

    const duplicateComponent = (comp: any): any => ({
      ...comp,
      id: `comp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      children: comp.children?.map(duplicateComponent) || [],
    });

    const newComponent = duplicateComponent(component);
    const index = page.value.children.findIndex(c => c.id === selectedId.value);
    const { addComponent } = useEditorStore();
    addComponent(newComponent.type, 'root', index + 1, newComponent.props, newComponent.styles);
  };

  onMounted(() => {
    window.addEventListener('keydown', handleKeyDown);
  });

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown);
  });
}
