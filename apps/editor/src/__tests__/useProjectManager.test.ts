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

  it('createProject 同步失败时回退本地并提示', async () => {
    vi.mocked(projectApi.createProject).mockRejectedValue(new Error('net'));
    const pm = useProjectManager();

    pm.createProject('X');
    await flushPromises();

    expect(pm.projects.value).toHaveLength(1);
    expect(toast).toHaveBeenCalledWith('创建项目同步失败，已保存到本地', 'warning');
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
    expect(page.props.backgroundColor).toBe('#ffffff');
  });

  it('setCurrentProject 加载失败时保留现有数据', async () => {
    seedProjects([makeProject({ id: 'a' })]);
    vi.mocked(pageApi.getPages).mockRejectedValue(new Error('net'));

    const pm = useProjectManager();
    pm.setCurrentProject('a');
    await flushPromises();

    expect(pm.currentProjectId.value).toBe('a');
    expect(pm.projects.value[0].pages).toEqual([]);
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

  it('updatePageInProject 深拷贝替换页面内容', () => {
    seedProjects([makeProject({ id: 'p1', pages: [makePage('pa', '旧')] })]);
    const pm = useProjectManager();

    pm.updatePageInProject('p1', makePage('pa', '新'));

    expect(pm.projects.value[0].pages[0].name).toBe('新');
  });

  it('setCurrentPage 切换当前页面', () => {
    seedProjects([makeProject({ id: 'p1', pages: [makePage('pa'), makePage('pb')] })]);
    const pm = useProjectManager();

    pm.setCurrentPage('p1', 'pb');

    expect(pm.projects.value[0].currentPageId).toBe('pb');
  });

  it('duplicateProject 生成副本并调用复制接口', async () => {
    seedProjects([makeProject({ id: 'p1', name: '原本' })]);
    const pm = useProjectManager();

    const dup = pm.duplicateProject('p1');

    expect(dup?.name).toBe('原本 (副本)');
    expect(pm.projects.value).toHaveLength(2);
    await flushPromises();
    expect(vi.mocked(projectApi.copyProject)).toHaveBeenCalledWith('p1');
  });

  it('duplicateProject 对不存在的项目返回 null', () => {
    const pm = useProjectManager();
    expect(pm.duplicateProject('missing')).toBeNull();
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
  });

  it('loadProjectsFromAPI 失败时回退本地并提示', async () => {
    seedProjects([makeProject({ id: 'local' })]);
    vi.mocked(projectApi.getProjects).mockRejectedValue(new Error('net'));
    const pm = useProjectManager();

    const list = await pm.loadProjectsFromAPI();

    expect(list.map((p) => p.id)).toEqual(['local']);
    expect(toast).toHaveBeenCalledWith('从服务器加载项目失败，使用本地数据', 'warning');
  });
});
