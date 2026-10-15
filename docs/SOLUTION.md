# 移动端页面装修平台 - 技术方案

## 项目概述

构建一个可视化的移动端页面装修平台，用户可以通过拖拽组件、配置属性的方式快速搭建移动端 H5 页面，类似易企秀、MAKA、稿定设计等平台。

## 核心功能

### 1. 可视化编辑器
- **拖拽排序**：支持组件的自由拖拽、排序、嵌套
- **属性配置**：右侧面板实时配置组件属性、样式、事件
- **实时预览**：编辑过程中实时预览页面效果
- **撤销/重做**：完整的操作历史记录功能
- **快捷键支持**：常用操作的快捷键绑定

### 2. 组件库系统
- **基础组件**：文本、图片、按钮、图标、容器等
- **业务组件**：轮播图、表单、商品卡片、导航等
- **自定义组件**：支持用户扩展自定义组件
- **组件市场**：未来可扩展为组件市场

### 3. 页面管理
- **页面列表**：管理已创建的页面
- **模板系统**：预设模板快速开始
- **版本管理**：页面版本历史
- **发布管理**：一键发布、预览链接生成

### 4. Schema 驱动
- **JSON Schema**：页面结构完全由 Schema 描述
- **Schema 渲染器**：独立的 Schema 渲染引擎
- **代码导出**：可将 Schema 导出为 React/Vue 代码

## 技术栈选型

### 核心框架
- **前端框架**: React 18 + TypeScript
- **状态管理**: Zustand (轻量、现代、TypeScript 友好)
- **样式方案**: Tailwind CSS + CSS Modules
- **UI 组件库**: Ant Design 5.x (编辑器 UI)
- **构建工具**: Vite 5.x
- **包管理**: pnpm + Monorepo (Turborepo)

### 核心库
- **拖拽系统**: @dnd-kit/core + @dnd-kit/sortable
  - 现代化、性能优秀
  - 支持复杂拖拽场景
  - TypeScript 原生支持
- **表单处理**: React Hook Form + Zod
  - 属性配置的表单处理
  - Schema 验证
- **代码高亮**: Monaco Editor
  - Schema 编辑
  - 代码预览
- **图标库**: Lucide React
  - 现代化图标
  - Tree-shaking 支持

### 开发工具
- **代码规范**: ESLint + Prettier
- **Git Hooks**: Husky + lint-staged
- **提交规范**: Commitlint
- **单元测试**: Vitest + React Testing Library
- **E2E 测试**: Playwright

## 项目架构

### Monorepo 结构

```
page-builder/
├── apps/
│   ├── editor/              # 编辑器应用
│   │   ├── src/
│   │   │   ├── components/  # 编辑器组件
│   │   │   ├── stores/      # Zustand stores
│   │   │   ├── hooks/       # 自定义 hooks
│   │   │   ├── utils/       # 工具函数
│   │   │   └── types/       # TypeScript 类型
│   │   └── package.json
│   │
│   └── renderer/            # 渲染器应用（预览/生产）
│       ├── src/
│       └── package.json
│
├── packages/
│   ├── components/          # 组件库
│   │   ├── src/
│   │   │   ├── basic/       # 基础组件
│   │   │   ├── business/    # 业务组件
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── core/                # 核心逻辑
│   │   ├── src/
│   │   │   ├── schema/      # Schema 定义
│   │   │   ├── renderer/    # 渲染引擎
│   │   │   └── validator/   # Schema 验证
│   │   └── package.json
│   │
│   ├── shared/              # 共享类型和工具
│   │   ├── src/
│   │   │   ├── types/       # TypeScript 类型
│   │   │   └── utils/       # 工具函数
│   │   └── package.json
│   │
│   └── editor-ui/           # 编辑器 UI 组件
│       ├── src/
│       │   ├── panels/      # 面板组件
│       │   ├── toolbar/     # 工具栏
│       │   └── widgets/     # 小组件
│       └── package.json
│
├── docs/                    # 文档
├── scripts/                 # 构建脚本
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── tsconfig.json
```

### 核心架构设计

#### 1. Schema 设计

```typescript
// 页面 Schema 结构
interface PageSchema {
  id: string;
  name: string;
  version: string;
  props: {
    title: string;
    backgroundColor: string;
    backgroundImage?: string;
  };
  children: ComponentSchema[];
}

// 组件 Schema 结构
interface ComponentSchema {
  id: string;
  type: string;              // 组件类型
  props: Record<string, any>; // 组件属性
  styles: CSSProperties;      // 样式
  events?: EventConfig[];     // 事件配置
  children?: ComponentSchema[]; // 子组件
}
```

#### 2. 状态管理架构

```typescript
// 编辑器主 Store
interface EditorStore {
  // 页面数据
  page: PageSchema;
  
  // 选中状态
  selectedId: string | null;
  hoveredId: string | null;
  
  // 历史记录
  history: {
    past: PageSchema[];
    future: PageSchema[];
  };
  
  // 操作方法
  actions: {
    addComponent: (component: ComponentSchema, parentId?: string) => void;
    updateComponent: (id: string, updates: Partial<ComponentSchema>) => void;
    deleteComponent: (id: string) => void;
    moveComponent: (id: string, targetParentId: string, index: number) => void;
    selectComponent: (id: string | null) => void;
    undo: () => void;
    redo: () => void;
  };
}
```

#### 3. 拖拽系统设计

```typescript
// 拖拽上下文
interface DragContext {
  type: 'component' | 'element';
  data: {
    componentType?: string;  // 新组件拖入
    componentId?: string;    // 已有组件移动
  };
}

// 放置目标
interface DropTarget {
  id: string;
  position: 'before' | 'after' | 'inside';
  index?: number;
}
```

## 项目规范

### 代码规范

#### TypeScript 规范
- 严格模式（strict: true）
- 禁止 any（@typescript-eslint/no-explicit-any）
- 优先使用 interface 而非 type
- 组件 Props 必须定义类型

#### React 规范
- 函数组件 + Hooks
- 组件文件使用 PascalCase
- 工具函数文件使用 camelCase
- 每个组件一个文件，不超过 300 行
- 自定义 Hook 以 use 开头

#### 样式规范
- 优先使用 Tailwind 工具类
- 复杂样式使用 CSS Modules
- 禁止内联样式（除非动态计算）
- 响应式优先（mobile-first）

#### 命名规范
```typescript
// 组件命名
const Button: React.FC<ButtonProps> = () => {}

// Hook 命名
const useDragDrop = () => {}

// 常量命名
const MAX_DEPTH = 10;

// 类型命名
interface ComponentProps {}
type ComponentType = 'button' | 'text' | 'image';
```

### Git 规范

#### 提交信息格式
```
<type>(<scope>): <subject>

<body>

<footer>
```

类型：
- feat: 新功能
- fix: 修复 bug
- docs: 文档更新
- style: 代码格式调整
- refactor: 重构
- test: 测试相关
- chore: 构建/工具链相关

#### 分支策略
- main: 生产分支
- develop: 开发分支
- feature/*: 功能分支
- fix/*: 修复分支
- release/*: 发布分支

### 测试规范

#### 单元测试
- 组件测试：React Testing Library
- Hook 测试：@testing-library/react-hooks
- 工具函数测试：Vitest

#### 测试覆盖率
- 核心逻辑：90%+
- 组件：80%+
- 工具函数：95%+

## 开发计划

### Phase 1: 基础架构（Week 1）
- [x] 技术方案设计
- [ ] 项目初始化
- [ ] Monorepo 配置
- [ ] 基础组件开发（Button、Text、Image、Container）
- [ ] 编辑器框架搭建

### Phase 2: 核心功能（Week 2-3）
- [ ] 拖拽系统实现
- [ ] 属性配置面板
- [ ] 撤销/重做功能
- [ ] 实时预览
- [ ] 页面保存/加载

### Phase 3: 增强功能（Week 4）
- [ ] 组件库扩展
- [ ] 模板系统
- [ ] 快捷键系统
- [ ] 性能优化

### Phase 4: 完善功能（Week 5-6）
- [ ] 页面管理
- [ ] 版本管理
- [ ] 发布系统
- [ ] 代码导出

## 性能优化策略

1. **虚拟滚动**：大列表组件使用虚拟滚动
2. **懒加载**：组件按需加载
3. **Memo 优化**：React.memo + useMemo + useCallback
4. **Schema 缓存**：IndexedDB 缓存页面数据
5. **增量更新**：只更新变化的组件

## 扩展性设计

1. **插件系统**：支持第三方组件接入
2. **主题系统**：支持自定义主题
3. **国际化**：i18n 支持
4. **API 扩展**：开放 API 接口

## 部署方案

### 开发环境
```bash
pnpm dev  # 启动编辑器开发服务器
```

### 生产构建
```bash
pnpm build  # 构建所有包
pnpm deploy:editor  # 部署编辑器
pnpm deploy:renderer  # 部署渲染器
```

### 部署架构
- 编辑器：静态资源部署到 CDN
- 渲染器：独立部署，支持 SSR
- API：Node.js + Express（后续扩展）

## 总结

这个方案采用了现代化的技术栈，注重：
- **开发体验**：TypeScript + Monorepo + 完善的工具链
- **性能**：虚拟滚动、懒加载、增量更新
- **扩展性**：插件系统、主题系统
- **可维护性**：清晰的架构、完善的规范

下一步是开始实施 Phase 1，搭建项目基础架构。
