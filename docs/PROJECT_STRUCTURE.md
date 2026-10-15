# 项目结构说明 (Vue 3 版本)

## 目录结构

```
edit-visio/
├── apps/                          # 应用目录
│   ├── editor/                    # 编辑器应用（核心）
│   │   ├── src/
│   │   │   ├── components/        # Vue 组件
│   │   │   │   ├── EditorLayout.vue      # 编辑器主布局
│   │   │   │   ├── ComponentPanel.vue    # 左侧组件面板
│   │   │   │   ├── Canvas.vue            # 中间画布
│   │   │   │   ├── CanvasComponent.vue   # 画布中的组件
│   │   │   │   ├── PropertyPanel.vue     # 右侧属性面板
│   │   │   │   └── Toolbar.vue           # 顶部工具栏
│   │   │   ├── stores/            # Pinia 状态管理
│   │   │   │   └── editorStore.ts        # 编辑器状态
│   │   │   ├── App.vue            # 应用入口
│   │   │   ├── main.ts            # Vue 渲染入口
│   │   │   ├── index.css          # 全局样式
│   │   │   └── env.d.ts           # 类型声明
│   │   ├── index.html             # HTML 模板
│   │   ├── vite.config.ts         # Vite 配置
│   │   ├── tailwind.config.js     # Tailwind CSS 配置
│   │   ├── postcss.config.js      # PostCSS 配置
│   │   ├── tsconfig.json          # TypeScript 配置
│   │   └── package.json           # 编辑器依赖
│   │
│   └── renderer/                  # 渲染器应用（预览/生产）
│       └── src/                   # （待实现）
│
├── packages/                      # 共享包
│   ├── shared/                    # 共享类型和工具
│   │   ├── src/
│   │   │   ├── types/             # TypeScript 类型定义
│   │   │   │   ├── schema.ts      # Schema 相关类型
│   │   │   │   └── index.ts
│   │   │   ├── utils/             # 工具函数
│   │   │   │   └── index.ts       # 通用工具（深拷贝、ID生成等）
│   │   │   └── index.ts           # 统一导出
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── core/                      # 核心逻辑
│   │   ├── src/
│   │   │   ├── schema/            # Schema 相关
│   │   │   │   ├── page-schema.ts # 页面 Schema 操作
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── components/                # 组件库 (Vue 3)
│   │   ├── src/
│   │   │   ├── basic/             # 基础组件
│   │   │   │   ├── Text.vue       # 文本组件
│   │   │   │   ├── TextMeta.ts    # 文本组件元数据
│   │   │   │   ├── Button.vue     # 按钮组件
│   │   │   │   ├── ButtonMeta.ts  # 按钮组件元数据
│   │   │   │   ├── Image.vue      # 图片组件
│   │   │   │   ├── ImageMeta.ts   # 图片组件元数据
│   │   │   │   ├── Container.vue  # 容器组件
│   │   │   │   ├── ContainerMeta.ts # 容器组件元数据
│   │   │   │   └── index.ts
│   │   │   ├── business/          # 业务组件（待实现）
│   │   │   └── index.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── editor-ui/                 # 编辑器 UI 组件（待实现）
│       └── src/
│           ├── panels/
│           ├── toolbar/
│           └── widgets/
│
├── docs/                          # 文档
│   ├── SOLUTION.md                # 技术方案文档
│   └── PROJECT_STRUCTURE.md       # 项目结构说明
│
├── .husky/                        # Git Hooks
│   ├── pre-commit                 # 提交前检查
│   └── commit-msg                 # 提交信息检查
│
├── .eslintrc.js                   # ESLint 配置
├── .prettierrc                    # Prettier 配置
├── .lintstagedrc.js               # lint-staged 配置
├── .editorconfig                  # 编辑器配置
├── .gitignore                     # Git 忽略配置
├── commitlint.config.js           # Commitlint 配置
├── package.json                   # 根目录依赖和脚本
├── pnpm-workspace.yaml            # pnpm 工作空间配置
├── turbo.json                     # Turborepo 配置
├── tsconfig.json                  # 根 TypeScript 配置
└── README.md                      # 项目说明
```

## 核心文件说明

### 1. 类型定义 (packages/shared/src/types/schema.ts)

定义了所有核心类型：
- `PageSchema`: 页面结构
- `ComponentSchema`: 组件结构
- `ComponentMeta`: 组件元数据
- `EditorState`: 编辑器状态

### 2. 状态管理 (apps/editor/src/stores/editorStore.ts)

使用 Pinia 管理编辑器状态：
- `page`: 当前页面数据（ref）
- `selectedId`: 选中的组件 ID（ref）
- `history`: 撤销/重做历史（ref）
- 各种操作方法（添加、更新、删除组件等）

### 3. 组件系统 (packages/components/)

每个组件包含两部分：
- **组件实现**: Vue 组件（如 `Text.vue`）
- **组件元数据**: `ComponentMeta` 对象，定义组件的属性、样式等

### 4. 编辑器界面 (apps/editor/src/components/)

- **EditorLayout.vue**: 主布局，包含三个面板
- **ComponentPanel.vue**: 左侧组件库面板
- **Canvas.vue**: 中间画布区域
- **PropertyPanel.vue**: 右侧属性配置面板
- **Toolbar.vue**: 顶部工具栏

## 数据流

```
用户操作 → Pinia Action → 更新 Page Schema → Vue 响应式更新
```

1. 用户在 ComponentPanel 点击组件
2. 调用 `addComponent` action
3. 更新 `page.children`
4. Canvas 自动重新渲染（Vue 响应式）

## Vue 3 特性

### Composition API

所有组件使用 `<script setup>` 语法：

```vue
<script setup lang="ts">
import { ref, computed } from 'vue';
import { useEditorStore } from '../stores/editorStore';

const { page, selectedId } = useEditorStore();

const selectedComponent = computed(() => {
  // ...
});
</script>
```

### Pinia 状态管理

```typescript
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useEditorStore = defineStore('editor', () => {
  const page = ref<PageSchema>(createDefaultPage());
  
  const addComponent = (type: string) => {
    // ...
  };
  
  return { page, addComponent };
});
```

### 组件通信

使用 props 和 emits：

```vue
<script setup lang="ts">
interface Props {
  component: ComponentSchema;
  isSelected: boolean;
}

const props = defineProps<Props>();
</script>
```

## 扩展点

### 添加新组件

1. 在 `packages/components/src/basic/` 创建 `.vue` 组件
2. 创建对应的 `Meta.ts` 元数据文件
3. 在 `index.ts` 导出
4. 在 `ComponentPanel.vue` 注册

### 添加新属性

1. 在组件的 `ComponentMeta.propDefinitions` 中添加属性定义
2. 在 `PropertyPanel.vue` 中添加对应的输入控件

### 自定义样式

1. 修改 `apps/editor/tailwind.config.js`
2. 或在组件中使用内联样式

## 依赖关系

```
apps/editor
  ├── packages/shared (类型和工具)
  ├── packages/core (核心逻辑)
  └── packages/components (组件库)

packages/components
  └── packages/shared (类型)

packages/core
  └── packages/shared (类型)
```

## 构建流程

```bash
# 1. 安装依赖
pnpm install

# 2. 开发模式（热更新）
pnpm dev

# 3. 生产构建
pnpm build
```

## 开发规范

### 文件命名

- 组件文件：PascalCase（如 `Button.vue`）
- 工具文件：camelCase（如 `utils.ts`）
- 类型文件：camelCase（如 `schema.ts`）
- 元数据文件：PascalCase + Meta（如 `ButtonMeta.ts`）

### 代码风格

- 使用 TypeScript 严格模式
- 优先使用 `interface` 而非 `type`
- 使用 Vue 3 Composition API + `<script setup>`
- 禁止使用 `any`

### Vue 组件规范

- 使用 `<script setup>` 语法
- 使用 `defineProps` 和 `defineEmits`
- 使用 `ref` 和 `reactive` 管理状态
- 使用 `computed` 计算属性

### 提交规范

```
feat: 新功能
fix: 修复 bug
docs: 文档更新
style: 代码格式调整
refactor: 重构
test: 测试相关
chore: 构建/工具链相关
```
