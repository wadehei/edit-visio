<template>
  <div
    v-if="showModal"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    @click.self="closeModal"
  >
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
      <div class="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200">项目管理</h2>
        <button @click="closeModal" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          ×
        </button>
      </div>

      <div class="flex-1 overflow-y-auto p-4">
        <!-- 创建新项目 -->
        <div class="mb-6">
          <button
            @click="showCreateDialog = true"
            class="w-full p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 transition-colors flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-500"
          >
            <Plus :size="20" />
            创建新项目
          </button>
        </div>

        <!-- 项目列表 -->
        <div v-if="projects.length === 0" class="text-center py-12">
          <p class="text-gray-400">暂无项目</p>
          <p class="text-sm text-gray-400 mt-2">点击上方按钮创建第一个项目</p>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            v-for="project in projects"
            :key="project.id"
            class="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
            :class="{ 'ring-2 ring-blue-500': project.id === currentProjectId }"
          >
            <div class="flex items-start justify-between mb-2">
              <div class="flex-1">
                <h3 class="font-medium text-gray-800 dark:text-gray-200">{{ project.name }}</h3>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {{ project.description || '无描述' }}
                </p>
              </div>
              <div class="flex gap-1">
                <button
                  @click="editProject(project)"
                  class="p-1 text-gray-400 hover:text-blue-500"
                  title="编辑"
                >
                  <Edit :size="16" />
                </button>
                <button
                  @click="duplicateProject(project.id)"
                  class="p-1 text-gray-400 hover:text-green-500"
                  title="复制"
                >
                  <Copy :size="16" />
                </button>
                <button
                  @click="deleteProjectConfirm(project.id)"
                  class="p-1 text-gray-400 hover:text-red-500"
                  title="删除"
                >
                  <Trash2 :size="16" />
                </button>
              </div>
            </div>

            <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-3">
              <span>{{ project.pages.length }} 个页面</span>
              <span>{{ formatDate(project.updatedAt) }}</span>
            </div>

            <button
              @click="openProject(project.id)"
              class="w-full px-3 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors"
            >
              打开项目
            </button>
          </div>
        </div>
      </div>

      <!-- 创建/编辑项目对话框 -->
      <div
        v-if="showCreateDialog || showEditDialog"
        class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        @click.self="closeDialogs"
      >
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
          <h3 class="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">
            {{ showCreateDialog ? '创建项目' : '编辑项目' }}
          </h3>
          <div class="space-y-4">
            <div>
              <label class="block text-sm text-gray-700 dark:text-gray-300 mb-1">项目名称</label>
              <input
                v-model="projectForm.name"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded"
                placeholder="输入项目名称"
              />
            </div>
            <div>
              <label class="block text-sm text-gray-700 dark:text-gray-300 mb-1">项目描述</label>
              <textarea
                v-model="projectForm.description"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded"
                placeholder="输入项目描述（可选）"
                rows="3"
              />
            </div>
          </div>
          <div class="flex gap-2 mt-6">
            <button
              @click="closeDialogs"
              class="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              取消
            </button>
            <button
              @click="saveProject"
              class="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Plus, Edit, Copy, Trash2 } from 'lucide-vue-next';
import { useProjectManager } from '../composables/useProjectManager';

const {
  projects,
  currentProjectId,
  createProject,
  deleteProject,
  updateProject,
  setCurrentProject,
  duplicateProject: duplicate,
} = useProjectManager();

const showModal = ref(false);
const showCreateDialog = ref(false);
const showEditDialog = ref(false);
const editingProjectId = ref<string | null>(null);
const projectForm = ref({
  name: '',
  description: '',
});

const openModal = () => {
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
};

const closeDialogs = () => {
  showCreateDialog.value = false;
  showEditDialog.value = false;
  editingProjectId.value = null;
  projectForm.value = { name: '', description: '' };
};

const editProject = (project: any) => {
  editingProjectId.value = project.id;
  projectForm.value = {
    name: project.name,
    description: project.description,
  };
  showEditDialog.value = true;
};

const saveProject = () => {
  if (showCreateDialog.value) {
    createProject(projectForm.value.name, projectForm.value.description);
  } else if (showEditDialog.value && editingProjectId.value) {
    updateProject(editingProjectId.value, projectForm.value);
  }
  closeDialogs();
};

const deleteProjectConfirm = (id: string) => {
  if (confirm('确定要删除这个项目吗？此操作不可恢复。')) {
    deleteProject(id);
  }
};

const openProject = (id: string) => {
  setCurrentProject(id);
  closeModal();
};

const duplicateProject = (id: string) => {
  duplicate(id);
};

const formatDate = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleDateString('zh-CN');
};

defineExpose({ openModal });
</script>
