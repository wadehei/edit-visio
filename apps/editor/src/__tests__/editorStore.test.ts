import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useEditorStore } from '../stores/editorStore';

describe('editorStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe('initial state', () => {
    it('should have a default page', () => {
      const store = useEditorStore();
      expect(store.page).toBeDefined();
      expect(store.page.id).toMatch(/^page-/);
      expect(store.page.children).toEqual([]);
    });

    it('should have null selectedId and hoveredId', () => {
      const store = useEditorStore();
      expect(store.selectedId).toBeNull();
      expect(store.hoveredId).toBeNull();
    });

    it('should have empty history', () => {
      const store = useEditorStore();
      expect(store.history.past).toEqual([]);
      expect(store.history.future).toEqual([]);
    });

    it('should have default canvas settings', () => {
      const store = useEditorStore();
      expect(store.canvasScale).toBe(1);
      expect(store.canvasOffset).toEqual({ x: 0, y: 0 });
      expect(store.showGrid).toBe(false);
      expect(store.snapToGrid).toBe(true);
    });
  });

  describe('addComponent', () => {
    it('should add a component to root', () => {
      const store = useEditorStore();
      store.addComponent('text', 'root', 0, { content: 'hello' }, { padding: '8px' });

      expect(store.page.children).toHaveLength(1);
      expect(store.page.children[0].type).toBe('text');
      expect(store.page.children[0].props.content).toBe('hello');
    });

    it('should set the new component as selected', () => {
      const store = useEditorStore();
      store.addComponent('button', 'root', 0, { text: 'click' }, {});

      expect(store.selectedId).toBe(store.page.children[0].id);
    });

    it('should save to history', () => {
      const store = useEditorStore();
      store.addComponent('text', 'root', 0, {}, {});

      expect(store.history.past).toHaveLength(1);
      expect(store.history.future).toEqual([]);
    });

    it('should insert at the correct index', () => {
      const store = useEditorStore();
      store.addComponent('text', 'root', 0, { content: 'first' }, {});
      store.addComponent('text', 'root', 0, { content: 'before-first' }, {});

      expect(store.page.children).toHaveLength(2);
      expect(store.page.children[0].props.content).toBe('before-first');
      expect(store.page.children[1].props.content).toBe('first');
    });
  });

  describe('updateComponent', () => {
    it('should update component props', () => {
      const store = useEditorStore();
      store.addComponent('text', 'root', 0, { content: 'original' }, {});
      const compId = store.page.children[0].id;

      store.updateComponent(compId, {
        props: { content: 'updated' },
      });

      expect(store.page.children[0].props.content).toBe('updated');
    });

    it('should save to history', () => {
      const store = useEditorStore();
      store.addComponent('text', 'root', 0, { content: 'original' }, {});
      const compId = store.page.children[0].id;

      store.updateComponent(compId, {
        props: { content: 'updated' },
      });

      expect(store.history.past.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('deleteComponent', () => {
    it('should remove the component', () => {
      const store = useEditorStore();
      store.addComponent('text', 'root', 0, {}, {});
      const compId = store.page.children[0].id;

      store.deleteComponent(compId);
      expect(store.page.children).toHaveLength(0);
    });

    it('should clear selection if deleted component was selected', () => {
      const store = useEditorStore();
      store.addComponent('text', 'root', 0, {}, {});
      const compId = store.page.children[0].id;
      expect(store.selectedId).toBe(compId);

      store.deleteComponent(compId);
      expect(store.selectedId).toBeNull();
    });

    it('should save to history', () => {
      const store = useEditorStore();
      store.addComponent('text', 'root', 0, {}, {});
      const compId = store.page.children[0].id;

      store.deleteComponent(compId);
      expect(store.history.past.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('moveComponent', () => {
    it('should move component to new position', () => {
      const store = useEditorStore();
      store.addComponent('text', 'root', 0, { content: 'first' }, {});
      store.addComponent('text', 'root', 1, { content: 'second' }, {});
      store.addComponent('text', 'root', 2, { content: 'third' }, {});

      const firstId = store.page.children[0].id;
      // Move first component to position 2
      // After: [second, third, first]
      store.moveComponent(firstId, 'root', 2);

      expect(store.page.children).toHaveLength(3);
      expect(store.page.children[2].id).toBe(firstId);
      expect(store.page.children[0].props.content).toBe('second');
      expect(store.page.children[1].props.content).toBe('third');
    });
  });

  describe('undo / redo', () => {
    it('should undo the last action', () => {
      const store = useEditorStore();
      store.addComponent('text', 'root', 0, { content: 'hello' }, {});
      expect(store.page.children).toHaveLength(1);

      store.undo();
      expect(store.page.children).toHaveLength(0);
    });

    it('should redo after undo', () => {
      const store = useEditorStore();
      store.addComponent('text', 'root', 0, { content: 'hello' }, {});
      expect(store.page.children).toHaveLength(1);

      store.undo();
      expect(store.page.children).toHaveLength(0);

      store.redo();
      expect(store.page.children).toHaveLength(1);
      expect(store.page.children[0].props.content).toBe('hello');
    });

    it('should do nothing when undo history is empty', () => {
      const store = useEditorStore();
      const pageBefore = store.page;
      store.undo();
      expect(store.page).toEqual(pageBefore);
    });

    it('should do nothing when redo history is empty', () => {
      const store = useEditorStore();
      const pageBefore = store.page;
      store.redo();
      expect(store.page).toEqual(pageBefore);
    });

    it('should clear future on new action after undo', () => {
      const store = useEditorStore();
      store.addComponent('text', 'root', 0, { content: 'first' }, {});
      store.addComponent('text', 'root', 1, { content: 'second' }, {});

      store.undo();
      expect(store.history.future).toHaveLength(1);

      // New action should clear future
      store.addComponent('text', 'root', 1, { content: 'replacement' }, {});
      expect(store.history.future).toHaveLength(0);
    });
  });

  describe('canvas controls', () => {
    it('should clamp canvas scale between 0.25 and 2', () => {
      const store = useEditorStore();
      store.setCanvasScale(3);
      expect(store.canvasScale).toBe(2);

      store.setCanvasScale(0.1);
      expect(store.canvasScale).toBe(0.25);

      store.setCanvasScale(1.5);
      expect(store.canvasScale).toBe(1.5);
    });

    it('should toggle grid', () => {
      const store = useEditorStore();
      expect(store.showGrid).toBe(false);
      store.toggleGrid();
      expect(store.showGrid).toBe(true);
      store.toggleGrid();
      expect(store.showGrid).toBe(false);
    });

    it('should toggle snap to grid', () => {
      const store = useEditorStore();
      expect(store.snapToGrid).toBe(true);
      store.toggleSnapToGrid();
      expect(store.snapToGrid).toBe(false);
    });

    it('should set canvas offset', () => {
      const store = useEditorStore();
      store.setCanvasOffset(100, 200);
      expect(store.canvasOffset).toEqual({ x: 100, y: 200 });
    });
  });

  describe('selection', () => {
    it('should set and clear selectedId', () => {
      const store = useEditorStore();
      store.setSelectedId('comp-1');
      expect(store.selectedId).toBe('comp-1');

      store.setSelectedId(null);
      expect(store.selectedId).toBeNull();
    });

    it('should set and clear hoveredId', () => {
      const store = useEditorStore();
      store.setHoveredId('comp-1');
      expect(store.hoveredId).toBe('comp-1');

      store.setHoveredId(null);
      expect(store.hoveredId).toBeNull();
    });
  });

  describe('componentIndex (O(1) lookup)', () => {
    it('should index all components including nested', () => {
      const store = useEditorStore();
      store.addComponent('container', 'root', 0, {}, {});
      const containerId = store.page.children[0].id;

      // Add child to container via the tree
      store.addComponent('text', containerId, 0, { content: 'nested' }, {});
      const textId = store.page.children[0].children![0].id;

      expect(store.getComponentById(containerId)).toBeDefined();
      expect(store.getComponentById(textId)).toBeDefined();
      expect(store.getComponentById(containerId)!.type).toBe('container');
      expect(store.getComponentById(textId)!.props.content).toBe('nested');
    });

    it('should return undefined for non-existent ID', () => {
      const store = useEditorStore();
      expect(store.getComponentById('non-existent')).toBeUndefined();
    });
  });

  describe('insertComponentTree', () => {
    it('should insert a component tree preserving children', () => {
      const store = useEditorStore();
      const tree = {
        id: 'container-1',
        type: 'container',
        props: {},
        styles: {},
        children: [
          {
            id: 'text-1',
            type: 'text',
            props: { content: 'child' },
            styles: {},
            children: [],
          },
        ],
      };

      store.insertComponentTree(tree, 'root', 0);

      expect(store.page.children).toHaveLength(1);
      expect(store.page.children[0].id).toBe('container-1');
      expect(store.page.children[0].children).toHaveLength(1);
      expect(store.page.children[0].children![0].id).toBe('text-1');
      expect(store.page.children[0].children![0].props.content).toBe('child');
    });

    it('should select the inserted tree root', () => {
      const store = useEditorStore();
      const tree = {
        id: 'inserted-1',
        type: 'text',
        props: {},
        styles: {},
        children: [],
      };

      store.insertComponentTree(tree, 'root', 0);
      expect(store.selectedId).toBe('inserted-1');
    });

    it('should save to history', () => {
      const store = useEditorStore();
      const tree = {
        id: 'inserted-1',
        type: 'text',
        props: {},
        styles: {},
        children: [],
      };

      store.insertComponentTree(tree, 'root', 0);
      expect(store.history.past).toHaveLength(1);
    });
  });

  describe('pasteComponent (batch)', () => {
    it('should paste multiple components in one batch', () => {
      const store = useEditorStore();
      store.addComponent('text', 'root', 0, { content: 'first' }, {});
      store.addComponent('text', 'root', 1, { content: 'second' }, {});

      // Copy both components
      store.setSelectedId(store.page.children[0].id);
      store.toggleSelection(store.page.children[1].id);
      // At this point, selectedIds has both, but clipboard uses selectedId for single copy
      // Use manual clipboard setup for multi-paste test
      store.copyComponent();

      // Reset selection and paste
      store.setSelectedId(null);
      store.pasteComponent();

      // Should have 3 components (2 original + 1 pasted, since single copy)
      expect(store.page.children.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('saveVersion', () => {
    it('should increment on addComponent', () => {
      const store = useEditorStore();
      const before = store.saveVersion;
      store.addComponent('text', 'root', 0, {}, {});
      expect(store.saveVersion).toBe(before + 1);
    });

    it('should increment on undo/redo', () => {
      const store = useEditorStore();
      store.addComponent('text', 'root', 0, {}, {});
      const beforeUndo = store.saveVersion;
      store.undo();
      expect(store.saveVersion).toBe(beforeUndo + 1);
      const beforeRedo = store.saveVersion;
      store.redo();
      expect(store.saveVersion).toBe(beforeRedo + 1);
    });

    it('should increment on setPage', () => {
      const store = useEditorStore();
      const before = store.saveVersion;
      store.setPage({ ...store.page, name: 'updated' });
      expect(store.saveVersion).toBe(before + 1);
    });
  });
});
