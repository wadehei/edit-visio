<template>
  <div class="min-h-screen flex relative overflow-hidden">
    <!-- 背景装饰 -->
    <div class="absolute inset-0 bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-950" />
    <div class="absolute inset-0 opacity-30"
      style="background-image: radial-gradient(circle at 20% 50%, rgba(99, 102, 241, 0.3) 0%, transparent 50%),
              radial-gradient(circle at 80% 20%, rgba(139, 92, 246, 0.3) 0%, transparent 50%),
              radial-gradient(circle at 50% 80%, rgba(168, 85, 247, 0.2) 0%, transparent 50%);" />
    <!-- 网格纹理 -->
    <div class="absolute inset-0 opacity-[0.03]"
      style="background-image: linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px); background-size: 60px 60px;" />

    <!-- 左侧品牌区 -->
    <div class="hidden lg:flex relative z-10 flex-1 items-center justify-center p-12">
      <div class="max-w-md slide-up">
        <div class="flex items-center gap-3 mb-8">
          <div class="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
          </div>
          <span class="text-xl font-bold text-white tracking-tight">Page Builder</span>
        </div>
        <h2 class="text-4xl font-bold text-white leading-tight mb-4">
          可视化页面搭建<br />
          <span class="gradient-text">从零到一</span>
        </h2>
        <p class="text-lg text-white/60 leading-relaxed">
          拖拽组件、自由布局，快速创建精美的响应式页面。<br />
          无需编码，所见即所得。
        </p>
        <div class="flex items-center gap-6 mt-10">
          <div class="flex items-center gap-2 text-white/40 text-sm">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
            拖拽搭建
          </div>
          <div class="flex items-center gap-2 text-white/40 text-sm">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
            实时预览
          </div>
          <div class="flex items-center gap-2 text-white/40 text-sm">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
            一键发布
          </div>
        </div>
      </div>
    </div>

    <!-- 右侧表单区 -->
    <div class="relative z-10 w-full lg:w-[480px] flex items-center justify-center p-6 lg:p-12">
      <div class="w-full max-w-[400px] slide-up">
        <!-- Logo（移动端） -->
        <div class="lg:hidden flex items-center gap-3 mb-10 justify-center">
          <div class="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center">
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
          </div>
          <span class="text-lg font-bold text-white">Page Builder</span>
        </div>

        <!-- 标题 -->
        <div class="mb-8">
          <h1 class="text-2xl font-bold text-white mb-1.5">
            {{ isLogin ? '欢迎回来' : '创建账号' }}
          </h1>
          <p class="text-sm text-white/40">
            {{ isLogin ? '登录以继续使用页面编辑器' : '注册一个新账号开始使用' }}
          </p>
        </div>

        <!-- 表单 -->
        <form @submit.prevent="handleSubmit" class="space-y-4">
          <div>
            <label class="block text-xs font-medium text-white/50 mb-1.5 ml-0.5">用户名</label>
            <div class="relative">
              <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <input
                v-model="form.username"
                type="text"
                placeholder="请输入用户名"
                class="w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.07] border border-white/[0.08] text-white placeholder:text-white/20 focus:bg-white/[0.1] focus:border-indigo-400/50 focus:ring-2 focus:ring-indigo-400/20 outline-none transition text-sm"
                :disabled="loading"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-medium text-white/50 mb-1.5 ml-0.5">密码</label>
            <div class="relative">
              <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <input
                v-model="form.password"
                type="password"
                placeholder="请输入密码"
                class="w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.07] border border-white/[0.08] text-white placeholder:text-white/20 focus:bg-white/[0.1] focus:border-indigo-400/50 focus:ring-2 focus:ring-indigo-400/20 outline-none transition text-sm"
                :disabled="loading"
              />
            </div>
          </div>

          <div v-if="!isLogin">
            <label class="block text-xs font-medium text-white/50 mb-1.5 ml-0.5">邮箱
              <span class="text-white/20">（可选）</span>
            </label>
            <div class="relative">
              <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <input
                v-model="form.email"
                type="email"
                placeholder="请输入邮箱"
                class="w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.07] border border-white/[0.08] text-white placeholder:text-white/20 focus:bg-white/[0.1] focus:border-indigo-400/50 focus:ring-2 focus:ring-indigo-400/20 outline-none transition text-sm"
                :disabled="loading"
              />
            </div>
          </div>

          <!-- 错误提示 -->
          <div v-if="errorMsg" class="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
            <svg class="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
            </svg>
            {{ errorMsg }}
          </div>

          <!-- 提交按钮 -->
          <button
            type="submit"
            :disabled="loading"
            class="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-medium text-sm shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:from-indigo-400 hover:to-violet-400 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-6"
          >
            <span v-if="loading" class="flex items-center justify-center gap-2">
              <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
              处理中...
            </span>
            <span v-else>{{ isLogin ? '登 录' : '注 册' }}</span>
          </button>
        </form>

        <!-- 切换 -->
        <div class="text-center mt-8 text-sm text-white/30">
          {{ isLogin ? '还没有账号？' : '已有账号？' }}
          <button
            class="text-indigo-300/80 font-medium hover:text-indigo-200 transition ml-1"
            @click="toggleMode"
          >
            {{ isLogin ? '立即注册' : '返回登录' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/authStore';

const router = useRouter();
const authStore = useAuthStore();

const isLogin = ref(true);
const loading = ref(false);
const errorMsg = ref('');

const form = reactive({
  username: '',
  password: '',
  email: '',
});

function toggleMode() {
  isLogin.value = !isLogin.value;
  errorMsg.value = '';
  form.username = '';
  form.password = '';
  form.email = '';
}

async function handleSubmit() {
  errorMsg.value = '';

  if (!form.username.trim()) {
    errorMsg.value = '请输入用户名';
    return;
  }
  if (!form.password) {
    errorMsg.value = '请输入密码';
    return;
  }
  if (form.password.length < 6) {
    errorMsg.value = '密码长度不能少于6位';
    return;
  }

  loading.value = true;

  try {
    if (isLogin.value) {
      await authStore.login(form.username, form.password);
    } else {
      await authStore.register(form.username, form.password, form.email || undefined);
    }
    router.push('/');
  } catch (err: unknown) {
    const error = err as Error;
    errorMsg.value = error.message || '操作失败，请重试';
  } finally {
    loading.value = false;
  }
}
</script>
