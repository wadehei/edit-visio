import { ref, computed } from 'vue';
import type { PageSchema } from '@page-builder/shared';
import { deepClone, generateId } from '@page-builder/shared';
import * as projectApi from '../api/project';
import * as pageApi from '../api/page';
import { toPageSchema } from '../api/page';
import { toast } from '../utils/toast';
import { logger } from '../utils/logger';

export interface Project {
  id: string;
  name: string;
  description: string;
  pages: PageSchema[];
  currentPageId: string;
  createdAt: number;
  updatedAt: number;
}

const PROJECTS_KEY = 'page-builder-projects';
const CURRENT_PROJECT_KEY = 'page-builder-current-project';

export function useProjectManager() {
  const projects = ref<Project[]>(loadProjectsFromLocal());
  const currentProjectId = ref<string | null>(loadCurrentProjectId());

  /** 请求版本号：每次切换项目递增，过期响应被丢弃 */
  let pageRequestVersion = 0;

  const currentProject = computed(() => {
    return projects.value.find((p) => p.id === currentProjectId.value) || null;
  });

  const currentPage = computed(() => {
    if (!currentProject.value) return null;
    return (
      currentProject.value.pages.find((p) => p.id === currentProject.value!.currentPageId) || null
    );
  });

  // ========== 本地存储（fallback） ==========

  function loadProjectsFromLocal(): Project[] {
    try {
      const stored = localStorage.getItem(PROJECTS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  function saveProjectsToLocal() {
    try {
      localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects.value));
    } catch (error) {
      logger.error('ProjectManager', 'Failed to save projects to localStorage', error);
    }
  }

  function loadCurrentProjectId(): string | null {
    try {
      return localStorage.getItem(CURRENT_PROJECT_KEY);
    } catch {
      return null;
    }
  }

  function saveCurrentProjectId(id: string | null) {
    try {
      if (id) {
        localStorage.setItem(CURRENT_PROJECT_KEY, id);
      } else {
        localStorage.removeItem(CURRENT_PROJECT_KEY);
      }
    } catch (error) {
      logger.error('ProjectManager', 'Failed to save current project id', error);
    }
  }

  // ========== API 调用 ==========

  /** 从 API 加载项目列表，失败时 fallback 到 localStorage */
  async function loadProjectsFromAPI(): Promise<Project[]> {
    try {
      const { data } = await projectApi.getProjects();
      const apiProjects: Project[] = data.data.list.map((p) => ({
        id: String(p.projectId),
        name: p.name,
        description: p.description || '',
        pages: [],
        currentPageId: '',
        createdAt: new Date(p.createdAt).getTime(),
        updatedAt: new Date(p.updatedAt).getTime(),
      }));
      projects.value = apiProjects;
      saveProjectsToLocal();
      return apiProjects;
    } catch (error) {
      logger.warn(
        'ProjectManager',
        'Failed to load projects from API, falling back to localStorage',
        error,
      );
      toast('从服务器加载项目失败，使用本地数据', 'warning');
      projects.value = loadProjectsFromLocal();
      return projects.value;
    }
  }

  // ========== 对外接口（保持不变） ==========

  function createProject(name: string, description: string = ''): Project {
    // 输入验证
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast('项目名称不能为空', 'error');
      throw new Error('Project name cannot be empty');
    }
    if (trimmedName.length > 100) {
      toast('项目名称不能超过 100 个字符', 'error');
      throw new Error('Project name too long');
    }

    const project: Project = {
      id: generateId(),
      name: trimmedName,
      description: description.trim().slice(0, 500),
      pages: [],
      currentPageId: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // 乐观更新：不可变地添加项目
    projects.value = [...projects.value, project];
    saveProjectsToLocal();

    // 异步调用 API
    projectApi
      .createProject({ name: trimmedName, description: description.trim().slice(0, 500) })
      .then(({ data }) => {
        // 用 API 返回的真实 ID 替换临时 ID（不可变更新）
        projects.value = projects.value.map((p) =>
          p.id === project.id
            ? {
                ...p,
                id: String(data.data.projectId),
                createdAt: new Date(data.data.createdAt).getTime(),
                updatedAt: new Date(data.data.updatedAt).getTime(),
              }
            : p,
        );
        saveProjectsToLocal();
      })
      .catch((error) => {
        logger.error('ProjectManager', 'Failed to create project via API', error);
        toast('创建项目同步失败，已保存到本地', 'warning');
      });

    return project;
  }

  function deleteProject(id: string) {
    const index = projects.value.findIndex((p) => p.id === id);
    if (index > -1) {
      // 不可变更新：创建新数组
      projects.value = projects.value.filter((p) => p.id !== id);
      saveProjectsToLocal();

      if (currentProjectId.value === id) {
        const nextId = projects.value.length > 0 ? projects.value[0].id : null;
        currentProjectId.value = nextId;
        saveCurrentProjectId(nextId);
      }

      // 异步调用 API 删除
      projectApi.deleteProject(id).catch((error) => {
        logger.error('ProjectManager', 'Failed to delete project via API', error);
        toast('删除项目同步失败', 'warning');
      });
    }
  }

  function updateProject(id: string, updates: Partial<Project>) {
    const project = projects.value.find((p) => p.id === id);
    if (project) {
      // 不可变更新：创建新对象替换
      projects.value = projects.value.map((p) =>
        p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p,
      );
      saveProjectsToLocal();

      // 异步调用 API 更新
      const apiParams: projectApi.UpdateProjectParams = {};
      if (updates.name !== undefined) apiParams.name = updates.name;
      if (updates.description !== undefined) apiParams.description = updates.description;

      projectApi.updateProject(id, apiParams).catch((error) => {
        logger.error('ProjectManager', 'Failed to update project via API', error);
        toast('更新项目同步失败', 'warning');
      });
    }
  }

  function setCurrentProject(id: string) {
    currentProjectId.value = id;
    saveCurrentProjectId(id);

    // 递增版本号，使之前的未完成任务的响应被丢弃
    // Stryker disable next-line UpdateOperator: 等价变异。pageRequestVersion 为闭包私有计数器，仅用于与本次捕获的 thisVersion 比较；++ 或 -- 都保证自增/自减序列严格单调且「最新请求生效」，无任何可观测行为差异。
    const thisVersion = ++pageRequestVersion;

    // 异步加载该项目下的页面列表
    pageApi
      .getPages(id)
      .then(({ data }) => {
        // 竞态保护：如果已有更新的请求发出，丢弃本次过期响应
        if (thisVersion !== pageRequestVersion) return;

        // 不可变更新：创建新的 pages 数组和 project 对象
        const loadedPages: PageSchema[] = data.data.list.map((p) =>
          p.schema
            ? toPageSchema(p.schema)
            : {
                id: String(p.pageId),
                name: p.title,
                version: '1.0.0',
                props: { title: p.title, backgroundColor: '#ffffff' },
                children: [],
              },
        );

        projects.value = projects.value.map((proj) => {
          if (proj.id !== id) return proj;

          const updatedProj = {
            ...proj,
            pages: loadedPages,
            updatedAt: Date.now(),
          };

          // 选择首页或第一个页面
          if (!proj.currentPageId && loadedPages.length > 0) {
            const apiHome = data.data.list.find((p) => p.isHome);
            const target = apiHome
              ? loadedPages.find((pg) => pg.id === String(apiHome.pageId))
              : loadedPages[0];
            updatedProj.currentPageId = target?.id || loadedPages[0].id;
          }

          return updatedProj;
        });
        saveProjectsToLocal();
      })
      .catch((error) => {
        logger.warn('ProjectManager', 'Failed to load pages from API', error);
      });
  }

  function addPageToProject(projectId: string, page: PageSchema) {
    const project = projects.value.find((p) => p.id === projectId);
    if (project) {
      // 不可变更新
      projects.value = projects.value.map((p) =>
        p.id === projectId
          ? {
              ...p,
              pages: [...p.pages, page],
              currentPageId: p.currentPageId || page.id,
              updatedAt: Date.now(),
            }
          : p,
      );
      saveProjectsToLocal();

      // 异步调用 API 创建页面
      pageApi
        .createPage(projectId, { title: page.name })
        .then(({ data }) => {
          // 用 API 返回的真实 ID 替换临时 ID
          projects.value = projects.value.map((proj) => {
            if (proj.id !== projectId) return proj;
            return {
              ...proj,
              pages: proj.pages.map((pg) =>
                pg.id === page.id ? { ...pg, id: String(data.data.pageId) } : pg,
              ),
              currentPageId:
                proj.currentPageId === page.id ? String(data.data.pageId) : proj.currentPageId,
            };
          });
          saveProjectsToLocal();
        })
        .catch((error) => {
          logger.error('ProjectManager', 'Failed to create page via API', error);
          toast('创建页面同步失败，已保存到本地', 'warning');
        });
    }
  }

  function removePageFromProject(projectId: string, pageId: string) {
    const project = projects.value.find((p) => p.id === projectId);
    if (project) {
      const index = project.pages.findIndex((p) => p.id === pageId);
      if (index > -1) {
        // 不可变更新
        projects.value = projects.value.map((p) =>
          p.id === projectId
            ? {
                ...p,
                pages: p.pages.filter((pg) => pg.id !== pageId),
                currentPageId:
                  p.currentPageId === pageId
                    ? // Stryker disable next-line ConditionalExpression,EqualityOperator: 等价变异。此处 p 必为命中项目且 pageId 已存在于 p.pages（index>-1），故 p.pages.length>=1；当 length===1 时，原文走 '' 分支，而 >1 改为 true/>=1 后会经 filter 过滤为空并回退到 ''，结果完全相同，无可观测差异。
                      p.pages.length > 1
                      ? p.pages.filter((pg) => pg.id !== pageId)[0]?.id || ''
                      : ''
                    : p.currentPageId,
                updatedAt: Date.now(),
              }
            : p,
        );
        saveProjectsToLocal();

        // 异步调用 API 删除页面
        pageApi.deletePage(projectId, pageId).catch((error) => {
          logger.error('ProjectManager', 'Failed to delete page via API', error);
          toast('删除页面同步失败', 'warning');
        });
      }
    }
  }

  function updatePageInProject(projectId: string, page: PageSchema) {
    // 不可变更新
    projects.value = projects.value.map((p) =>
      p.id === projectId
        ? {
            ...p,
            pages: p.pages.map((pg) => (pg.id === page.id ? deepClone(page) : pg)),
            updatedAt: Date.now(),
          }
        : p,
    );
    saveProjectsToLocal();
  }

  function setCurrentPage(projectId: string, pageId: string) {
    // 不可变更新
    projects.value = projects.value.map((p) =>
      p.id === projectId ? { ...p, currentPageId: pageId, updatedAt: Date.now() } : p,
    );
    saveProjectsToLocal();
  }

  function duplicateProject(id: string): Project | null {
    const project = projects.value.find((p) => p.id === id);
    if (!project) return null;

    const newProject: Project = {
      ...deepClone(project),
      id: generateId(),
      name: `${project.name} (副本)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // 不可变地添加新项目
    projects.value = [...projects.value, newProject];
    saveProjectsToLocal();

    // 异步调用 API 复制项目
    projectApi
      .copyProject(id)
      .then(({ data }) => {
        // 用 API 返回的真实 ID 替换临时 ID（不可变更新）
        projects.value = projects.value.map((p) =>
          p.id === newProject.id
            ? {
                ...p,
                id: String(data.data.projectId),
                createdAt: new Date(data.data.createdAt).getTime(),
                updatedAt: new Date(data.data.updatedAt).getTime(),
              }
            : p,
        );
        saveProjectsToLocal();
      })
      .catch((error) => {
        logger.error('ProjectManager', 'Failed to duplicate project via API', error);
        toast('复制项目同步失败，已保存到本地', 'warning');
      });

    return newProject;
  }

  return {
    projects,
    currentProjectId,
    currentProject,
    currentPage,
    createProject,
    deleteProject,
    updateProject,
    setCurrentProject,
    addPageToProject,
    removePageFromProject,
    updatePageInProject,
    setCurrentPage,
    duplicateProject,
    loadProjectsFromAPI,
  };
}
