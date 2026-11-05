import { describe, it, expect, vi, afterEach } from 'vitest';
import request from '../api/request';
import { toPageSchema } from '../api/page';
import { uploadFile } from '../api/resource';

describe('toPageSchema', () => {
  it('空 schema 应回退到安全默认值', () => {
    const schema = toPageSchema({});

    expect(schema.id).toBe('page-unknown');
    expect(schema.name).toBe('未命名页面');
    expect(schema.version).toBe('1.0.0');
    expect(schema.props).toEqual({ title: '', backgroundColor: '#ffffff' });
    expect(schema.children).toEqual([]);
  });

  it('应保留后端返回的有效字段', () => {
    const children = [{ id: 'c1', type: 'text', props: {}, styles: {}, children: [] }];
    const schema = toPageSchema({
      id: 'page-1',
      name: '首页',
      version: '2.0.0',
      props: { title: '首页标题', backgroundColor: '#000000' },
      children,
    });

    expect(schema.id).toBe('page-1');
    expect(schema.name).toBe('首页');
    expect(schema.version).toBe('2.0.0');
    expect(schema.props).toEqual({ title: '首页标题', backgroundColor: '#000000' });
    expect(schema.children).toEqual(children);
  });
});

describe('uploadFile', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('应以 multipart 表单提交文件，并按 loaded/total 计算上传百分比', async () => {
    const postSpy = vi
      .spyOn(request, 'post')
      .mockResolvedValue({ data: { code: 0, data: null, message: 'ok' } });

    const file = new File(['hello'], 'a.txt', { type: 'text/plain' });
    const onProgress = vi.fn();

    await uploadFile(file, onProgress);

    const call = postSpy.mock.calls[0] as unknown as [
      string,
      FormData,
      { headers: Record<string, string>; onUploadProgress: (e: unknown) => void },
    ];
    expect(call[0]).toBe('/resources/upload');
    expect(call[1].get('file')).toBe(file);
    expect(call[2].headers['Content-Type']).toBe('multipart/form-data');

    call[2].onUploadProgress({ loaded: 30, total: 100 });
    expect(onProgress).toHaveBeenCalledWith(30);

    // 缺少 total 时无法计算百分比，不应回调
    call[2].onUploadProgress({ loaded: 60 });
    expect(onProgress).toHaveBeenCalledTimes(1);
  });

  it('未传入 onProgress 时不应抛错', async () => {
    vi.spyOn(request, 'post').mockResolvedValue({
      data: { code: 0, data: null, message: 'ok' },
    });

    await expect(uploadFile(new File(['x'], 'b.txt'))).resolves.toBeDefined();
  });
});
