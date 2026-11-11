import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia } from 'pinia';
import LoginPage from '../views/LoginPage.vue';
import HomePage from '../views/HomePage.vue';
import EditorPage from '../views/EditorPage.vue';
import * as projectApi from '../api/project';
import * as pageApi from '../api/page';
import { useEditorStore } from '../stores/editorStore';
import { logger } from '../utils/logger';
import { toast } from '../utils/toast';
import type { PageVO } from '../api/page';
import type { Project } from '../api/project';
import type { ComponentSchema } from '@page-builder/shared';

/** 可跨用例控制的导航 / 鉴权桩 */
const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  openModal: vi.fn(),
  auth: {
    username: 'alice',
    isLoggedIn: true,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  },
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mocks.push, replace: mocks.replace }),
  useRoute: () => ({ params: { projectId: '42' }, query: {} }),
}));

vi.mock('../stores/authStore', () => ({
  useAuthStore: () => mocks.auth,
}));

vi.mock('../utils/toast');

vi.mock('../api/project');
vi.mock('../api/page', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/page')>();
  return { ...actual, getPages: vi.fn(), getPage: vi.fn(), createPage: vi.fn() };
});

vi.mock('../composables/useAutoSave', () => ({
  useAutoSave: () => ({ saveStatus: { value: 'idle' }, pendingSave: { value: false } }),
}));

vi.mock('../composables/useKeyboardShortcuts', () => ({
  useKeyboardShortcuts: () => {},
}));

// 内置应用内确认/输入对话框桩：默认确认，用例可按需覆盖返回值
vi.mock('../composables/useConfirm', () => ({
  confirmDialog: vi.fn(() => Promise.resolve(true)),
  promptDialog: vi.fn(() => Promise.resolve(null)),
}));

import { confirmDialog, promptDialog } from '../composables/useConfirm';

/** 暴露 openModal 的 TemplateModal 桩，便于验证「使用模板」按钮 */
const TemplateModalStub = defineComponent({
  setup(_, { expose }) {
    expose({ openModal: mocks.openModal });
    return () => h('div');
  },
});

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    projectId: 1,
    name: '示例项目',
    description: '描述',
    coverImage: '',
    status: 1,
    settings: {},
    pageCount: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makePage(overrides: Partial<PageVO> = {}): PageVO {
  return {
    pageId: 1,
    projectId: 42,
    title: '首页',
    path: '/',
    isHome: true,
    status: 1,
    version: 1,
    schema: { id: 'p1', name: '首页', children: [] },
    schemaSize: 0,
    componentCount: 0,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

function mockProjectList(list: Project[]) {
  vi.mocked(projectApi.getProjects).mockResolvedValue({
    data: { data: { list } },
  } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.username = 'alice';
  mocks.auth.isLoggedIn = true;
  // useTheme/ThemeSwitcher 依赖 matchMedia，jsdom 未实现
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
  vi.mocked(confirmDialog).mockResolvedValue(true);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('LoginPage', () => {
  async function fillAndSubmit(username: string, password: string) {
    const wrapper = mount(LoginPage);
    const inputs = wrapper.findAll('input');
    await inputs[0].setValue(username);
    await inputs[1].setValue(password);
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    return wrapper;
  }

  it('默认登录模式，切换后进入注册模式并展示邮箱字段', async () => {
    const wrapper = mount(LoginPage);
    expect(wrapper.text()).toContain('欢迎回来');
    expect(wrapper.text()).toContain('登 录');
    expect(wrapper.findAll('input')).toHaveLength(2);

    await wrapper.findAll('button').at(-1)!.trigger('click');

    expect(wrapper.text()).toContain('创建账号');
    expect(wrapper.findAll('input')).toHaveLength(3);
  });

  it('切换模式会清空已填写的表单', async () => {
    const wrapper = mount(LoginPage);
    await wrapper.findAll('input')[0].setValue('someone');

    await wrapper.findAll('button').at(-1)!.trigger('click');

    expect((wrapper.findAll('input')[0].element as HTMLInputElement).value).toBe('');
  });

  it('用户名为空时提示且不调用登录', async () => {
    const wrapper = await fillAndSubmit('', '123456');

    expect(wrapper.text()).toContain('请输入用户名');
    expect(mocks.auth.login).not.toHaveBeenCalled();
  });

  it('密码为空时提示', async () => {
    const wrapper = await fillAndSubmit('alice', '');

    expect(wrapper.text()).toContain('请输入密码');
  });

  it('密码不足 6 位时提示', async () => {
    const wrapper = await fillAndSubmit('alice', '123');

    expect(wrapper.text()).toContain('密码长度不能少于6位');
  });

  it('登录成功后跳转首页', async () => {
    mocks.auth.login.mockResolvedValue(undefined);

    await fillAndSubmit('alice', '123456');

    expect(mocks.auth.login).toHaveBeenCalledWith('alice', '123456');
    expect(mocks.push).toHaveBeenCalledWith('/');
  });

  it('登录失败时展示错误信息', async () => {
    mocks.auth.login.mockRejectedValue(new Error('用户名或密码错误'));

    const wrapper = await fillAndSubmit('alice', '123456');

    expect(wrapper.text()).toContain('用户名或密码错误');
  });

  it('注册模式下调用 register 并传入邮箱', async () => {
    mocks.auth.register.mockResolvedValue(undefined);

    const wrapper = mount(LoginPage);
    await wrapper.findAll('button').at(-1)!.trigger('click');
    const inputs = wrapper.findAll('input');
    await inputs[0].setValue('bob');
    await inputs[1].setValue('123456');
    await inputs[2].setValue('bob@example.com');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(mocks.auth.register).toHaveBeenCalledWith('bob', '123456', 'bob@example.com');
    expect(mocks.push).toHaveBeenCalledWith('/');
  });

  it('注册模式未填邮箱时传 undefined', async () => {
    mocks.auth.register.mockResolvedValue(undefined);

    const wrapper = mount(LoginPage);
    await wrapper.findAll('button').at(-1)!.trigger('click');
    const inputs = wrapper.findAll('input');
    await inputs[0].setValue('bob');
    await inputs[1].setValue('123456');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(mocks.auth.register).toHaveBeenCalledWith('bob', '123456', undefined);
  });
});

describe('HomePage', () => {
  it('加载成功后渲染项目网格与页面数量', async () => {
    mockProjectList([makeProject({ projectId: 1, name: '项目甲', pageCount: 3 })]);
    const wrapper = mount(HomePage);
    await flushPromises();

    expect(wrapper.text()).toContain('项目甲');
    expect(wrapper.text()).toContain('3 个页面');
  });

  it('无项目时展示空状态', async () => {
    mockProjectList([]);
    const wrapper = mount(HomePage);
    await flushPromises();

    expect(wrapper.text()).toContain('还没有项目');
  });

  it('加载失败时记录错误日志', async () => {
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
    vi.mocked(projectApi.getProjects).mockRejectedValue(new Error('网络错误'));

    const wrapper = mount(HomePage);
    await flushPromises();

    expect(errorSpy).toHaveBeenCalledWith('HomePage', '加载项目失败', expect.any(Error));
    expect(wrapper.text()).toContain('还没有项目');
  });

  it('按更新时间渲染相对时间', async () => {
    const now = Date.now();
    mockProjectList([
      makeProject({ projectId: 1, name: 'A', updatedAt: new Date(now).toISOString() }),
      makeProject({ projectId: 2, name: 'B', updatedAt: new Date(now - 86400000).toISOString() }),
      makeProject({
        projectId: 3,
        name: 'C',
        updatedAt: new Date(now - 3 * 86400000).toISOString(),
      }),
      makeProject({
        projectId: 4,
        name: 'D',
        updatedAt: new Date(now - 10 * 86400000).toISOString(),
      }),
    ]);
    const wrapper = mount(HomePage);
    await flushPromises();

    expect(wrapper.text()).toContain('今天');
    expect(wrapper.text()).toContain('昨天');
    expect(wrapper.text()).toContain('3天前');
    expect(wrapper.text()).toContain('1周前');
  });

  it('新建项目成功后关闭弹窗并刷新列表', async () => {
    mockProjectList([]);
    vi.mocked(projectApi.createProject).mockResolvedValue(undefined as never);

    const wrapper = mount(HomePage);
    await flushPromises();

    await wrapper
      .findAll('button')
      .find((b) => b.text().includes('新建项目'))!
      .trigger('click');
    await wrapper.find('input').setValue('全新项目');
    await wrapper
      .findAll('button')
      .find((b) => b.text() === '创建')!
      .trigger('click');
    await flushPromises();

    expect(projectApi.createProject).toHaveBeenCalledWith({
      name: '全新项目',
      description: undefined,
    });
    expect(vi.mocked(projectApi.getProjects).mock.calls).toHaveLength(2);
  });

  it('创建失败时弹出错误提示', async () => {
    mockProjectList([]);
    vi.mocked(projectApi.createProject).mockRejectedValue(new Error('重复名称'));

    const wrapper = mount(HomePage);
    await flushPromises();

    await wrapper
      .findAll('button')
      .find((b) => b.text().includes('新建项目'))!
      .trigger('click');
    await wrapper.find('input').setValue('全新项目');
    await wrapper
      .findAll('button')
      .find((b) => b.text() === '创建')!
      .trigger('click');
    await flushPromises();

    expect(toast).toHaveBeenCalledWith('创建失败: 重复名称', 'error');
  });

  it('删除项目需确认后调用接口', async () => {
    mockProjectList([makeProject({ projectId: 7, name: '待删' })]);
    vi.mocked(projectApi.deleteProject).mockResolvedValue(undefined as never);

    const wrapper = mount(HomePage);
    await flushPromises();

    await wrapper
      .findAll('button')
      .find((b) => b.text().includes('删除'))!
      .trigger('click');
    await flushPromises();

    expect(projectApi.deleteProject).toHaveBeenCalledWith('7');
  });

  it('取消确认时不删除', async () => {
    vi.mocked(confirmDialog).mockResolvedValue(false);
    mockProjectList([makeProject({ projectId: 7, name: '保留' })]);

    const wrapper = mount(HomePage);
    await flushPromises();

    await wrapper
      .findAll('button')
      .find((b) => b.text().includes('删除'))!
      .trigger('click');
    await flushPromises();

    expect(projectApi.deleteProject).not.toHaveBeenCalled();
  });

  it('重命名项目调用更新接口', async () => {
    vi.mocked(promptDialog).mockResolvedValue('新名称');
    mockProjectList([makeProject({ projectId: 9, name: '旧名' })]);
    vi.mocked(projectApi.updateProject).mockResolvedValue(undefined as never);

    const wrapper = mount(HomePage);
    await flushPromises();

    await wrapper
      .findAll('button')
      .find((b) => b.text().includes('重命名'))!
      .trigger('click');
    await flushPromises();

    expect(projectApi.updateProject).toHaveBeenCalledWith('9', { name: '新名称' });
  });

  it('退出登录后跳转登录页', async () => {
    mockProjectList([]);
    mocks.auth.logout.mockResolvedValue(undefined);

    const wrapper = mount(HomePage);
    await flushPromises();

    await wrapper.find('button[title="退出登录"]').trigger('click');
    await flushPromises();

    expect(mocks.auth.logout).toHaveBeenCalled();
    expect(mocks.push).toHaveBeenCalledWith('/login');
  });
});

describe('EditorPage', () => {
  const editorStubs = {
    ComponentPanel: true,
    PropertyPanel: true,
    Canvas: true,
    ErrorBoundary: true,
    TemplateModal: TemplateModalStub,
  };

  function mountEditor() {
    return mount(EditorPage, { global: { plugins: [createPinia()], stubs: editorStubs } });
  }

  function mockLoadSuccess(pages: PageVO[] = [makePage()]) {
    vi.mocked(projectApi.getProject).mockResolvedValue({
      data: { data: { name: '示例项目' } },
    } as never);
    vi.mocked(pageApi.getPages).mockResolvedValue({
      data: { data: { list: pages } },
    } as never);
    // 列表接口不返回 schema，详情接口按 pageId 返回带 schema 的页面
    vi.mocked(pageApi.getPage).mockImplementation((_projectId, pageId) => {
      const found = pages.find((p) => String(p.pageId) === String(pageId)) ?? makePage();
      return { data: { data: found } } as never;
    });
  }

  beforeEach(() => {
    vi.stubGlobal('open', vi.fn());
  });

  it('加载项目与页面成功后渲染标题并选中首页', async () => {
    mockLoadSuccess([
      makePage({ pageId: 1, title: '首页', isHome: true }),
      makePage({ pageId: 2, title: '关于', isHome: false }),
    ]);

    const wrapper = mountEditor();
    await flushPromises();

    expect(wrapper.text()).toContain('示例项目');
    expect(wrapper.text()).toContain('2 个页面');
    expect(wrapper.text()).toContain('首页');
    expect(wrapper.text()).toContain('关于');
  });

  it('列表不含 schema 时通过页面详情接口回显组件', async () => {
    const comp: ComponentSchema = { id: 'c1', type: 'text', props: { content: 'x' }, styles: {} };
    vi.mocked(projectApi.getProject).mockResolvedValue({
      data: { data: { name: '示例项目' } },
    } as never);
    vi.mocked(pageApi.getPages).mockResolvedValue({
      data: { data: { list: [makePage({ pageId: 7, schema: null as never })] } },
    } as never);
    vi.mocked(pageApi.getPage).mockResolvedValue({
      data: {
        data: makePage({
          pageId: 7,
          schema: { id: 'p7', name: '详情页', children: [comp] },
        }),
      },
    } as never);

    const pinia = createPinia();
    mount(EditorPage, { global: { plugins: [pinia], stubs: editorStubs } });
    await flushPromises();

    expect(pageApi.getPage).toHaveBeenCalledWith('42', '7');
    const store = useEditorStore(pinia);
    expect(store.page.children).toHaveLength(1);
    expect(store.page.children[0].id).toBe('c1');
  });

  it('详情接口失败时回退使用列表自带的 schema', async () => {
    const comp: ComponentSchema = { id: 'c9', type: 'button', props: {}, styles: {} };
    vi.mocked(projectApi.getProject).mockResolvedValue({
      data: { data: { name: '示例项目' } },
    } as never);
    vi.mocked(pageApi.getPages).mockResolvedValue({
      data: {
        data: {
          list: [makePage({ pageId: 8, schema: { id: 'p8', name: '列表页', children: [comp] } })],
        },
      },
    } as never);
    vi.mocked(pageApi.getPage).mockRejectedValue(new Error('500'));

    const pinia = createPinia();
    mount(EditorPage, { global: { plugins: [pinia], stubs: editorStubs } });
    await flushPromises();

    const store = useEditorStore(pinia);
    expect(store.page.children).toHaveLength(1);
    expect(store.page.children[0].id).toBe('c9');
  });

  it('详情 schema 为空时重置为空白页', async () => {
    vi.mocked(projectApi.getProject).mockResolvedValue({
      data: { data: { name: '示例项目' } },
    } as never);
    vi.mocked(pageApi.getPages).mockResolvedValue({
      data: { data: { list: [makePage({ pageId: 9, schema: null as never })] } },
    } as never);
    vi.mocked(pageApi.getPage).mockResolvedValue({
      data: { data: makePage({ pageId: 9, schema: null as never }) },
    } as never);

    const pinia = createPinia();
    mount(EditorPage, { global: { plugins: [pinia], stubs: editorStubs } });
    await flushPromises();

    const store = useEditorStore(pinia);
    expect(store.page.children).toHaveLength(0);
  });

  it('详情接口失败且列表无 schema 时保持空白并记录日志', async () => {
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
    vi.mocked(projectApi.getProject).mockResolvedValue({
      data: { data: { name: '示例项目' } },
    } as never);
    vi.mocked(pageApi.getPages).mockResolvedValue({
      data: { data: { list: [makePage({ pageId: 10, schema: null as never })] } },
    } as never);
    vi.mocked(pageApi.getPage).mockRejectedValue(new Error('500'));

    const pinia = createPinia();
    mount(EditorPage, { global: { plugins: [pinia], stubs: editorStubs } });
    await flushPromises();

    expect(errorSpy).toHaveBeenCalledWith('EditorPage', '加载页面详情失败', expect.anything());
    const store = useEditorStore(pinia);
    expect(store.page.children).toHaveLength(0);
  });

  it('项目加载失败时展示占位文案', async () => {
    vi.mocked(projectApi.getProject).mockRejectedValue(new Error('404'));
    vi.mocked(pageApi.getPages).mockResolvedValue({
      data: { data: { list: [] } },
    } as never);

    const wrapper = mountEditor();
    await flushPromises();

    expect(wrapper.text()).toContain('项目加载失败');
  });

  it('页面加载失败时记录日志', async () => {
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
    vi.mocked(projectApi.getProject).mockResolvedValue({
      data: { data: { name: '示例项目' } },
    } as never);
    vi.mocked(pageApi.getPages).mockRejectedValue(new Error('500'));

    const wrapper = mountEditor();
    await flushPromises();

    expect(errorSpy).toHaveBeenCalledWith('EditorPage', '加载页面列表失败');
    expect(wrapper.text()).toContain('还没有页面');
  });

  it('新建页面后追加到列表', async () => {
    mockLoadSuccess([]);
    vi.mocked(pageApi.createPage).mockResolvedValue({
      data: { data: makePage({ pageId: 5, title: '新页面' }) },
    } as never);

    const wrapper = mountEditor();
    await flushPromises();

    await wrapper
      .findAll('button')
      .find((b) => b.text().includes('新建页面'))!
      .trigger('click');
    await nextTick();

    // 内置新建页面弹窗：确认「创建」
    await wrapper
      .findAll('button')
      .find((b) => b.text() === '创建')!
      .trigger('click');
    await flushPromises();

    expect(pageApi.createPage).toHaveBeenCalledWith('42', { title: '新页面', isHome: true });
    expect(wrapper.text()).toContain('新页面');
  });

  it('删除选中组件', async () => {
    mockLoadSuccess([]);
    const pinia = createPinia();
    const wrapper = mount(EditorPage, { global: { plugins: [pinia], stubs: editorStubs } });
    await flushPromises();

    const store = useEditorStore(pinia);
    const comp: ComponentSchema = { id: 'c1', type: 'text', props: {}, styles: {} };
    store.setPage({ ...store.page, children: [comp] });
    store.setSelectedId('c1');
    await nextTick();

    await wrapper.find('button[title="删除组件 (Delete)"]').trigger('click');
    await flushPromises();

    expect(store.getComponentById('c1')).toBeUndefined();
  });

  it('导出 HTML 触发下载', async () => {
    mockLoadSuccess([]);
    const createObjectURL = vi.fn(() => 'blob:mock');
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL: vi.fn() });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const wrapper = mountEditor();
    await flushPromises();

    // 打开导出下拉菜单
    await wrapper
      .findAll('button')
      .find((b) => b.text().includes('导出'))!
      .trigger('click');
    await nextTick();

    // 选择「导出 HTML」
    await wrapper
      .findAll('button')
      .find((b) => b.text().includes('导出 HTML'))!
      .trigger('click');

    expect(createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
  });

  it('预览写入本地存储并打开新窗口', async () => {
    mockLoadSuccess([]);
    const openSpy = vi.fn();
    vi.stubGlobal('open', openSpy);

    const wrapper = mountEditor();
    await flushPromises();

    await wrapper
      .findAll('button')
      .find((b) => b.text().includes('预览'))!
      .trigger('click');

    expect(localStorage.getItem('preview-page')).toBeTruthy();
    expect(openSpy).toHaveBeenCalledWith('/preview', '_blank');
  });

  it('退出登录后跳转并提示', async () => {
    mockLoadSuccess([]);
    mocks.auth.logout.mockRejectedValue(new Error('网络异常'));

    const wrapper = mountEditor();
    await flushPromises();

    await wrapper.find('button[title="退出登录"]').trigger('click');
    await flushPromises();

    expect(mocks.push).toHaveBeenCalledWith('/login');
    expect(toast).toHaveBeenCalledWith('已退出登录', 'info');
  });

  it('点击「使用模板」打开模板弹窗', async () => {
    mockLoadSuccess([]);
    const wrapper = mountEditor();
    await flushPromises();

    await wrapper.find('button[title="使用模板"]').trigger('click');

    expect(mocks.openModal).toHaveBeenCalled();
  });
});
