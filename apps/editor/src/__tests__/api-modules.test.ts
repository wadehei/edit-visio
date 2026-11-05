import { describe, it, expect, afterEach, vi } from 'vitest';
import request from '../api/request';
import * as authApi from '../api/auth';
import * as componentApi from '../api/component';
import * as projectApi from '../api/project';
import * as templateApi from '../api/template';
import * as pageApi from '../api/page';

const okResponse = { data: { code: 0, data: null, message: 'ok' } } as never;

describe('api 模块封装', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('page 模块方法与端点、参数一致', async () => {
    const getSpy = vi.spyOn(request, 'get').mockResolvedValue(okResponse);
    const postSpy = vi.spyOn(request, 'post').mockResolvedValue(okResponse);
    const putSpy = vi.spyOn(request, 'put').mockResolvedValue(okResponse);
    const deleteSpy = vi.spyOn(request, 'delete').mockResolvedValue(okResponse);

    await pageApi.getPages('42');
    expect(getSpy).toHaveBeenCalledWith('/projects/42/pages');

    await pageApi.getPage('42', '7');
    expect(getSpy).toHaveBeenCalledWith('/projects/42/pages/7');

    await pageApi.createPage('42', { title: '新页面' });
    expect(postSpy).toHaveBeenCalledWith('/projects/42/pages', { title: '新页面' });

    const signal = new AbortController().signal;
    await pageApi.savePageSchema('42', '7', { schema: { id: 'p' } }, { signal });
    expect(putSpy).toHaveBeenCalledWith(
      '/projects/42/pages/7/schema',
      { schema: { id: 'p' } },
      { signal },
    );

    await pageApi.deletePage('42', '7');
    expect(deleteSpy).toHaveBeenCalledWith('/projects/42/pages/7');
  });

  it('project 模块方法与端点、参数一致', async () => {
    const getSpy = vi.spyOn(request, 'get').mockResolvedValue(okResponse);
    const postSpy = vi.spyOn(request, 'post').mockResolvedValue(okResponse);
    const putSpy = vi.spyOn(request, 'put').mockResolvedValue(okResponse);
    const deleteSpy = vi.spyOn(request, 'delete').mockResolvedValue(okResponse);

    await projectApi.getProjects({ page: 1, pageSize: 10 });
    expect(getSpy).toHaveBeenCalledWith('/projects', { params: { page: 1, pageSize: 10 } });

    await projectApi.getProject('9');
    expect(getSpy).toHaveBeenCalledWith('/projects/9');

    await projectApi.createProject({ name: 'P' });
    expect(postSpy).toHaveBeenCalledWith('/projects', { name: 'P' });

    await projectApi.updateProject('9', { name: 'P2' });
    expect(putSpy).toHaveBeenCalledWith('/projects/9', { name: 'P2' });

    await projectApi.deleteProject('9');
    expect(deleteSpy).toHaveBeenCalledWith('/projects/9');

    await projectApi.copyProject('9');
    expect(postSpy).toHaveBeenCalledWith('/projects/9/copy');
  });

  it('auth 模块方法与端点一致', async () => {
    const getSpy = vi.spyOn(request, 'get').mockResolvedValue(okResponse);
    const postSpy = vi.spyOn(request, 'post').mockResolvedValue(okResponse);

    await authApi.login({ login: 'u', password: 'p' });
    expect(postSpy).toHaveBeenCalledWith('/auth/login', { login: 'u', password: 'p' });

    await authApi.register({ username: 'u', password: 'p', confirmPassword: 'p' });
    expect(postSpy).toHaveBeenCalledWith('/auth/register', {
      username: 'u',
      password: 'p',
      confirmPassword: 'p',
    });

    await authApi.logout();
    expect(postSpy).toHaveBeenCalledWith('/auth/logout');

    await authApi.refreshToken();
    expect(postSpy).toHaveBeenCalledWith('/auth/refresh');

    await authApi.getUserInfo();
    expect(getSpy).toHaveBeenCalledWith('/auth/me');
  });

  it('component 与 template 模块方法与端点一致', async () => {
    const getSpy = vi.spyOn(request, 'get').mockResolvedValue(okResponse);
    const postSpy = vi.spyOn(request, 'post').mockResolvedValue(okResponse);

    await componentApi.getComponents({ category: 'basic' });
    expect(getSpy).toHaveBeenCalledWith('/components', { params: { category: 'basic' } });

    await templateApi.getTemplates();
    expect(getSpy).toHaveBeenCalledWith('/templates', { params: undefined });

    await templateApi.applyTemplate({ templateId: 't1', projectId: 'p1' });
    expect(postSpy).toHaveBeenCalledWith('/templates/apply', { templateId: 't1', projectId: 'p1' });
  });
});
