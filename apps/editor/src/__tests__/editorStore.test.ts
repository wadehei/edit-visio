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

    it('should expose a stable store id', () => {
      expect(useEditorStore().$id).toBe('editor');
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

    it('should push a valid snapshot on redo so it can be undone again', () => {
      const store = useEditorStore();
      store.addComponent('text', 'root', 0, { content: 'hello' }, {});

      store.undo();
      store.redo();
      expect(store.page.children).toHaveLength(1);

      // redo 写入的历史条目必须含 schema，否则再次 undo 会丢失状态
      store.undo();
      expect(store.page.children).toHaveLength(0);
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

    it('should keep history snapshots isolated from later edits', () => {
      const store = useEditorStore();
      store.addComponent('text', 'root', 0, { content: 'v1' }, {});
      const compId = store.page.children[0].id;

      // 后续编辑基于结构共享生成新组件对象，不应污染 history 中保存的旧快照
      store.updateComponent(compId, { props: { content: 'v2' } });
      const lastSnapshot = store.history.past[store.history.past.length - 1];
      expect(lastSnapshot.schema.children[0].props.content).toBe('v1');

      store.undo();
      expect(store.page.children[0].props.content).toBe('v1');
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

    it('should index leaf components that omit the optional children field', () => {
      const store = useEditorStore();
      // children 为可选字段：叶子组件可省略，索引时不应递归进入 undefined
      store.setPage({
        ...store.page,
        children: [{ id: 'leaf', type: 'text', props: {}, styles: {} }],
      });

      expect(store.getComponentById('leaf')).toBeDefined();
      expect(store.getComponentById('leaf')!.id).toBe('leaf');
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

  describe('selection & multi-select', () => {
    it('should sync selectedIds with setSelectedId', () => {
      const store = useEditorStore();
      store.setSelectedId('a');
      expect(store.selectedIds).toEqual(['a']);

      store.setSelectedId(null);
      expect(store.selectedIds).toEqual([]);
    });

    it('should add an unselected id and point selectedId at it', () => {
      const store = useEditorStore();
      store.toggleSelection('a');
      expect(store.selectedIds).toEqual(['a']);
      expect(store.selectedId).toBe('a');

      store.toggleSelection('b');
      expect(store.selectedIds).toEqual(['a', 'b']);
      // selectedId 始终指向最后选中的
      expect(store.selectedId).toBe('b');
    });

    it('should remove an already-selected id when toggled again', () => {
      const store = useEditorStore();
      store.toggleSelection('a');
      store.toggleSelection('b');
      store.toggleSelection('a');

      expect(store.selectedIds).not.toContain('a');
      expect(store.selectedIds).toEqual(['b']);
      expect(store.selectedId).toBe('b');
    });

    it('should clear selectedId once the last selection is toggled off', () => {
      const store = useEditorStore();
      store.toggleSelection('a');
      store.toggleSelection('a');

      expect(store.selectedIds).toEqual([]);
      expect(store.selectedId).toBeNull();
    });

    it('should report isMultiSelect only when more than one id is selected', () => {
      const store = useEditorStore();
      expect(store.isMultiSelect).toBe(false);
      store.toggleSelection('a');
      expect(store.isMultiSelect).toBe(false);
      store.toggleSelection('b');
      expect(store.isMultiSelect).toBe(true);
      store.toggleSelection('b');
      expect(store.isMultiSelect).toBe(false);
    });

    it('should resolve selectedComponents and drop ids that no longer exist', () => {
      const store = useEditorStore();
      store.addComponent('text', 'root', 0, { content: 'A' }, {});
      const aId = store.page.children[0].id;

      store.setSelectedId(aId);
      store.toggleSelection('ghost-id');

      expect(store.selectedComponents).toHaveLength(1);
      expect(store.selectedComponents[0].id).toBe(aId);
      expect(store.selectedComponents[0].props.content).toBe('A');
    });

    it('should toggle the dragging flag', () => {
      const store = useEditorStore();
      expect(store.isDragging).toBe(false);
      store.setDragging(true);
      expect(store.isDragging).toBe(true);
      store.setDragging(false);
      expect(store.isDragging).toBe(false);
    });
  });

  describe('clipboard (copy / paste)', () => {
    it('should copy the single selected component', () => {
      const store = useEditorStore();
      store.addComponent('text', 'root', 0, { content: 'A' }, {});
      const aId = store.page.children[0].id;
      store.setSelectedId(aId);

      store.copyComponent();

      expect(store.clipboard).toHaveLength(1);
      expect(store.clipboard[0].id).toBe(aId);
      expect(store.clipboard[0].props.content).toBe('A');
    });

    it('should copy every component when multiple are selected', () => {
      const store = useEditorStore();
      store.addComponent('text', 'root', 0, { content: 'A' }, {});
      store.addComponent('text', 'root', 1, { content: 'B' }, {});
      const [a, b] = store.page.children;
      store.setSelectedId(a.id);
      store.toggleSelection(b.id);

      store.copyComponent();

      expect(store.clipboard).toHaveLength(2);
      expect(store.clipboard.map((c) => c.props.content)).toEqual(['A', 'B']);
      // 剪贴板存的是深拷贝，不与页面节点共享引用
      expect(store.clipboard[0]).not.toBe(store.page.children[0]);
    });

    it('should skip missing ids when copying a multi-selection', () => {
      const store = useEditorStore();
      store.addComponent('text', 'root', 0, { content: 'A' }, {});
      const aId = store.page.children[0].id;
      store.setSelectedId(aId);
      store.toggleSelection('ghost-id');

      store.copyComponent();

      // 多选中失效的 id 应被过滤，不得进入剪贴板
      expect(store.clipboard).toHaveLength(1);
      expect(store.clipboard[0].id).toBe(aId);
    });

    it('should leave the clipboard untouched when nothing is selected', () => {
      const store = useEditorStore();
      store.addComponent('text', 'root', 0, { content: 'A' }, {});
      store.setSelectedId(store.page.children[0].id);
      store.copyComponent();
      const copied = store.clipboard;

      store.setSelectedId(null);
      store.copyComponent();

      expect(store.clipboard).toBe(copied);
    });

    it('should keep the clipboard when the selected id no longer exists', () => {
      const store = useEditorStore();
      store.addComponent('text', 'root', 0, { content: 'A' }, {});
      store.setSelectedId(store.page.children[0].id);
      store.copyComponent();
      const copied = store.clipboard;
      expect(copied).toHaveLength(1);

      // 选中一个已不存在的 id，再次复制不应清空或污染剪贴板
      store.setSelectedId('ghost-id');
      store.copyComponent();

      expect(store.clipboard).toBe(copied);
    });

    it('should insert the copy right after the selected component', () => {
      const store = useEditorStore();
      store.addComponent('text', 'root', 0, { content: 'A' }, {});
      store.addComponent('text', 'root', 1, { content: 'B' }, {});
      store.addComponent('text', 'root', 2, { content: 'C' }, {});
      const bId = store.page.children[1].id;
      store.setSelectedId(bId);
      store.copyComponent();

      store.pasteComponent();

      expect(store.page.children).toHaveLength(4);
      expect(store.page.children[0].props.content).toBe('A');
      expect(store.page.children[1].id).toBe(bId); // 原 B 留在原位
      expect(store.page.children[2].id).not.toBe(bId); // 副本紧随其后
      expect(store.page.children[3].props.content).toBe('C');
      expect(store.selectedId).toBe(store.page.children[2].id);
    });

    it('should append at the end when nothing is selected', () => {
      const store = useEditorStore();
      store.addComponent('text', 'root', 0, { content: 'A' }, {});
      store.setSelectedId(store.page.children[0].id);
      store.copyComponent();
      const beforeLen = store.page.children.length;

      store.setSelectedId(null);
      store.pasteComponent();

      expect(store.page.children).toHaveLength(beforeLen + 1);
      expect(store.page.children[store.page.children.length - 1].props.content).toBe('A');
    });

    it('should paste a multi-selection in order and select the last pasted', () => {
      const store = useEditorStore();
      store.addComponent('text', 'root', 0, { content: 'A' }, {});
      store.addComponent('text', 'root', 1, { content: 'B' }, {});
      const [a, b] = store.page.children;
      store.setSelectedId(a.id);
      store.toggleSelection(b.id);
      store.copyComponent();

      store.setSelectedId(null);
      store.pasteComponent();

      expect(store.page.children).toHaveLength(4);
      expect(store.page.children[2].props.content).toBe('A');
      expect(store.page.children[3].props.content).toBe('B');
      expect(store.selectedId).toBe(store.page.children[3].id);
    });

    it('should do nothing when pasting an empty clipboard', () => {
      const store = useEditorStore();
      store.addComponent('text', 'root', 0, { content: 'A' }, {});
      const before = store.page.children;
      const historyLen = store.history.past.length;

      store.pasteComponent();

      expect(store.page.children).toBe(before);
      expect(store.history.past).toHaveLength(historyLen);
    });

    it('should record paste in history', () => {
      const store = useEditorStore();
      store.addComponent('text', 'root', 0, { content: 'A' }, {});
      store.setSelectedId(store.page.children[0].id);
      store.copyComponent();
      const historyLen = store.history.past.length;

      store.pasteComponent();

      expect(store.history.past.length).toBe(historyLen + 1);
    });
  });

  describe('deleteComponent (multi-select)', () => {
    it('should delete every selected component when more than one is selected', () => {
      const store = useEditorStore();
      store.addComponent('text', 'root', 0, { content: 'A' }, {});
      store.addComponent('text', 'root', 1, { content: 'B' }, {});
      store.addComponent('text', 'root', 2, { content: 'C' }, {});
      const a = store.page.children[0];
      const c = store.page.children[2];
      store.setSelectedId(a.id);
      store.toggleSelection(store.page.children[1].id);

      store.deleteComponent(a.id);

      expect(store.page.children).toHaveLength(1);
      expect(store.page.children[0].id).toBe(c.id);
      expect(store.selectedId).toBeNull();
      expect(store.selectedIds).toEqual([]);
    });

    it('should delete only the given component when a single one is selected', () => {
      const store = useEditorStore();
      store.addComponent('text', 'root', 0, { content: 'A' }, {});
      store.addComponent('text', 'root', 1, { content: 'B' }, {});
      const [a, b] = store.page.children;
      store.setSelectedId(a.id);

      store.deleteComponent(a.id);

      expect(store.page.children).toHaveLength(1);
      expect(store.page.children[0].id).toBe(b.id);
    });

    it('should delete the given component even if a different one is selected', () => {
      const store = useEditorStore();
      store.addComponent('text', 'root', 0, { content: 'A' }, {});
      store.addComponent('text', 'root', 1, { content: 'B' }, {});
      const a = store.page.children[0];
      const b = store.page.children[1];
      store.setSelectedId(a.id);

      store.deleteComponent(b.id);

      expect(store.page.children).toHaveLength(1);
      expect(store.page.children[0].id).toBe(a.id);
      // 被删除的不是当前选中项，选中态应保留
      expect(store.selectedId).toBe(a.id);
      expect(store.selectedIds).toEqual([a.id]);
    });
  });

  describe('nested container operations', () => {
    const makeTree = (id: string) => ({
      id,
      type: 'text',
      props: {},
      styles: {},
      children: [],
    });

    it('should add a component into a non-root parent', () => {
      const store = useEditorStore();
      store.addComponent('container', 'root', 0, {}, {});
      const containerId = store.page.children[0].id;

      store.addComponent('text', containerId, 0, { content: 'nested' }, {});

      expect(store.page.children).toHaveLength(1);
      expect(store.page.children[0].children).toHaveLength(1);
      expect(store.page.children[0].children![0].props.content).toBe('nested');
      expect(store.selectedId).toBe(store.page.children[0].children![0].id);
    });

    it('should move a component into a non-root parent', () => {
      const store = useEditorStore();
      store.addComponent('container', 'root', 0, {}, {});
      const containerId = store.page.children[0].id;
      store.addComponent('text', 'root', 1, { content: 'movable' }, {});
      const movableId = store.page.children[1].id;
      const historyLen = store.history.past.length;

      store.moveComponent(movableId, containerId, 0);

      expect(store.page.children).toHaveLength(1);
      expect(store.page.children[0].children).toHaveLength(1);
      expect(store.page.children[0].children![0].id).toBe(movableId);
      expect(store.page.children[0].children![0].props.content).toBe('movable');
      expect(store.history.past.length).toBe(historyLen + 1);
    });

    it('should insert a component tree into a non-root parent', () => {
      const store = useEditorStore();
      store.addComponent('container', 'root', 0, {}, {});
      const containerId = store.page.children[0].id;

      store.insertComponentTree(makeTree('inside-1'), containerId, 0);

      expect(store.page.children[0].children).toHaveLength(1);
      expect(store.page.children[0].children![0].id).toBe('inside-1');
      expect(store.selectedId).toBe('inside-1');
    });

    it('should keep existing siblings when inserting a tree at root', () => {
      const store = useEditorStore();
      store.addComponent('text', 'root', 0, { content: 'existing' }, {});
      const existingId = store.page.children[0].id;

      store.insertComponentTree(makeTree('inserted-1'), 'root', 1);

      expect(store.page.children).toHaveLength(2);
      expect(store.page.children[0].id).toBe(existingId);
      expect(store.page.children[0].props.content).toBe('existing');
      expect(store.page.children[1].id).toBe('inserted-1');
    });
  });

  describe('history bound & isRestoring', () => {
    it('should cap history at MAX_HISTORY_SIZE (20) entries, keeping the most recent', () => {
      const store = useEditorStore();
      for (let i = 0; i < 25; i++) {
        store.addComponent('text', 'root', 0, { content: `c${i}` }, {});
      }

      expect(store.history.past).toHaveLength(20);
      // 每次 addComponent 先快照再加组件，故第 n 次快照含 n-1 个组件；
      // 保留窗口为第 6..25 次快照 → 5..24 个组件
      expect(store.history.past[0].schema.children).toHaveLength(5);
      expect(store.history.past[19].schema.children).toHaveLength(24);
    });

    it('should move the current state into future on undo and back on redo', () => {
      const store = useEditorStore();
      store.addComponent('text', 'root', 0, { content: 'A' }, {});
      expect(store.history.past).toHaveLength(1);

      store.undo();
      expect(store.history.past).toHaveLength(0);
      expect(store.history.future).toHaveLength(1);
      expect(store.history.future[0].schema.children).toHaveLength(1);

      store.redo();
      expect(store.history.past).toHaveLength(1);
      expect(store.history.future).toHaveLength(0);
    });

    it('should flag isRestoring during undo and reset it afterwards', async () => {
      const store = useEditorStore();
      store.addComponent('text', 'root', 0, {}, {});

      store.undo();
      expect(store.isRestoring).toBe(true);
      await Promise.resolve();
      expect(store.isRestoring).toBe(false);
    });

    it('should flag isRestoring during redo and reset it afterwards', async () => {
      const store = useEditorStore();
      store.addComponent('text', 'root', 0, {}, {});
      store.undo();
      // 先冲掉 undo 的微任务复位，避免掩盖 redo 自身的复位
      await Promise.resolve();
      expect(store.isRestoring).toBe(false);

      store.redo();
      expect(store.isRestoring).toBe(true);
      await Promise.resolve();
      expect(store.isRestoring).toBe(false);
    });

    it('should initialise transient state to empty / false', () => {
      const store = useEditorStore();
      expect(store.selectedIds).toEqual([]);
      expect(store.clipboard).toEqual([]);
      expect(store.isDragging).toBe(false);
      expect(store.isRestoring).toBe(false);
    });

    it('should create new components with an empty children array', () => {
      const store = useEditorStore();
      store.addComponent('text', 'root', 0, {}, {});
      expect(store.page.children[0].children).toEqual([]);
    });
  });
});
