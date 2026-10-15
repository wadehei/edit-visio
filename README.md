# 页面装修平台 (Vue 3 版本)

一个可视化的移动端页面装修平台，通过拖拽组件、配置属性的方式快速搭建移动端 H5 页面。

## 特性

- 🎨 **可视化编辑**：所见即所得的编辑体验
- 🧩 **组件化架构**：丰富的基础组件和业务组件
- 🔄 **拖拽排序**：直观的拖拽交互
- ⚡ **实时预览**：编辑过程中实时预览效果
- 💾 **撤销/重做**：完整的操作历史管理
- 📱 **移动端优先**：专为移动端页面设计
- 🛠️ **Vue 3 + TypeScript**：完整的类型定义和 Composition API
- 📦 **Monorepo**：模块化的包管理

## 技术栈

- **前端框架**: Vue 3 + TypeScript + Composition API
- **状态管理**: Pinia
- **样式方案**: Tailwind CSS
- **构建工具**: Vite 5
- **包管理**: pnpm + Turborepo
- **拖拽库**: vue-draggable-plus
- **图标库**: Lucide Vue Next

## 项目结构

```
page-builder/
├── apps/
│   ├── editor/          # 编辑器应用 (Vue 3)
│   └── renderer/        # 渲染器应用
├── packages/
│   ├── shared/          # 共享类型和工具
│   ├── core/            # 核心逻辑（Schema、验证）
│   ├── components/      # 组件库 (Vue 3)
│   └── editor-ui/       # 编辑器 UI 组件
└── docs/                # 文档
```

## 快速开始

### 环境要求

- Node.js >= 18.0.0
- pnpm >= 8.0.0

### 安装依赖

```bash
# 安装 pnpm（如果未安装）
npm install -g pnpm

# 安装项目依赖
pnpm install
```

### 开发模式

```bash
# 启动编辑器开发服务器
pnpm dev

# 或进入编辑器目录启动
cd apps/editor
pnpm dev
```

访问 http://localhost:3000 查看编辑器

### 构建

```bash
# 构建所有包
pnpm build

# 只构建编辑器
cd apps/editor
pnpm build
```

### 代码检查

```bash
# 运行 ESLint 检查
pnpm lint

# 自动修复
pnpm lint:fix

# 格式化代码
pnpm format
```

### 测试

```bash
# 运行测试
pnpm test

# 测试覆盖率
pnpm test:coverage
```

## 核心概念

### Schema 驱动

页面结构完全由 JSON Schema 描述：

```typescript
interface PageSchema {
  id: string;
  name: string;
  version: string;
  props: PageProps;
  children: ComponentSchema[];
}

interface ComponentSchema {
  id: string;
  type: string;
  props: Record<string, any>;
  styles: CSSProperties;
  events?: EventConfig[];
  children?: ComponentSchema[];
}
```

### 组件系统

组件分为三类：
- **基础组件**：文本、按钮、图片、容器等
- **业务组件**：轮播图、表单、商品卡片等
- **自定义组件**：用户扩展的组件

### 状态管理

使用 Pinia 管理编辑器状态：
- `page`：当前页面 Schema
- `selectedId`：选中的组件 ID
- `history`：操作历史（支持撤销/重做）

## 开发指南

### 添加新组件

1. 在 `packages/components/src/basic/` 创建组件文件：

```vue
<template>
  <div :style="componentStyles">
    {{ content }}
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ComponentSchema } from '@page-builder/shared';

interface Props {
  schema: ComponentSchema;
}

const props = defineProps<Props>();

const componentStyles = computed(() => ({
  ...props.schema.styles,
}));
</script>
```

2. 创建组件元数据文件：

```typescript
import type { ComponentMeta } from '@page-builder/shared';

export const MyComponentMeta: ComponentMeta = {
  type: 'my-component',
  label: '我的组件',
  category: 'basic',
  defaultProps: {},
  defaultStyles: {},
  allowChildren: false,
  propDefinitions: [],
};
```

3. 在 `packages/components/src/basic/index.ts` 导出

4. 在 `apps/editor/src/components/ComponentPanel.vue` 添加到面板

### 自定义主题

编辑 `apps/editor/tailwind.config.js` 自定义主题配置。

## 项目规范

### 代码规范

- 使用 TypeScript 严格模式
- 禁止使用 `any` 类型
- 使用 Vue 3 Composition API + `<script setup>`
- 文件命名使用 PascalCase（组件）或 camelCase（工具）

### Git 规范

提交信息格式：

```
<type>(<scope>): <subject>

<body>
```

类型：
- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 重构
- `test`: 测试相关
- `chore`: 构建/工具链相关

### 分支策略

- `main`: 生产分支
- `develop`: 开发分支
- `feature/*`: 功能分支
- `fix/*`: 修复分支

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

### TypeScript 支持

完整的类型定义：

```typescript
interface ComponentProps {
  schema: ComponentSchema;
}

const props = defineProps<ComponentProps>();
```

## 开发计划

### Phase 1: 基础架构 ✅

- [x] 技术方案设计
- [x] 项目初始化
- [x] Monorepo 配置
- [x] 基础组件开发（Vue 3）
- [x] 编辑器框架搭建（Vue 3 + Pinia）

### Phase 2: 核心功能

- [ ] 拖拽系统完善
- [ ] 属性配置面板增强
- [ ] 组件嵌套支持
- [ ] 实时预览优化

### Phase 3: 增强功能

- [ ] 组件库扩展
- [ ] 模板系统
- [ ] 快捷键系统
- [ ] 性能优化

### Phase 4: 完善功能

- [ ] 页面管理
- [ ] 版本管理
- [ ] 发布系统
- [ ] 代码导出

## 贡献指南

欢迎贡献！请遵循以下步骤：

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'feat: Add AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 许可证

MIT License

## 联系方式

如有问题或建议，请创建 Issue。
