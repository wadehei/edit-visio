import { describe, it, expect } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import fc from 'fast-check';
import { useEditorStore } from '../stores/editorStore';

/**
 * editorStore 的属性测试（property-based testing）。
 *
 * 目的：以随机化、可复现的方式验证 C2 性能优化的**正确性前提**——
 * 编辑动作全部通过结构共享生成新对象、从不原地修改既有节点，
 * 因此历史快照可以直接存引用（saveToHistory/undo/redo 去掉 deepClone）而不产生别名污染。
 *
 * 相比示例测试，属性测试能覆盖人手难以枚举的长随机操作序列。
 */

/** 历史栈上限，需与 editorStore 中 MAX_HISTORY_SIZE 保持一致 */
const MAX_HISTORY_SIZE = 50;

/** 用 JSON 序列化做确定性深比较（页面为纯数据，不含函数/循环引用） */
const stable = (value: unknown): string => JSON.stringify(value);

type Step =
  | { kind: 'add'; parent: number; index: number }
  | { kind: 'update'; target: number; value: number }
  | { kind: 'delete'; target: number }
  | { kind: 'move'; target: number; index: number }
  | { kind: 'undo' }
  | { kind: 'redo' };

const stepArb: fc.Arbitrary<Step> = fc.oneof(
  fc.record({ kind: fc.constant('add' as const), parent: fc.nat(), index: fc.nat() }),
  fc.record({ kind: fc.constant('update' as const), target: fc.nat(), value: fc.nat() }),
  fc.record({ kind: fc.constant('delete' as const), target: fc.nat() }),
  fc.record({ kind: fc.constant('move' as const), target: fc.nat(), index: fc.nat() }),
  fc.constant<Step>({ kind: 'undo' }),
  fc.constant<Step>({ kind: 'redo' }),
);

const scriptArb = fc.array(stepArb, { maxLength: 25 });

/**
 * 执行一段随机操作脚本，并在**每一步之后**校验：
 * 所有历史条目（past + future）的 schema 都未被后续编辑原地篡改。
 */
function runScript(script: Step[]): ReturnType<typeof useEditorStore> {
  setActivePinia(createPinia());
  const store = useEditorStore();

  // 已存在的节点 id 池，root 恒存在；编辑动作从中挑选目标
  const ids: string[] = ['root'];
  // 每个历史条目首次出现时的深快照，用于检测后续是否被原地篡改
  const frozen = new WeakMap<object, string>();

  const assertSnapshotsIntact = () => {
    for (const entry of [...store.history.past, ...store.history.future]) {
      const now = stable(entry.schema);
      const before = frozen.get(entry);
      if (before === undefined) {
        frozen.set(entry, now);
      } else {
        // 快照一旦写入就不应再变化；若变化说明存在原地修改（别名污染）
        expect(now).toBe(before);
      }
    }
  };

  for (const step of script) {
    switch (step.kind) {
      case 'add': {
        const parent = ids[step.parent % ids.length];
        store.addComponent('text', parent, step.index % 5, { content: 'v' }, {});
        const created = store.selectedId;
        if (created && store.getComponentById(created)) ids.push(created);
        break;
      }
      case 'update': {
        const target = ids[step.target % ids.length];
        store.updateComponent(target, { props: { content: `u${step.value}` } });
        break;
      }
      case 'delete': {
        store.deleteComponent(ids[step.target % ids.length]);
        break;
      }
      case 'move': {
        store.moveComponent(ids[step.target % ids.length], 'root', step.index % 5);
        break;
      }
      case 'undo': {
        store.undo();
        break;
      }
      case 'redo': {
        store.redo();
        break;
      }
    }
    assertSnapshotsIntact();
  }

  return store;
}

describe('editorStore 属性测试', () => {
  it('结构共享安全：任意编辑序列都不会原地篡改历史快照', () => {
    fc.assert(
      fc.property(scriptArb, (script) => {
        runScript(script);
      }),
    );
  }, 20_000);

  it('undo/redo 可逆：undo k 步再 redo k 步可精确还原状态', () => {
    fc.assert(
      fc.property(scriptArb, fc.nat(), (script, k) => {
        const store = runScript(script);
        const before = stable(store.page);

        const steps = Math.min(k, store.history.past.length);
        const undone: string[] = [];
        for (let i = 0; i < steps; i++) {
          store.undo();
          undone.push(stable(store.page));
        }

        const redone: string[] = [];
        for (let i = 0; i < steps; i++) {
          store.redo();
          redone.push(stable(store.page));
        }

        // 最终精确回到 undo 之前的状态（可逆性）
        expect(stable(store.page)).toBe(before);
        // 且 redo 逐步复现 undo 的逆向轨迹（无中间状态丢失）：
        // undo 走 [S(n-1)…S(n-k)]，redo 走 [S(n-k+1)…S(n)]，故 redone 前 k-1 项应为 undo 的逆序去掉最深一步
        expect(redone.slice(0, -1)).toEqual([...undone].reverse().slice(1));
      }),
    );
  }, 20_000);

  it('历史栈有界：无论执行多少操作，past 长度不超过上限', () => {
    fc.assert(
      fc.property(scriptArb, (script) => {
        const store = runScript(script);
        expect(store.history.past.length).toBeLessThanOrEqual(MAX_HISTORY_SIZE);
      }),
    );
  }, 20_000);
});

describe('结构共享（C2 优化前提）', () => {
  // 深证结论：真正的引用复用只发生在**根层**动作（addComponent/moveComponent/pasteComponent
  // 对 root 层做浅拷贝数组 + splice）。而 updateComponent/removeComponent/insertComponent 内部
  // 用 `if (component.children)` 判断，由于空数组 `[]` 也是真值，分支恒成立，
  // 导致整棵树的所有节点都被重建，叶子节点并不会被复用（见下方 root 级用例实测）。
  // 这不影响快照隔离的正确性（从不原地修改），属已知的性能实现细节。

  it('root 级新增复用既有兄弟节点引用（浅拷贝数组 + 插入）', () => {
    setActivePinia(createPinia());
    const store = useEditorStore();
    store.addComponent('text', 'root', 0, { content: 'a' }, {});
    const first = store.page.children[0];

    store.addComponent('text', 'root', 1, { content: 'b' }, {});

    expect(store.page.children).toHaveLength(2);
    // 既有兄弟节点未被重建，引用保持不变 → 证明未走全树深拷贝
    expect(store.page.children[0]).toBe(first);
  });

  it('updateComponent 会重建整棵树（children: [] 为真值导致叶子未被复用）', () => {
    setActivePinia(createPinia());
    const store = useEditorStore();
    store.addComponent('text', 'root', 0, { content: 'a' }, {});
    store.addComponent('text', 'root', 1, { content: 'b' }, {});
    store.addComponent('text', 'root', 2, { content: 'c' }, {});
    const [a, b, c] = store.page.children;

    store.updateComponent(b.id, { props: { content: 'B' } });

    // 内容正确
    expect(store.page.children[1].props.content).toBe('B');
    // 但未受影响的兄弟也被重建为新对象（当前实现的行为，记录在案）
    expect(store.page.children[0]).not.toBe(a);
    expect(store.page.children[2]).not.toBe(c);
  });
});
