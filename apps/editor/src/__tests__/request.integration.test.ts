// @vitest-environment node
/// <reference types="node" />
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { createPinia, setActivePinia } from 'pinia';
import request from '../api/request';
import { useAuthStore } from '../stores/authStore';

/**
 * 真实 HTTP 端到端验证：不使用任何 mock adapter / mock 模块，
 * 而是启动一个本地 node http 服务，让请求真正经过 axios 的 http 适配器与 socket。
 *
 * 这是对 request.test.ts 中"mock adapter"用例的独立互证——用于排除
 * "测试与实现共同偏离真实 axios 行为"的可能性。
 */

let server: http.Server;
let baseURL = '';
/** 记录 /secure 端点收到的 Authorization 头序列 */
let secureAuthHeaders: Array<string | undefined> = [];

const USERS = {
  code: 0,
  data: {
    accessToken: 'fresh-token',
    tokenType: 'Bearer',
    expiresIn: 3600,
    user: { userId: 1, username: 'tester' },
  },
  message: 'ok',
};

function handler(req: http.IncomingMessage, res: http.ServerResponse): void {
  req.on('data', () => {});
  req.on('end', () => {
    res.setHeader('content-type', 'application/json');
    const auth = req.headers.authorization;

    if (req.url === '/api/auth/refresh') {
      res.statusCode = 200;
      res.end(JSON.stringify(USERS));
      return;
    }

    if (req.url === '/api/secure') {
      secureAuthHeaders.push(auth);
      if (auth === 'Bearer fresh-token') {
        res.statusCode = 200;
        res.end(JSON.stringify({ code: 0, data: { ok: true }, message: 'ok' }));
      } else {
        res.statusCode = 401;
        res.end(JSON.stringify({ code: 401, data: null, message: 'unauthorized' }));
      }
      return;
    }

    res.statusCode = 404;
    res.end(JSON.stringify({ code: 404, data: null, message: 'not found' }));
  });
}

describe('request 真实 HTTP 端到端（401 → 刷新 → 重放）', () => {
  beforeAll(async () => {
    server = http.createServer(handler);
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const { port } = server.address() as AddressInfo;
        baseURL = `http://127.0.0.1:${port}/api`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  beforeEach(() => {
    setActivePinia(createPinia());
    secureAuthHeaders = [];
    request.defaults.baseURL = baseURL;
  });

  it('过期 token 经真实刷新后携带新 token 重放成功', async () => {
    const authStore = useAuthStore();
    authStore.accessToken = 'stale-token';

    const res = await request.get('/secure');

    expect(res.data.data).toEqual({ ok: true });
    expect(authStore.accessToken).toBe('fresh-token');
    // 第一次携带过期 token 被拒（401），重放时携带刷新后的新 token（200）
    expect(secureAuthHeaders).toEqual(['Bearer stale-token', 'Bearer fresh-token']);
  });
});
