import { ref, computed } from 'vue';
import type { PageSchema } from '@page-builder/shared';
import { deepClone } from '@page-builder/shared';
import * as projectApi from '../api/project';
import * as pageApi from '../api/page';
import { toast } from '../utils/toast';

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

  const currentProject = computed(() => {
    return projects.value.find(p => p.id === currentProjectId.value) || null;
  });

  const currentPage = computed(() => {
    if (!currentProject.value) return null;
    return currentProject.value.pages.find(p => p.id === currentProject.value!.currentPageId) || null;
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
      console.error('Failed to save projects to localStorage:', error);
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
      console.error('Failed to save current project id:', error);
    }
  }

  // ========== API 调用 ==========

  /** 从 API 加载项目列表，失败时 fallback 到 localStorage */
  async function loadProjectsFromAPI(): Promise<Project[]> {
    try {
      const { data } = await projectApi.getProjects();
      const apiProjects: Project[] = data.data.list.map((p) => ({
        id: p.id,
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
      console.warn('Failed to load projects from API, falling back to localStorage:', error);
      toast('从服务器加载项目失败，使用本地数据', 'warning');
      projects.value = loadProjectsFromLocal();
      return projects.value;
    }
  }

  // ========== 对外接口（保持不变） ==========

  function createProject(name: string, description: string = ''): Project {
    const project: Project = {
      id: `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      pages: [],
      currentPageId: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // 乐观更新：先添加到本地
    projects.value.push(project);
    saveProjectsToLocal();

    // 异步调用 API
    projectApi
      .createProject({ name, description })
      .then(({ data }) => {
        // 用 API 返回的真实 ID 替换临时 ID
        const idx = projects.value.findIndex((p) => p.id === project.id);
        if (idx !== -1) {
          projects.value[idx] = {
            ...projects.value[idx],
            id: data.data.id,
            createdAt: new Date(data.data.createdAt).getTime(),
            updatedAt: new Date(data.data.updatedAt).getTime(),
          };
          saveProjectsToLocal();
        }
      })
      .catch((error) => {
        console.error('Failed to create project via API:', error);
        toast('创建项目同步失败，已保存到本地', 'warning');
      });

    return project;
  }

  function deleteProject(id: string) {
    const index = projects.value.findIndex((p) => p.id === id);
    if (index > -1) {
      projects.value.splice(index, 1);
      saveProjectsToLocal();

      if (currentProjectId.value === id) {
        currentProjectId.value = projects.value.length > 0 ? projects.value[0].id : null;
        saveCurrentProjectId(currentProjectId.value);
      }

      // 异步调用 API 删除
      projectApi
        .deleteProject(id)
        .catch((error) => {
          console.error('Failed to delete project via API:', error);
          toast('删除项目同步失败', 'warning');
        });
    }
  }

  function updateProject(id: string, updates: Partial<Project>) {
    const project = projects.value.find((p) => p.id === id);
    if (project) {
      Object.assign(project, updates, { updatedAt: Date.now() });
      saveProjectsToLocal();

      // 异步调用 API 更新
      const apiParams: projectApi.UpdateProjectParams = {};
      if (updates.name !== undefined) apiParams.name = updates.name;
      if (updates.description !== undefined) apiParams.description = updates.description;

      projectApi
        .updateProject(id, apiParams)
        .catch((error) => {
          console.error('Failed to update project via API:', error);
          toast('更新项目同步失败', 'warning');
        });
    }
  }

  function setCurrentProject(id: string) {
    currentProjectId.value = id;
    saveCurrentProjectId(id);

    // 异步加载该项目下的页面列表
    pageApi
      .getPages(id)
      .then(({ data }) => {
        const project = projects.value.find((proj) => proj.id === id);
        if (project) {
          project.pages = data.data.map((p) => ({
            id: p.id,
            name: p.name,
            version: '1.0.0',
            props: (p.schema?.props as Record<string, unknown>) || {},
            children: (p.schema?.children as PageSchema['children']) || [],
          }));
          if (!project.currentPageId && project.pages.length > 0) {
            // 优先选择首页，否则选第一个页面
            const apiHome = data.data.find((p) => p.isHome);
            const target = apiHome
              ? project.pages.find((pg) => pg.id === apiHome.id)
              : project.pages[0];
            project.currentPageId = target?.id || project.pages[0].id;
          }
          project.updatedAt = Date.now();
          saveProjectsToLocal();
        }
      })
      .catch((error) => {
        console.warn('Failed to load pages from API:', error);
      });
  }

  function addPageToProject(projectId: string, page: PageSchema) {
    const project = projects.value.find((p) => p.id === projectId);
    if (project) {
      project.pages.push(page);
      if (!project.currentPageId) {
        project.currentPageId = page.id;
      }
      project.updatedAt = Date.now();
      saveProjectsToLocal();

      // 异步调用 API 创建页面
      pageApi
        .createPage({ projectId, name: page.name })
        .then(({ data }) => {
          // 用 API 返回的真实 ID 替换临时 ID
          const proj = projects.value.find((p) => p.id === projectId);
          if (proj) {
            const pageIdx = proj.pages.findIndex((pg) => pg.id === page.id);
            if (pageIdx !== -1) {
              proj.pages[pageIdx].id = data.data.id;
              if (proj.currentPageId === page.id) {
                proj.currentPageId = data.data.id;
              }
              saveProjectsToLocal();
            }
          }
        })
        .catch((error) => {
          console.error('Failed to create page via API:', error);
          toast('创建页面同步失败，已保存到本地', 'warning');
        });
    }
  }

  function removePageFromProject(projectId: string, pageId: string) {
    const project = projects.value.find((p) => p.id === projectId);
    if (project) {
      const index = project.pages.findIndex((p) => p.id === pageId);
      if (index > -1) {
        project.pages.splice(index, 1);
        if (project.currentPageId === pageId) {
          project.currentPageId = project.pages.length > 0 ? project.pages[0].id : '';
        }
        project.updatedAt = Date.now();
        saveProjectsToLocal();

        // 异步调用 API 删除页面
        pageApi
          .deletePage(projectId, pageId)
          .catch((error) => {
            console.error('Failed to delete page via API:', error);
            toast('删除页面同步失败', 'warning');
          });
      }
    }
  }

  function updatePageInProject(projectId: string, page: PageSchema) {
    const project = projects.value.find((p) => p.id === projectId);
    if (project) {
      const index = project.pages.findIndex((p) => p.id === page.id);
      if (index > -1) {
        project.pages[index] = deepClone(page);
        project.updatedAt = Date.now();
        saveProjectsToLocal();
      }
    }
  }

  function setCurrentPage(projectId: string, pageId: string) {
    const project = projects.value.find((p) => p.id === projectId);
    if (project) {
      project.currentPageId = pageId;
      project.updatedAt = Date.now();
      saveProjectsToLocal();
    }
  }

  function duplicateProject(id: string): Project | null {
    const project = projects.value.find((p) => p.id === id);
    if (!project) return null;

    const newProject: Project = {
      ...deepClone(project),
      id: `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: `${project.name} (副本)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    projects.value.push(newProject);
    saveProjectsToLocal();

    // 异步调用 API 复制项目
    projectApi
      .copyProject(id)
      .then(({ data }) => {
        const idx = projects.value.findIndex((p) => p.id === newProject.id);
        if (idx !== -1) {
          projects.value[idx] = {
            ...projects.value[idx],
            id: data.data.id,
            createdAt: new Date(data.data.createdAt).getTime(),
            updatedAt: new Date(data.data.updatedAt).getTime(),
          };
          saveProjectsToLocal();
        }
      })
      .catch((error) => {
        console.error('Failed to duplicate project via API:', error);
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
