import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '../stores/authStore';

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/LoginPage.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/HomePage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/editor/:projectId',
    name: 'Editor',
    component: () => import('../views/EditorPage.vue'),
    meta: { requiresAuth: true },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// 路由守卫：检查登录状态 + 恢复用户信息
router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore();

  if (to.meta.requiresAuth !== false && !authStore.isLoggedIn) {
    // 需要登录但未登录 → 跳转到登录页
    next({ name: 'Login', query: { redirect: to.fullPath } });
  } else if (authStore.isLoggedIn) {
    // 已登录但用户信息未加载 → 先恢复
    if (!authStore.user) {
      await authStore.initAuth();
    }
    if (to.name === 'Login') {
      // 已登录但访问登录页 → 跳转到首页
      next({ name: 'Home' });
    } else {
      next();
    }
  } else {
    next();
  }
});

export default router;
