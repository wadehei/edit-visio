<template>
  <Teleport to="body">
    <div
      v-if="state.open"
      class="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50"
      @click.self="resolveDialog(false)"
    >
      <div class="w-full max-w-sm mx-4 bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6">
        <h3 class="text-base font-semibold text-gray-800 dark:text-gray-100 mb-2">
          {{ state.title }}
        </h3>
        <p
          v-if="state.message"
          class="text-sm text-gray-500 dark:text-gray-400 whitespace-pre-line"
        >
          {{ state.message }}
        </p>
        <input
          v-if="state.mode === 'prompt'"
          ref="inputRef"
          v-model="state.inputValue"
          type="text"
          :placeholder="state.placeholder"
          class="mt-3 w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
          @keyup.enter="resolveDialog(true)"
        />
        <div class="flex gap-2 mt-6">
          <button
            class="flex-1 px-4 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            @click="resolveDialog(false)"
          >
            {{ state.cancelText }}
          </button>
          <button
            class="flex-1 px-4 py-2 text-sm rounded-lg text-white transition-colors"
            :class="
              state.danger ? 'bg-red-500 hover:bg-red-600' : 'bg-brand-500 hover:bg-brand-600'
            "
            @click="resolveDialog(true)"
          >
            {{ state.confirmText }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useConfirmState, resolveDialog } from '../composables/useConfirm';

const state = useConfirmState();
const inputRef = ref<HTMLInputElement | null>(null);

// 输入模式打开时自动聚焦，便于直接键入
watch(
  () => state.value.open,
  (open) => {
    if (open && state.value.mode === 'prompt') {
      void nextTick(() => inputRef.value?.focus());
    }
  },
);

const onKeydown = (e: KeyboardEvent) => {
  if (!state.value.open) return;
  if (e.key === 'Escape') {
    resolveDialog(false);
  } else if (e.key === 'Enter' && state.value.mode === 'confirm') {
    resolveDialog(true);
  }
};

onMounted(() => window.addEventListener('keydown', onKeydown));
onUnmounted(() => window.removeEventListener('keydown', onKeydown));
</script>
