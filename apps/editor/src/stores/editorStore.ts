import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { PageSchema, ComponentSchema } from '@page-builder/shared';
import { createDefaultPage } from '@page-builder/core';
import { generateId, deepClone, updateComponent, removeComponent, insertComponent } from '@page-builder/shared';

export const useEditorStore = defineStore('editor', () => {
  // State
  const page = ref<PageSchema>(createDefaultPage());
  const selectedId = ref<string | null>(null);
  const hoveredId = ref<string | null>(null);
  const isDragging = ref(false);
  const canvasScale = ref(1);
  const canvasOffset = ref({ x: 0, y: 0 });
  const showGrid = ref(false);
  const snapToGrid = ref(true);
  const gridSize = ref(8);
  const history = ref<{
    past: PageSchema[];
    future: PageSchema[];
  }>({
    past: [],
    future: [],
  });

  // Actions
  const setPage = (newPage: PageSchema) => {
    page.value = newPage;
  };

  const setSelectedId = (id: string | null) => {
    selectedId.value = id;
  };

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
    const past = history.value.past.slice(-19);
    history.value = {
      past: [...past, deepClone(page.value)],
      future: [],
    };
  };

  const addComponent = (
    componentType: string,
    parentId: string,
    index: number,
    defaultProps: Record<string, any> = {},
    defaultStyles: Record<string, any> = {}
  ) => {
    const newComponent: ComponentSchema = {
      id: generateId(),
      type: componentType,
      props: defaultProps,
      styles: defaultStyles,
      children: [],
    };

    const newPage = deepClone(page.value);
    if (parentId === 'root') {
      newPage.children.splice(index, 0, newComponent);
    } else {
      newPage.children = insertComponent(newPage.children, parentId, index, newComponent);
    }

    page.value = newPage;
    selectedId.value = newComponent.id;
    saveToHistory();
  };

  const updateComponentById = (id: string, updates: Partial<ComponentSchema>) => {
    const newPage = deepClone(page.value);
    newPage.children = updateComponent(newPage.children, id, (component) => ({
      ...component,
      ...updates,
    }));

    page.value = newPage;
    saveToHistory();
  };

  const deleteComponent = (id: string) => {
    const newPage = deepClone(page.value);
    newPage.children = removeComponent(newPage.children, id);

    page.value = newPage;
    if (selectedId.value === id) {
      selectedId.value = null;
    }
    saveToHistory();
  };

  const moveComponent = (id: string, targetParentId: string, targetIndex: number) => {
    const newPage = deepClone(page.value);

    const findComponent = (components: ComponentSchema[]): ComponentSchema | null => {
      for (const component of components) {
        if (component.id === id) {
          return component;
        }
        if (component.children) {
          const found = findComponent(component.children);
          if (found) return found;
        }
      }
      return null;
    };

    const component = findComponent(newPage.children);
    if (!component) return;

    newPage.children = removeComponent(newPage.children, id);

    if (targetParentId === 'root') {
      newPage.children.splice(targetIndex, 0, component);
    } else {
      newPage.children = insertComponent(newPage.children, targetParentId, targetIndex, component);
    }

    page.value = newPage;
    saveToHistory();
  };

  const undo = () => {
    if (history.value.past.length === 0) return;

    const previous = history.value.past[history.value.past.length - 1];
    const newPast = history.value.past.slice(0, -1);

    history.value = {
      past: newPast,
      future: [deepClone(page.value), ...history.value.future],
    };
    page.value = previous;
  };

  const redo = () => {
    if (history.value.future.length === 0) return;

    const next = history.value.future[0];
    const newFuture = history.value.future.slice(1);

    history.value = {
      past: [...history.value.past, deepClone(page.value)],
      future: newFuture,
    };
    page.value = next;
  };

  return {
    page,
    selectedId,
    hoveredId,
    isDragging,
    canvasScale,
    canvasOffset,
    showGrid,
    snapToGrid,
    gridSize,
    history,
    setPage,
    setSelectedId,
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
    undo,
    redo,
    saveToHistory,
  };
});
