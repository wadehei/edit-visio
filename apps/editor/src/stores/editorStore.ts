import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { PageSchema, ComponentSchema } from '@page-builder/shared';
import { createDefaultPage } from '@page-builder/core';
import {
  generateId,
  deepClone,
  updateComponent,
  removeComponent,
  insertComponent,
  findComponentInTree,
  duplicateComponentTree,
} from '@page-builder/shared';

/** 最大历史步数（超过后丢弃最早的记录） */
const MAX_HISTORY_SIZE = 20;

/** 历史快照条目：组件树快照 + 记录时刻（供历史面板展示时间） */
export interface HistoryEntry {
  schema: PageSchema;
  timestamp: number;
}

export const useEditorStore = defineStore('editor', () => {
  // State
  const page = ref<PageSchema>(createDefaultPage());
  const selectedId = ref<string | null>(null);
  const selectedIds = ref<string[]>([]);
  const hoveredId = ref<string | null>(null);
  const isDragging = ref(false);
  const canvasScale = ref(1);
  const canvasOffset = ref({ x: 0, y: 0 });
  const showGrid = ref(false);
  const snapToGrid = ref(true);
  const gridSize = ref(8);
  const clipboard = ref<ComponentSchema[]>([]);
  const history = ref<{
    past: HistoryEntry[];
    future: HistoryEntry[];
  }>({
    past: [],
    future: [],
  });

  /**
   * 保存版本号：每次用户主动修改（添加/删除/移动/更新组件等）时递增。
   * autoSave 监听此值而非 deep watch page，性能更优。
   */
  const saveVersion = ref(0);

  /** undo/redo 恢复期间为 true，autoSave 应跳过保存 */
  const isRestoring = ref(false);

  // Computed: 组件索引（O(1) 查找，避免每次遍历整棵树）
  const componentIndex = computed(() => {
    const index = new Map<string, ComponentSchema>();
    const buildIndex = (components: ComponentSchema[]) => {
      for (const comp of components) {
        index.set(comp.id, comp);
        if (comp.children) {
          buildIndex(comp.children);
        }
      }
    };
    buildIndex(page.value.children);
    return index;
  });

  /** 通过 ID 快速获取组件（O(1)，优先使用索引） */
  const getComponentById = (id: string): ComponentSchema | undefined => {
    return componentIndex.value.get(id);
  };

  // Actions
  const setPage = (newPage: PageSchema) => {
    page.value = newPage;
    saveVersion.value++;
  };

  const setSelectedId = (id: string | null) => {
    selectedId.value = id;
    selectedIds.value = id ? [id] : [];
  };

  /** 切换组件的多选状态（Shift+Click 使用） */
  const toggleSelection = (id: string) => {
    const index = selectedIds.value.indexOf(id);
    if (index > -1) {
      selectedIds.value = selectedIds.value.filter((i) => i !== id);
    } else {
      selectedIds.value = [...selectedIds.value, id];
    }
    // selectedId 始终指向最后选中的
    selectedId.value =
      selectedIds.value.length > 0 ? selectedIds.value[selectedIds.value.length - 1] : null;
  };

  /** 是否处于多选状态 */
  const isMultiSelect = computed(() => selectedIds.value.length > 1);

  /** 获取所有选中的组件 */
  const selectedComponents = computed(() =>
    selectedIds.value.map((id) => getComponentById(id)).filter((c): c is ComponentSchema => !!c),
  );

  const setHoveredId = (id: string | null) => {
    hoveredId.value = id;
  };

  const setDragging = (dragging: boolean) => {
    isDragging.value = dragging;
  };

  const setCanvasScale = (scale: number) => {
    canvasScale.value = Math.max(0.25, Math.min(2, scale));
  };

  const setCanvasOffset = (x: number, y: number) => {
    canvasOffset.value = { x, y };
  };

  const toggleGrid = () => {
    showGrid.value = !showGrid.value;
  };

  const toggleSnapToGrid = () => {
    snapToGrid.value = !snapToGrid.value;
  };

  const saveToHistory = () => {
    // 保留最近 MAX_HISTORY_SIZE - 1 条，加上新保存的一条共 MAX_HISTORY_SIZE 条
    const past = history.value.past.slice(-(MAX_HISTORY_SIZE - 1));
    history.value = {
      past: [...past, { schema: deepClone(page.value), timestamp: Date.now() }],
      future: [],
    };
    saveVersion.value++;
  };

  const addComponent = (
    componentType: string,
    parentId: string,
    index: number,
    defaultProps: Record<string, unknown> = {},
    defaultStyles: Partial<CSSStyleDeclaration> = {},
  ) => {
    saveToHistory(); // 先保存当前状态到历史（修改前）

    const newComponent: ComponentSchema = {
      id: generateId(),
      type: componentType,
      props: defaultProps,
      styles: defaultStyles,
      children: [],
    };

    // 结构共享插入：root 层复制数组，嵌套层由 insertComponent 重建容器对象（叶子复用引用）
    let newChildren: ComponentSchema[];
    if (parentId === 'root') {
      newChildren = [...page.value.children];
      newChildren.splice(index, 0, newComponent);
    } else {
      newChildren = insertComponent(page.value.children, parentId, index, newComponent);
    }

    page.value = { ...page.value, children: newChildren };
    selectedId.value = newComponent.id;
  };

  const updateComponentById = (id: string, updates: Partial<ComponentSchema>) => {
    saveToHistory(); // 先保存当前状态到历史（修改前）

    // updateComponent 返回新的树（结构共享：重建容器对象，叶子节点复用引用），无需全量 deepClone
    const newChildren = updateComponent(page.value.children, id, (component) => ({
      ...component,
      ...updates,
    }));

    page.value = { ...page.value, children: newChildren };
  };

  const deleteComponent = (id: string) => {
    saveToHistory();

    const idsToDelete = selectedIds.value.length > 1 ? selectedIds.value : [id];

    // 结构共享删除：removeComponent 逐层重建容器对象
    let newChildren = page.value.children;
    for (const deleteId of idsToDelete) {
      newChildren = removeComponent(newChildren, deleteId);
    }

    page.value = { ...page.value, children: newChildren };
    if (idsToDelete.includes(selectedId.value!)) {
      selectedId.value = null;
      selectedIds.value = [];
    }
  };

  const moveComponent = (id: string, targetParentId: string, targetIndex: number) => {
    saveToHistory(); // 先保存当前状态到历史（修改前）

    const component = findComponentInTree(page.value.children, id);
    if (!component) return;

    // 结构共享移动：先删后插，逐层重建容器对象
    let newChildren = removeComponent(page.value.children, id);

    if (targetParentId === 'root') {
      newChildren = [...newChildren];
      newChildren.splice(targetIndex, 0, component);
    } else {
      newChildren = insertComponent(newChildren, targetParentId, targetIndex, component);
    }

    page.value = { ...page.value, children: newChildren };
  };

  const undo = () => {
    if (history.value.past.length === 0) return;

    isRestoring.value = true;
    const previous = history.value.past[history.value.past.length - 1];
    const newPast = history.value.past.slice(0, -1);

    history.value = {
      past: newPast,
      future: [{ schema: deepClone(page.value), timestamp: Date.now() }, ...history.value.future],
    };
    page.value = previous.schema;
    saveVersion.value++;
    // 延迟重置标记，让 autoSave 的 watch 能检测到
    queueMicrotask(() => {
      isRestoring.value = false;
    });
  };

  const redo = () => {
    if (history.value.future.length === 0) return;

    isRestoring.value = true;
    const next = history.value.future[0];
    const newFuture = history.value.future.slice(1);

    history.value = {
      past: [...history.value.past, { schema: deepClone(page.value), timestamp: Date.now() }],
      future: newFuture,
    };
    page.value = next.schema;
    saveVersion.value++;
    queueMicrotask(() => {
      isRestoring.value = false;
    });
  };

  // 剪贴板操作
  const copyComponent = () => {
    // 多选时复制所有选中的组件，否则复制当前选中的
    if (selectedIds.value.length > 1) {
      clipboard.value = selectedIds.value
        .map((id) => getComponentById(id))
        .filter((c): c is ComponentSchema => !!c)
        .map((c) => deepClone(c));
    } else if (selectedId.value) {
      const component = getComponentById(selectedId.value);
      if (component) {
        clipboard.value = [deepClone(component)];
      }
    }
  };

  const pasteComponent = () => {
    if (clipboard.value.length === 0) return;

    saveToHistory();

    const insertIndex = selectedId.value
      ? page.value.children.findIndex((c) => c.id === selectedId.value) + 1
      : page.value.children.length;

    // 结构共享插入：逐条复制组件树后插入，逐层重建容器对象
    let newChildren = page.value.children;
    let lastInsertedId: string | null = null;

    for (let i = 0; i < clipboard.value.length; i++) {
      const copied = clipboard.value[i];
      const newComponent = duplicateComponentTree(copied);
      newChildren = [...newChildren];
      newChildren.splice(insertIndex + i, 0, newComponent);
      lastInsertedId = newComponent.id;
    }

    page.value = { ...page.value, children: newChildren };
    if (lastInsertedId) {
      selectedId.value = lastInsertedId;
    }
  };

  /**
   * 直接插入一个已有的组件树（保留子组件结构），用于复制/粘贴/拖拽场景。
   * 与 addComponent 不同：addComponent 会新建组件并忽略 children。
   */
  const insertComponentTree = (componentTree: ComponentSchema, parentId: string, index: number) => {
    saveToHistory();

    let newChildren: ComponentSchema[];
    if (parentId === 'root') {
      newChildren = [...page.value.children];
      newChildren.splice(index, 0, componentTree);
    } else {
      newChildren = insertComponent(page.value.children, parentId, index, componentTree);
    }

    page.value = { ...page.value, children: newChildren };
    selectedId.value = componentTree.id;
  };

  return {
    page,
    selectedId,
    selectedIds,
    hoveredId,
    isDragging,
    canvasScale,
    canvasOffset,
    showGrid,
    snapToGrid,
    gridSize,
    clipboard,
    history,
    saveVersion,
    isRestoring,
    componentIndex,
    isMultiSelect,
    selectedComponents,
    getComponentById,
    setPage,
    setSelectedId,
    toggleSelection,
    setHoveredId,
    setDragging,
    setCanvasScale,
    setCanvasOffset,
    toggleGrid,
    toggleSnapToGrid,
    addComponent,
    updateComponent: updateComponentById,
    deleteComponent,
    moveComponent,
    copyComponent,
    pasteComponent,
    insertComponentTree,
    undo,
    redo,
    saveToHistory,
  };
});
