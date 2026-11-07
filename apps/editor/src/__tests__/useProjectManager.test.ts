/* eslint-disable @typescript-eslint/unbound-method -- 断言 mock 方法调用需引用方法本身，非真实 this 绑定场景 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import type { PageSchema } from '@page-builder/shared';

vi.mock('../utils/toast', () => ({ toast: vi.fn() }));
vi.mock('../utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
// 保留真实实现并自动转为 spy，便于按用例替换返回值
vi.mock('../api/project', { spy: true });
vi.mock('../api/page', { spy: true });

import * as projectApi from '../api/project';
import * as pageApi from '../api/page';
import { toast } from '../utils/toast';
import { logger } from '../utils/logger';
import { useProjectManager } from '../composables/useProjectManager';
import type { Project } from '../composables/useProjectManager';

/** 构造 axios 风格的成功响应（composable 只消费 data 字段） */
function ok<T>(data: T) {
  return { data: { code: 0, data, message: 'ok' } } as never;
}

function makeProject(partial: Partial<Project> & { id: string }): Project {
  return {
    id: partial.id,
    name: partial.name ?? '项目',
    description: partial.description ?? '',
    pages: partial.pages ?? [],
    currentPageId: partial.currentPageId ?? '',
    createdAt: partial.createdAt ?? Date.now(),
    updatedAt: partial.updatedAt ?? Date.now(),
  };
}

function makePage(id: string, name = '页面'): PageSchema {
  return {
    id,
    name,
    version: '1.0.0',
    props: { title: name, backgroundColor: '#ffffff' },
    children: [],
  };
}

function seedProjects(projects: Project[], currentId?: string) {
  localStorage.setItem('page-builder-projects', JSON.stringify(projects));
  if (currentId) localStorage.setItem('page-builder-current-project', currentId);
}

/** 读取持久化到 localStorage 的项目列表 */
function readStoredProjects(): Project[] {
  return JSON.parse(localStorage.getItem('page-builder-projects')!) as Project[];
}

/** 取某个 mock 最近一次调用的第 n 个参数 */
function lastArg<T>(mock: { mock: { calls: unknown[][] } }, index: number): T {
  const calls = mock.mock.calls;
  return calls[calls.length - 1][index] as T;
}

describe('useProjectManager', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();

    vi.mocked(projectApi.getProjects).mockResolvedValue(ok({ list: [] }));
    vi.mocked(projectApi.createProject).mockResolvedValue(
      ok({ projectId: 42, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-02T00:00:00Z' }),
    );
    vi.mocked(projectApi.updateProject).mockResolvedValue(ok({ projectId: 1 }));
    vi.mocked(projectApi.deleteProject).mockResolvedValue(ok(null));
    vi.mocked(projectApi.copyProject).mockResolvedValue(
      ok({ projectId: 77, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-02T00:00:00Z' }),
    );
    vi.mocked(pageApi.getPages).mockResolvedValue(ok({ list: [] }));
    vi.mocked(pageApi.createPage).mockResolvedValue(ok({ pageId: 99 }));
    vi.mocked(pageApi.deletePage).mockResolvedValue(ok(null));
  });

  it('初始状态从 localStorage 恢复项目与当前项目', () => {
    seedProjects([makeProject({ id: 'a' }), makeProject({ id: 'b' })], 'b');

    const pm = useProjectManager();

    expect(pm.projects.value).toHaveLength(2);
    expect(pm.currentProjectId.value).toBe('b');
    expect(pm.currentProject.value?.id).toBe('b');
  });

  it('createProject 拒绝空名称并提示', () => {
    const pm = useProjectManager();

    expect(() => pm.createProject('   ')).toThrow('Project name cannot be empty');
    expect(toast).toHaveBeenCalledWith('项目名称不能为空', 'error');
    expect(pm.projects.value).toHaveLength(0);
  });

  it('createProject 拒绝超过 100 字符的名称', () => {
    const pm = useProjectManager();

    expect(() => pm.createProject('x'.repeat(101))).toThrow('Project name too long');
    expect(toast).toHaveBeenCalledWith('项目名称不能超过 100 个字符', 'error');
  });

  it('createProject 接受恰好 100 字符的名称', () => {
    const pm = useProjectManager();

    expect(() => pm.createProject('x'.repeat(100))).not.toThrow();
    expect(pm.projects.value).toHaveLength(1);
    expect(vi.mocked(projectApi.createProject)).toHaveBeenCalledWith({
      name: 'x'.repeat(100),
      description: '',
    });
  });

  it('createProject 默认描述为空串且页面/当前页初始值为空', () => {
    const pm = useProjectManager();

    const created = pm.createProject('X');

    expect(created.description).toBe('');
    expect(created.pages).toEqual([]);
    expect(created.currentPageId).toBe('');
  });

  it('createProject 裁剪并截断描述字段', () => {
    const pm = useProjectManager();
    const raw = `  ${'a'.repeat(600)}  `;

    const created = pm.createProject('X', raw);

    expect(created.description).toBe('a'.repeat(500));
    expect(created.description).toHaveLength(500);
    expect(vi.mocked(projectApi.createProject)).toHaveBeenCalledWith({
      name: 'X',
      description: 'a'.repeat(500),
    });
  });

  it('createProject 乐观写入后用 API 返回的真实 ID 替换', async () => {
    const pm = useProjectManager();

    const created = pm.createProject('  My Project  ', 'desc');

    expect(created.name).toBe('My Project');
    expect(pm.projects.value).toHaveLength(1);
    expect(vi.mocked(projectApi.createProject)).toHaveBeenCalledWith({
      name: 'My Project',
      description: 'desc',
    });
    expect(JSON.parse(localStorage.getItem('page-builder-projects')!)).toHaveLength(1);

    await flushPromises();

    expect(pm.projects.value[0].id).toBe('42');
  });

  it('createProject 完成后仅替换匹配项目的临时 ID 并持久化', async () => {
    seedProjects([makeProject({ id: 'keep', name: '旧项目' })]);
    const pm = useProjectManager();

    pm.createProject('新项目');
    await flushPromises();

    // 非匹配项目不受影响
    expect(pm.projects.value.find((p) => p.id === 'keep')?.name).toBe('旧项目');
    const created = pm.projects.value.find((p) => p.name === '新项目')!;
    expect(created.id).toBe('42');
    // .then 内的 saveProjectsToLocal 已把真实 ID 落盘
    expect(readStoredProjects().map((p) => p.id)).toEqual(['keep', '42']);
  });

  it('createProject 同步失败时回退本地并提示', async () => {
    vi.mocked(projectApi.createProject).mockRejectedValue(new Error('net'));
    const pm = useProjectManager();

    pm.createProject('X');
    await flushPromises();

    expect(pm.projects.value).toHaveLength(1);
    expect(toast).toHaveBeenCalledWith('创建项目同步失败，已保存到本地', 'warning');
    expect(logger.error).toHaveBeenCalledWith(
      'ProjectManager',
      'Failed to create project via API',
      expect.any(Error),
    );
  });

  it('deleteProject 删除项目并在删除当前项目时切换', async () => {
    seedProjects([makeProject({ id: 'a' }), makeProject({ id: 'b' })], 'a');
    const pm = useProjectManager();

    pm.deleteProject('a');

    expect(pm.projects.value.map((p) => p.id)).toEqual(['b']);
    expect(pm.currentProjectId.value).toBe('b');
    expect(localStorage.getItem('page-builder-current-project')).toBe('b');
    expect(vi.mocked(projectApi.deleteProject)).toHaveBeenCalledWith('a');
    await flushPromises();
  });

  it('deleteProject 删除最后一个项目后清空当前项目', () => {
    seedProjects([makeProject({ id: 'only' })], 'only');
    const pm = useProjectManager();

    pm.deleteProject('only');

    expect(pm.projects.value).toHaveLength(0);
    expect(pm.currentProjectId.value).toBeNull();
    expect(localStorage.getItem('page-builder-current-project')).toBeNull();
  });

  it('deleteProject 对不存在的 ID 无副作用', () => {
    seedProjects([makeProject({ id: 'a' })]);
    const pm = useProjectManager();

    pm.deleteProject('missing');

    expect(pm.projects.value).toHaveLength(1);
    expect(vi.mocked(projectApi.deleteProject)).not.toHaveBeenCalled();
  });

  it('deleteProject 持久化且删除非当前项时保持当前选中', () => {
    seedProjects(
      [makeProject({ id: 'a' }), makeProject({ id: 'c' }), makeProject({ id: 'b' })],
      'b',
    );
    const pm = useProjectManager();

    pm.deleteProject('a');

    expect(pm.projects.value.map((p) => p.id)).toEqual(['c', 'b']);
    expect(pm.currentProjectId.value).toBe('b');
    expect(readStoredProjects().map((p) => p.id)).toEqual(['c', 'b']);
  });

  it('deleteProject 同步失败时记录错误并提示', async () => {
    seedProjects([makeProject({ id: 'a' })]);
    vi.mocked(projectApi.deleteProject).mockRejectedValue(new Error('net'));
    const pm = useProjectManager();

    pm.deleteProject('a');
    await flushPromises();

    expect(logger.error).toHaveBeenCalledWith(
      'ProjectManager',
      'Failed to delete project via API',
      expect.any(Error),
    );
    expect(toast).toHaveBeenCalledWith('删除项目同步失败', 'warning');
  });

  it('updateProject 更新字段并仅提交 name/description', async () => {
    seedProjects([makeProject({ id: 'a', name: '旧名' })]);
    const pm = useProjectManager();

    pm.updateProject('a', { name: '新名', description: '说明', pages: [makePage('p1')] });

    expect(pm.projects.value[0].name).toBe('新名');
    expect(pm.projects.value[0].pages).toHaveLength(1);
    expect(vi.mocked(projectApi.updateProject)).toHaveBeenCalledWith('a', {
      name: '新名',
      description: '说明',
    });
    await flushPromises();
  });

  it('updateProject 仅替换匹配项目并持久化', () => {
    seedProjects([makeProject({ id: 'a', name: '旧' }), makeProject({ id: 'b', name: 'B' })]);
    const pm = useProjectManager();

    pm.updateProject('a', { name: '新' });

    expect(pm.projects.value.find((p) => p.id === 'b')!.name).toBe('B');
    expect(readStoredProjects().find((p) => p.id === 'a')!.name).toBe('新');
  });

  it('updateProject 仅提交已定义的键', () => {
    seedProjects([makeProject({ id: 'a', name: 'n', description: 'd' })]);
    const pm = useProjectManager();

    pm.updateProject('a', { description: 'new' });
    expect(lastArg(vi.mocked(projectApi.updateProject), 1)).toStrictEqual({
      description: 'new',
    });

    pm.updateProject('a', { pages: [] });
    expect(lastArg(vi.mocked(projectApi.updateProject), 1)).toStrictEqual({});
  });

  it('updateProject 同步失败时记录错误并提示', async () => {
    seedProjects([makeProject({ id: 'a' })]);
    vi.mocked(projectApi.updateProject).mockRejectedValue(new Error('net'));
    const pm = useProjectManager();

    pm.updateProject('a', { name: 'x' });
    await flushPromises();

    expect(logger.error).toHaveBeenCalledWith(
      'ProjectManager',
      'Failed to update project via API',
      expect.any(Error),
    );
    expect(toast).toHaveBeenCalledWith('更新项目同步失败', 'warning');
  });

  it('setCurrentProject 丢弃过期的页面加载响应', async () => {
    seedProjects([makeProject({ id: 'a' }), makeProject({ id: 'b' })]);

    const resolvers: Record<string, (value: unknown) => void> = {};
    vi.mocked(pageApi.getPages).mockImplementation(
      (id: string) =>
        new Promise((resolve) => {
          resolvers[id] = resolve;
        }) as never,
    );

    const pm = useProjectManager();
    pm.setCurrentProject('a');
    pm.setCurrentProject('b');

    resolvers.b(
      ok({ list: [{ pageId: 2, title: 'B', isHome: true, schema: makePage('2', 'B') }] }),
    );
    await flushPromises();
    resolvers.a(
      ok({ list: [{ pageId: 1, title: 'A', isHome: true, schema: makePage('1', 'A') }] }),
    );
    await flushPromises();

    expect(pm.projects.value.find((p) => p.id === 'b')!.pages.map((p) => p.name)).toEqual(['B']);
    expect(pm.projects.value.find((p) => p.id === 'a')!.pages).toEqual([]);
  });

  it('setCurrentProject 优先选中首页页面', async () => {
    seedProjects([makeProject({ id: 'a' })]);
    vi.mocked(pageApi.getPages).mockResolvedValue(
      ok({
        list: [
          { pageId: 1, title: 'First', isHome: false, schema: makePage('1', 'First') },
          { pageId: 2, title: 'Home', isHome: true, schema: makePage('2', 'Home') },
        ],
      }),
    );

    const pm = useProjectManager();
    pm.setCurrentProject('a');
    await flushPromises();

    expect(pm.projects.value[0].currentPageId).toBe('2');
    expect(pm.currentPage.value?.name).toBe('Home');
    // 加载完成后应持久化页面列表
    expect(readStoredProjects()[0].pages.map((p) => p.id)).toEqual(['1', '2']);
  });

  it('setCurrentProject 空页面列表时不选中且不产生告警', async () => {
    seedProjects([makeProject({ id: 'a' })]);
    vi.mocked(pageApi.getPages).mockResolvedValue(ok({ list: [] }));

    const pm = useProjectManager();
    pm.setCurrentProject('a');
    await flushPromises();

    expect(pm.projects.value[0].currentPageId).toBe('');
    // 空列表不应进入首页选择分支（否则会因访问 loadedPages[0] 抛错）
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('setCurrentProject 首页与页面 ID 不匹配时回退到首个页面', async () => {
    seedProjects([makeProject({ id: 'a' })]);
    vi.mocked(pageApi.getPages).mockResolvedValue(
      ok({ list: [{ pageId: 1, title: 'A', isHome: true, schema: makePage('X', 'A') }] }),
    );

    const pm = useProjectManager();
    pm.setCurrentProject('a');
    await flushPromises();

    expect(pm.projects.value[0].currentPageId).toBe('X');
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('setCurrentProject 对缺失 schema 的页面使用默认兜底', async () => {
    seedProjects([makeProject({ id: 'a' })]);
    vi.mocked(pageApi.getPages).mockResolvedValue(
      ok({ list: [{ pageId: 5, title: 'Legacy', isHome: false, schema: null }] }),
    );

    const pm = useProjectManager();
    pm.setCurrentProject('a');
    await flushPromises();

    const page = pm.projects.value[0].pages[0];
    expect(page.id).toBe('5');
    expect(page.name).toBe('Legacy');
    expect(page.version).toBe('1.0.0');
    expect(page.props.backgroundColor).toBe('#ffffff');
    expect(page.children).toEqual([]);
  });

  it('setCurrentProject 加载失败时保留现有数据', async () => {
    seedProjects([makeProject({ id: 'a' })]);
    vi.mocked(pageApi.getPages).mockRejectedValue(new Error('net'));

    const pm = useProjectManager();
    pm.setCurrentProject('a');
    await flushPromises();

    expect(pm.currentProjectId.value).toBe('a');
    expect(pm.projects.value[0].pages).toEqual([]);
    expect(logger.warn).toHaveBeenCalledWith(
      'ProjectManager',
      'Failed to load pages from API',
      expect.any(Error),
    );
  });

  it('addPageToProject 添加页面并用 API 返回的 ID 替换', async () => {
    seedProjects([makeProject({ id: 'p1' })]);
    const pm = useProjectManager();

    pm.addPageToProject('p1', makePage('tmp-1', '新页面'));

    expect(pm.projects.value[0].pages).toHaveLength(1);
    expect(pm.projects.value[0].currentPageId).toBe('tmp-1');

    await flushPromises();

    expect(pm.projects.value[0].pages[0].id).toBe('99');
    expect(pm.projects.value[0].currentPageId).toBe('99');
  });

  it('addPageToProject 仅更新匹配项目并持久化', () => {
    seedProjects([makeProject({ id: 'p1' }), makeProject({ id: 'p2' })]);
    const pm = useProjectManager();

    pm.addPageToProject('p1', makePage('tmp-1', '新页面'));

    const p2 = pm.projects.value.find((p) => p.id === 'p2')!;
    expect(p2.pages).toEqual([]);
    expect(p2.currentPageId).toBe('');
    expect(vi.mocked(pageApi.createPage)).toHaveBeenCalledWith('p1', { title: '新页面' });
    expect(
      readStoredProjects()
        .find((p) => p.id === 'p1')!
        .pages.map((pg) => pg.id),
    ).toEqual(['tmp-1']);
  });

  it('addPageToProject 对不存在的项目不调用创建接口', () => {
    seedProjects([makeProject({ id: 'p1' })]);
    const pm = useProjectManager();

    pm.addPageToProject('missing', makePage('x'));

    expect(vi.mocked(pageApi.createPage)).not.toHaveBeenCalled();
    expect(pm.projects.value[0].pages).toEqual([]);
  });

  it('addPageToProject 完成后仅替换匹配项目的页面 ID 并持久化', async () => {
    seedProjects([makeProject({ id: 'p1' }), makeProject({ id: 'p2' })]);
    const pm = useProjectManager();

    pm.addPageToProject('p1', makePage('tmp-1', '新页面'));
    const p2Ref = pm.projects.value.find((p) => p.id === 'p2')!;

    await flushPromises();

    // 非匹配项目对象保持引用不变（不可变更新）
    expect(pm.projects.value.find((p) => p.id === 'p2')).toBe(p2Ref);
    expect(pm.projects.value.find((p) => p.id === 'p1')!.pages.map((pg) => pg.id)).toEqual(['99']);
    expect(
      readStoredProjects()
        .find((p) => p.id === 'p1')!
        .pages.map((pg) => pg.id),
    ).toEqual(['99']);
  });

  it('removePageFromProject 删除页面并迁移 currentPageId', async () => {
    seedProjects([
      makeProject({ id: 'p1', pages: [makePage('pa'), makePage('pb')], currentPageId: 'pa' }),
    ]);
    const pm = useProjectManager();

    pm.removePageFromProject('p1', 'pa');

    expect(pm.projects.value[0].pages.map((p) => p.id)).toEqual(['pb']);
    expect(pm.projects.value[0].currentPageId).toBe('pb');
    expect(vi.mocked(pageApi.deletePage)).toHaveBeenCalledWith('p1', 'pa');
    await flushPromises();
  });

  it('removePageFromProject 仅过滤匹配项目并持久化', () => {
    seedProjects([
      makeProject({ id: 'p1', pages: [makePage('pa'), makePage('pb')], currentPageId: 'pb' }),
      makeProject({ id: 'p2', pages: [makePage('pc')], currentPageId: 'pc' }),
    ]);
    const pm = useProjectManager();

    const p2Ref = pm.projects.value.find((p) => p.id === 'p2')!;
    pm.removePageFromProject('p1', 'pa');

    expect(pm.projects.value.find((p) => p.id === 'p2')).toBe(p2Ref);
    expect(
      readStoredProjects()
        .find((p) => p.id === 'p1')!
        .pages.map((pg) => pg.id),
    ).toEqual(['pb']);
  });

  it('removePageFromProject 删除非当前页面时保留当前选中（不重算）', () => {
    seedProjects([
      makeProject({
        id: 'p1',
        pages: [makePage('pa'), makePage('pb'), makePage('pc')],
        currentPageId: 'pc',
      }),
    ]);
    const pm = useProjectManager();

    pm.removePageFromProject('p1', 'pa');

    expect(pm.projects.value[0].currentPageId).toBe('pc');
  });

  it('removePageFromProject 删除重复 ID 的当前页面时清空选中', () => {
    seedProjects([
      makeProject({ id: 'p1', pages: [makePage('dup'), makePage('dup')], currentPageId: 'dup' }),
    ]);
    const pm = useProjectManager();

    pm.removePageFromProject('p1', 'dup');

    expect(pm.projects.value[0].pages).toEqual([]);
    expect(pm.projects.value[0].currentPageId).toBe('');
  });

  it('removePageFromProject 同步失败时记录错误并提示', async () => {
    seedProjects([
      makeProject({ id: 'p1', pages: [makePage('pa'), makePage('pb')], currentPageId: 'pa' }),
    ]);
    vi.mocked(pageApi.deletePage).mockRejectedValue(new Error('net'));
    const pm = useProjectManager();

    pm.removePageFromProject('p1', 'pa');
    await flushPromises();

    expect(logger.error).toHaveBeenCalledWith(
      'ProjectManager',
      'Failed to delete page via API',
      expect.any(Error),
    );
    expect(toast).toHaveBeenCalledWith('删除页面同步失败', 'warning');
  });

  it('updatePageInProject 深拷贝替换页面内容', () => {
    seedProjects([makeProject({ id: 'p1', pages: [makePage('pa', '旧')] })]);
    const pm = useProjectManager();

    pm.updatePageInProject('p1', makePage('pa', '新'));

    expect(pm.projects.value[0].pages[0].name).toBe('新');
    expect(readStoredProjects()[0].pages[0].name).toBe('新');
  });

  it('setCurrentPage 切换当前页面', () => {
    seedProjects([makeProject({ id: 'p1', pages: [makePage('pa'), makePage('pb')] })]);
    const pm = useProjectManager();

    pm.setCurrentPage('p1', 'pb');

    expect(pm.projects.value[0].currentPageId).toBe('pb');
  });

  it('setCurrentPage 仅更新匹配项目并持久化', () => {
    seedProjects([makeProject({ id: 'p1' }), makeProject({ id: 'p2' })]);
    const pm = useProjectManager();

    pm.setCurrentPage('p1', 'x');

    expect(pm.projects.value.find((p) => p.id === 'p2')!.currentPageId).toBe('');
    expect(readStoredProjects().find((p) => p.id === 'p1')!.currentPageId).toBe('x');
  });

  it('duplicateProject 生成副本并调用复制接口', async () => {
    seedProjects([makeProject({ id: 'p1', name: '原本' })]);
    const pm = useProjectManager();

    const dup = pm.duplicateProject('p1');

    expect(dup?.name).toBe('原本 (副本)');
    expect(pm.projects.value).toHaveLength(2);
    expect(readStoredProjects()).toHaveLength(2);
    await flushPromises();
    expect(vi.mocked(projectApi.copyProject)).toHaveBeenCalledWith('p1');
  });

  it('duplicateProject 完成后用 API 返回的真实 ID 更新副本', async () => {
    seedProjects([makeProject({ id: 'p1', name: '原本' })]);
    const pm = useProjectManager();

    pm.duplicateProject('p1');
    await flushPromises();

    // 原项目不受影响
    expect(pm.projects.value.find((p) => p.name === '原本')!.id).toBe('p1');
    const copy = pm.projects.value.find((p) => p.name === '原本 (副本)')!;
    expect(copy.id).toBe('77');
    expect(copy.createdAt).toBe(new Date('2024-01-01T00:00:00Z').getTime());
    expect(copy.updatedAt).toBe(new Date('2024-01-02T00:00:00Z').getTime());
    // .then 内的 saveProjectsToLocal 已把真实 ID 落盘
    expect(readStoredProjects().map((p) => p.id)).toEqual(['p1', '77']);
  });

  it('duplicateProject 对不存在的项目返回 null', () => {
    const pm = useProjectManager();
    expect(pm.duplicateProject('missing')).toBeNull();
  });

  it('duplicateProject 非空列表下对不存在的项目返回 null', () => {
    seedProjects([makeProject({ id: 'p1' })]);
    const pm = useProjectManager();

    expect(pm.duplicateProject('missing')).toBeNull();
    expect(vi.mocked(projectApi.copyProject)).not.toHaveBeenCalled();
  });

  it('loadProjectsFromAPI 成功时映射服务端数据', async () => {
    vi.mocked(projectApi.getProjects).mockResolvedValue(
      ok({
        list: [
          {
            projectId: 1,
            name: 'API 项目',
            description: null,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-02T00:00:00Z',
          },
        ],
      }),
    );
    const pm = useProjectManager();

    const list = await pm.loadProjectsFromAPI();

    expect(list).toHaveLength(1);
    expect(pm.projects.value[0].id).toBe('1');
    expect(pm.projects.value[0].description).toBe('');
    expect(pm.projects.value[0].pages).toEqual([]);
    expect(pm.projects.value[0].currentPageId).toBe('');
    // 成功后持久化到本地
    expect(readStoredProjects().map((p) => p.id)).toEqual(['1']);
  });

  it('loadProjectsFromAPI 失败时回退本地并提示', async () => {
    seedProjects([makeProject({ id: 'local' })]);
    vi.mocked(projectApi.getProjects).mockRejectedValue(new Error('net'));
    const pm = useProjectManager();

    const list = await pm.loadProjectsFromAPI();

    expect(list.map((p) => p.id)).toEqual(['local']);
    expect(toast).toHaveBeenCalledWith('从服务器加载项目失败，使用本地数据', 'warning');
    expect(logger.warn).toHaveBeenCalledWith(
      'ProjectManager',
      'Failed to load projects from API, falling back to localStorage',
      expect.any(Error),
    );
  });

  it('本地项目 JSON 解析失败时回退为空数组', () => {
    localStorage.setItem('page-builder-projects', '{bad json');

    const pm = useProjectManager();

    expect(pm.projects.value).toEqual([]);
  });

  it('读取当前项目 ID 异常时回退为 null', () => {
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => {
      if (key === 'page-builder-current-project') throw new Error('read failure');
      return null;
    });

    const pm = useProjectManager();

    expect(pm.currentProjectId.value).toBeNull();
    expect(pm.projects.value).toEqual([]);
    getItemSpy.mockRestore();
  });

  it('写入项目存储失败时记录错误且不抛出', () => {
    const errorSpy = vi.spyOn(logger, 'error');
    const pm = useProjectManager();
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });

    expect(() => pm.createProject('X')).not.toThrow();
    expect(errorSpy).toHaveBeenCalledWith(
      'ProjectManager',
      'Failed to save projects to localStorage',
      expect.any(Error),
    );

    setItemSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('写入当前项目 ID 失败时记录错误', () => {
    seedProjects([makeProject({ id: 'a' })]);
    const errorSpy = vi.spyOn(logger, 'error');
    const pm = useProjectManager();
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });

    pm.setCurrentProject('a');

    expect(errorSpy).toHaveBeenCalledWith(
      'ProjectManager',
      'Failed to save current project id',
      expect.any(Error),
    );
    setItemSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('无当前项目或当前页面缺失时 currentPage 为 null', () => {
    const pm = useProjectManager();
    expect(pm.currentProject.value).toBeNull();
    expect(pm.currentPage.value).toBeNull();

    localStorage.clear();
    seedProjects(
      [makeProject({ id: 'a', pages: [makePage('p1')], currentPageId: 'missing' })],
      'a',
    );
    const pm2 = useProjectManager();
    expect(pm2.currentProject.value?.id).toBe('a');
    expect(pm2.currentPage.value).toBeNull();
  });

  it('删除非当前项目时不影响当前项目选中', async () => {
    seedProjects([makeProject({ id: 'a' }), makeProject({ id: 'b' })], 'a');
    const pm = useProjectManager();

    pm.deleteProject('b');

    expect(pm.projects.value.map((p) => p.id)).toEqual(['a']);
    expect(pm.currentProjectId.value).toBe('a');
    await flushPromises();
  });

  it('updateProject 对不存在的项目无副作用', () => {
    seedProjects([makeProject({ id: 'a', name: '原' })]);
    const pm = useProjectManager();

    pm.updateProject('missing', { name: 'x' });

    expect(pm.projects.value[0].name).toBe('原');
    expect(vi.mocked(projectApi.updateProject)).not.toHaveBeenCalled();
  });

  it('updateProject 仅提交已提供的字段', async () => {
    seedProjects([makeProject({ id: 'a', name: 'n', description: 'd' })]);
    const pm = useProjectManager();

    pm.updateProject('a', { description: 'new' });
    expect(vi.mocked(projectApi.updateProject)).toHaveBeenLastCalledWith('a', {
      description: 'new',
    });

    pm.updateProject('a', { pages: [] });
    expect(vi.mocked(projectApi.updateProject)).toHaveBeenLastCalledWith('a', {});
    await flushPromises();
  });

  it('setCurrentProject 无首页时选中第一个页面且不覆盖已有选中', async () => {
    seedProjects([makeProject({ id: 'a' }), makeProject({ id: 'b' })]);
    vi.mocked(pageApi.getPages).mockResolvedValue(
      ok({
        list: [
          { pageId: 1, title: 'F', isHome: false, schema: makePage('1', 'F') },
          { pageId: 2, title: 'S', isHome: false, schema: makePage('2', 'S') },
        ],
      }),
    );

    const pm = useProjectManager();
    pm.setCurrentProject('a');
    await flushPromises();

    expect(pm.projects.value.find((p) => p.id === 'a')!.currentPageId).toBe('1');
    expect(pm.projects.value.find((p) => p.id === 'b')!.pages).toEqual([]);
  });

  it('setCurrentProject 已有当前页面时不覆盖选中', async () => {
    seedProjects([makeProject({ id: 'a', pages: [makePage('keep')], currentPageId: 'keep' })]);
    vi.mocked(pageApi.getPages).mockResolvedValue(
      ok({ list: [{ pageId: 9, title: 'X', isHome: true, schema: makePage('9', 'X') }] }),
    );

    const pm = useProjectManager();
    pm.setCurrentProject('a');
    await flushPromises();

    expect(pm.projects.value[0].currentPageId).toBe('keep');
  });

  it('addPageToProject 对不存在的项目无副作用', () => {
    const pm = useProjectManager();

    pm.addPageToProject('missing', makePage('x'));

    expect(pm.projects.value).toEqual([]);
    expect(vi.mocked(pageApi.createPage)).not.toHaveBeenCalled();
  });

  it('addPageToProject 保留已有 currentPageId 并仅替换匹配页面', async () => {
    seedProjects([
      makeProject({ id: 'p1', pages: [makePage('p0')], currentPageId: 'p0' }),
      makeProject({ id: 'p2' }),
    ]);
    const pm = useProjectManager();

    pm.addPageToProject('p1', makePage('tmp-1', '新页面'));

    const p1 = pm.projects.value.find((p) => p.id === 'p1')!;
    expect(p1.currentPageId).toBe('p0');

    await flushPromises();

    const updated = pm.projects.value.find((p) => p.id === 'p1')!;
    expect(updated.pages.map((p) => p.id)).toEqual(['p0', '99']);
    expect(updated.currentPageId).toBe('p0');
  });

  it('addPageToProject 同步失败时提示', async () => {
    seedProjects([makeProject({ id: 'p1' })]);
    vi.mocked(pageApi.createPage).mockRejectedValue(new Error('net'));
    const pm = useProjectManager();

    pm.addPageToProject('p1', makePage('tmp-1'));
    await flushPromises();

    expect(toast).toHaveBeenCalledWith('创建页面同步失败，已保存到本地', 'warning');
    expect(logger.error).toHaveBeenCalledWith(
      'ProjectManager',
      'Failed to create page via API',
      expect.any(Error),
    );
  });

  it('removePageFromProject 对不存在项目或无匹配页面无副作用', () => {
    seedProjects([makeProject({ id: 'p1', pages: [makePage('pa')] })]);
    const pm = useProjectManager();

    pm.removePageFromProject('missing', 'pa');
    pm.removePageFromProject('p1', 'ghost');

    expect(pm.projects.value[0].pages.map((p) => p.id)).toEqual(['pa']);
    expect(vi.mocked(pageApi.deletePage)).not.toHaveBeenCalled();
  });

  it('removePageFromProject 删除非当前页面时保留选中', () => {
    seedProjects([
      makeProject({ id: 'p1', pages: [makePage('pa'), makePage('pb')], currentPageId: 'pb' }),
    ]);
    const pm = useProjectManager();

    pm.removePageFromProject('p1', 'pa');

    expect(pm.projects.value[0].currentPageId).toBe('pb');
  });

  it('removePageFromProject 删除最后一个页面时清空选中', () => {
    seedProjects([makeProject({ id: 'p1', pages: [makePage('only')], currentPageId: 'only' })]);
    const pm = useProjectManager();

    pm.removePageFromProject('p1', 'only');

    expect(pm.projects.value[0].pages).toEqual([]);
    expect(pm.projects.value[0].currentPageId).toBe('');
  });

  it('updatePageInProject 与 setCurrentPage 仅作用于匹配项', () => {
    seedProjects([
      makeProject({ id: 'p1', pages: [makePage('pa', '旧')] }),
      makeProject({ id: 'p2' }),
    ]);
    const pm = useProjectManager();

    pm.updatePageInProject('missing', makePage('pa', '新'));
    pm.updatePageInProject('p1', makePage('ghost', '新'));
    pm.setCurrentPage('missing', 'pa');

    expect(pm.projects.value.find((p) => p.id === 'p1')!.pages[0].name).toBe('旧');
  });

  it('duplicateProject 同步失败时提示', async () => {
    seedProjects([makeProject({ id: 'p1' })]);
    vi.mocked(projectApi.copyProject).mockRejectedValue(new Error('net'));
    const pm = useProjectManager();

    pm.duplicateProject('p1');
    await flushPromises();

    expect(toast).toHaveBeenCalledWith('复制项目同步失败，已保存到本地', 'warning');
    expect(logger.error).toHaveBeenCalledWith(
      'ProjectManager',
      'Failed to duplicate project via API',
      expect.any(Error),
    );
  });
});
