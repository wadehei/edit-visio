import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockAuth = vi.hoisted(() => ({
  isLoggedIn: false,
  bootstrap: vi.fn(),
}));

vi.mock('../stores/authStore', () => ({
  useAuthStore: () => mockAuth,
}));

function stubView(name: string) {
  return async () => {
    const { h } = await import('vue');
    return { default: { name, render: () => h('div') } };
  };
}

vi.mock('../views/LoginPage.vue', stubView('LoginPage'));
vi.mock('../views/HomePage.vue', stubView('HomePage'));
vi.mock('../views/EditorPage.vue', stubView('EditorPage'));
vi.mock('../views/PreviewPage.vue', stubView('PreviewPage'));

/** 每个用例使用全新的 router 实例，避免复用已导航状态 */
async function freshRouter() {
  vi.resetModules();
  const mod = await import('../router/index');
  return mod.default;
}

describe('router 守卫', () => {
  beforeEach(() => {
    mockAuth.isLoggedIn = false;
    mockAuth.bootstrap = vi.fn().mockResolvedValue(undefined);
  });

  it('未登录访问受保护路由时跳转登录并携带 redirect', async () => {
    const router = await freshRouter();

    await router.push('/editor/42');

    expect(mockAuth.bootstrap).toHaveBeenCalled();
    expect(router.currentRoute.value.name).toBe('Login');
    expect(router.currentRoute.value.query.redirect).toBe('/editor/42');
  });

  it('已登录访问受保护路由时放行', async () => {
    mockAuth.isLoggedIn = true;
    const router = await freshRouter();

    await router.push('/');

    expect(router.currentRoute.value.name).toBe('Home');
  });

  it('已登录访问登录页时重定向到首页', async () => {
    mockAuth.isLoggedIn = true;
    const router = await freshRouter();

    await router.push('/login');

    expect(router.currentRoute.value.name).toBe('Home');
  });

  it('未登录访问登录页时放行', async () => {
    const router = await freshRouter();

    await router.push('/login');

    expect(router.currentRoute.value.name).toBe('Login');
  });

  it('未登录访问预览页时不跳转登录（公开路由）', async () => {
    const router = await freshRouter();

    await router.push('/preview');

    expect(router.currentRoute.value.name).toBe('Preview');
  });
});
