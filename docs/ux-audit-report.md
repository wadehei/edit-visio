# 可视化页面搭建平台 · 使用体验分析报告

> 分析对象：`apps/editor`（前端 Vue 3 + Pinia + Vite）
> 分析方法：全路径源码走查 + 组件接线图（import 可达性）分析 + 场景化反推
> 判定原则：凡"功能是否存在"以**生产页面能否触达**为准，而非"代码里是否有"
> 生成日期：2026-11-11

---

## 一、分析范围与方法

### 1.1 覆盖维度

| 维度         | 关注点                                                       |
| ------------ | ------------------------------------------------------------ |
| 核心功能流程 | 进入产品 → 完成核心目标（搭页并发布/导出）的完整链路是否通畅 |
| 交互逻辑     | 操作是否冗余、引导是否缺失、反馈是否明确                     |
| 界面视觉呈现 | 视觉一致性、设计规范、布局适配                               |
| 性能表现     | 首屏加载、请求编排、保存/渲染开销                            |

### 1.2 体验全路径节点

| #   | 节点            | 承载文件                                                                                                                                                                                                                                       |
| --- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 进入/鉴权       | [LoginPage.vue](../apps/editor/src/views/LoginPage.vue)                                                                                                                                                                                        |
| 2   | 首页项目列表    | [HomePage.vue](../apps/editor/src/views/HomePage.vue)                                                                                                                                                                                          |
| 3   | 进入编辑器/加载 | [EditorPage.vue](../apps/editor/src/views/EditorPage.vue)                                                                                                                                                                                      |
| 4   | 拖拽搭建        | [ComponentPanel.vue](../apps/editor/src/components/ComponentPanel.vue) → [Canvas.vue](../apps/editor/src/components/Canvas.vue) → [CanvasComponent.vue](../apps/editor/src/components/CanvasComponent.vue)                                     |
| 5   | 属性/样式配置   | [PropertyPanel.vue](../apps/editor/src/components/PropertyPanel.vue) → [StylePanel.vue](../apps/editor/src/components/property-panel/StylePanel.vue) / [PageConfigPanel.vue](../apps/editor/src/components/property-panel/PageConfigPanel.vue) |
| 6   | 图层管理        | [LayerPanel.vue](../apps/editor/src/components/LayerPanel.vue) → [LayerTreeItem.vue](../apps/editor/src/components/LayerTreeItem.vue)                                                                                                          |
| 7   | 保存            | [useAutoSave.ts](../apps/editor/src/composables/useAutoSave.ts)                                                                                                                                                                                |
| 8   | 预览            | [EditorPage.vue#L396-L399](../apps/editor/src/views/EditorPage.vue#L396-L399) → [PreviewPage.vue](../apps/editor/src/views/PreviewPage.vue)                                                                                                    |
| 9   | 导出            | [EditorPage.vue#L366-L394](../apps/editor/src/views/EditorPage.vue#L366-L394)                                                                                                                                                                  |

---

## 二、阻塞性核心问题（P0）

### P0-1　大量已实现功能未接入任何 UI（"幽灵功能"）

- **问题描述**：以下组件/composable 功能完整、且有单测覆盖，但**没有任何生产页面 import 或渲染**，用户 100% 无法触达：
  `AIAssistant`、`AnimationPanel`、`ExportImageModal`、`HistoryPanel`、`ThemeSwitcher`、`ShortcutsModal`、`AlignmentGuides`、`ProjectManager`。
- **证据**：全库 grep 显示上述组件**仅**被 `src/__tests__` 引用（如 [modal-components.test.ts#L5-L10](../apps/editor/src/__tests__/modal-components.test.ts)、[components.test.ts#L7-L10](../apps/editor/src/__tests__/components.test.ts)）；[main.ts](../apps/editor/src/main.ts) 无全局注册，全库无 `defineAsyncComponent`。生产唯二接线为 [Canvas.vue#L127](../apps/editor/src/components/Canvas.vue#L127)（DeviceSwitcher）与 [PageConfigPanel.vue#L61](../apps/editor/src/components/property-panel/PageConfigPanel.vue#L61)（LayerPanel）。
- **影响范围**：AI 辅助、动画配置、导出图片、**撤销历史可视化**、主题切换、快捷键帮助、对齐辅助线、项目批量管理——全部不可用。测试"全绿"制造功能完备假象。
- **出现场景**：用户想撤回 5 步前操作、想用 AI 排版建议、想导出图片素材、想看快捷键列表时，界面无任何入口。
- **优化方向**：二选一并统一决策——① 在顶栏/侧栏挂载入口（历史面板/快捷键帮助/主题切换成本最低，建议优先）；② 若无上线计划，从代码与测试中移除，避免误导后续迭代。
- **处置记录（已执行）**：
  - **接入 UI 入口（保留功能，5 项）**：`HistoryPanel`、`AIAssistant`、`ExportImageModal`、`ThemeSwitcher`、`ShortcutsModal`。
  - **移除（含实现与单测，3 项）**：`AnimationPanel`(+`useAnimation`)、`AlignmentGuides`(+`useAlignmentGuides`)、`ProjectManager`(+`useProjectManager`)。

### P0-2　导出流程用原生 `prompt` 输入数字选格式

- **问题描述**：[EditorPage.vue#L366-L385](../apps/editor/src/views/EditorPage.vue#L366-L385) 以 `prompt('请选择导出格式（输入数字）：1. HTML 2. Vue 组件')` 收集选择，输入非 `1/2` 仅给 `toast('无效的导出选项')`。
- **影响范围**：核心目标路径（产出代码）末端体验断裂；阻塞式弹窗、不可读、无默认值、无法取消后重选。
- **出现场景**：用户点击顶栏"导出"。
- **优化方向**：改为下拉菜单或格式选择卡片弹窗；导出后给出成功提示与"打开文件位置/复制内容"后续动作。

### P0-3　编辑器首屏为串行请求，且无并行优化

- **问题描述**：[EditorPage.vue#L296-L335](../apps/editor/src/views/EditorPage.vue#L296-L335) `onMounted` 中 `await getProject → await getPages → await getPage(详情)` 三段串行；详情接口为必调（列表不返回 schema，见注释 L319-L322）。
- **影响范围**：进入编辑器首屏时间 = 三次 RTT 之和；弱网/后端慢时显著。
- **出现场景**：从首页点击项目卡片进入编辑器。
- **优化方向**：项目信息与页面列表 `Promise.all` 并行；列表接口支持返回 schema 或在进入前 prefetch；加载态（已有 spinner L192-L197）保留。

---

## 三、影响体验的次要问题（P1）

### P1-1　保存反馈弱、可信度低

- 状态仅在顶栏一行小字（[EditorPage.vue#L80-L86](../apps/editor/src/views/EditorPage.vue#L80-L86)），`saving` 无全局指示；失败才 toast（[useAutoSave.ts#L96-L103](../apps/editor/src/composables/useAutoSave.ts#L96-L103)）。
- **场景**：用户改了很多，不确定是否已存。**优化**：保存中显示轻量进度点/顶部条，成功后短暂"已保存 ✓"反馈；离开页面前若有未保存变更做拦截提示。

### P1-2　前端超时(15s) < 后端超时(30s)，失败提示可能误报

- [request.ts#L31-L35](../apps/editor/src/api/request.ts#L31-L35) `API_TIMEOUT_MS = 15_000`；后端 Hikari 连接超时为 30s（本次排障已实测）。前端先断，用户看到"保存失败"但后端可能最终写入成功。
- **场景**：数据库抖动/冷启动时保存。**优化**：前端超时上调至 ≥ 后端（如 35s），或对 `/pages/save` 单独放宽并在超时后做一次状态校验。

### P1-3　登录后不消费 `redirect`，跳转丢失来源

- [LoginPage.vue#L307](../apps/editor/src/views/LoginPage.vue#L307) 固定 `router.push('/')`，未读取 `route.query.redirect`（路由守卫已写入该参数）。
- **场景**：未登录直达 `/editor/123`，登录后被丢回首页而非原目标。**优化**：登录成功后 `router.push(route.query.redirect || '/')`。

### P1-4　预览依赖 localStorage 单键传递，通道脆弱

- [EditorPage.vue#L396-L399](../apps/editor/src/views/EditorPage.vue#L396-L399) 写 `preview-page` 后 `window.open('/preview')`。
- **场景**：隐私模式/清理存储/多标签切换时预览空白；预览不反映新开标签后的修改。**优化**：改为 `postMessage` 传递或预览路由携带 `pageId` 从后端读取快照。

### P1-5　深色模式半成品

- [ContextMenu.vue#L5-L6](../apps/editor/src/components/ContextMenu.vue#L5-L6) 已写 `dark:` 类，但 `ThemeSwitcher` 未接入且 tailwind 未配置 darkMode 判据。
- **场景**：系统深色下右键菜单与其余浅色 UI 割裂。**优化**：要么补全 dark 变量体系，要么移除 `dark:` 类统一浅色。

### P1-6　原生弹窗污染关键交互

- 新建页面 [EditorPage.vue#L344](../apps/editor/src/views/EditorPage.vue#L344)、项目重命名 [HomePage.vue#L378](../apps/editor/src/views/HomePage.vue#L378)、删除确认 [HomePage.vue#L367](../apps/editor/src/views/HomePage.vue#L367)、组件删除/模板覆盖（CanvasComponent、useKeyboardShortcuts、TemplateModal）均用 `prompt/confirm`。
- **场景**：高频操作体验原始、样式不可控、无校验提示。**优化**：统一为内置 Modal + 输入校验。

---

## 四、可优化细节问题（P2）

| ID    | 问题                                                                                  | 证据                                                                                                                                                  | 优化方向                                          |
| ----- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| P2-1  | 图层子树项仅有删除，缺可见性/锁定（与顶层 LayerPanel 不一致）；无拖拽排序/重命名/多选 | [LayerTreeItem.vue](../apps/editor/src/components/LayerTreeItem.vue) vs [LayerPanel.vue](../apps/editor/src/components/LayerPanel.vue)                | 子项补齐可见/锁定；图层树支持拖拽排序与双击重命名 |
| P2-2  | 右键菜单无边界检测，靠右下缘溢出屏幕                                                  | [ContextMenu.vue#L150-L158](../apps/editor/src/components/ContextMenu.vue#L150-L158)、[#L5-L6](../apps/editor/src/components/ContextMenu.vue#L5-L6)   | show() 内按视口 clamp 或翻转                      |
| P2-3  | 已有 `selectedIds`/`toggleSelection` 多选状态，但 UI 未暴露框选/Shift 多选提示        | [editorStore.ts](../apps/editor/src/stores/editorStore.ts)                                                                                            | 暴露多选交互或暂移除死状态                        |
| P2-4  | 剪贴板仅内存、复制粘贴无成功反馈、不支持跨标签                                        | [editorStore.ts](../apps/editor/src/stores/editorStore.ts)                                                                                            | 复制/粘贴补 toast 反馈                            |
| P2-5  | 首页固定拉取 50 条、无分页控件                                                        | [HomePage.vue#L332](../apps/editor/src/views/HomePage.vue#L332)，全页无"分页/下一页"                                                                  | 增加分页或虚拟滚动                                |
| P2-6  | 历史仅 20 步上限，且无可视回退入口                                                    | `MAX_HISTORY_SIZE = 20` [editorStore.ts](../apps/editor/src/stores/editorStore.ts)                                                                    | 提高上限并接入 P0-1 的历史面板                    |
| P2-7  | 设计 token 缺失，`theme.extend` 为空，颜色/圆角/间距无统一规范                        | [tailwind.config.js](../apps/editor/tailwind.config.js)                                                                                               | 抽取 design tokens                                |
| P2-8  | 视觉/图标风格不统一（手写 SVG 与 lucide 混用、区块标题混用 emoji）                    | [ComponentPanel.vue](../apps/editor/src/components/ComponentPanel.vue)、[StylePanel.vue](../apps/editor/src/components/property-panel/StylePanel.vue) | 统一图标库与标题规范                              |
| P2-9  | 右侧面板固定 `w-80`，窄屏挤压画布                                                     | [PropertyPanel.vue#L3](../apps/editor/src/components/PropertyPanel.vue#L3)                                                                            | 支持折叠/拖拽调宽                                 |
| P2-10 | 画布空状态仅一行文字，无引导示例/动效                                                 | [Canvas.vue#L94](../apps/editor/src/components/Canvas.vue#L94)                                                                                        | 增加拖拽引导插画与首次使用提示                    |
| P2-11 | 自动保存每次 `deepClone` 全量 schema 再序列化                                         | [useAutoSave.ts#L59](../apps/editor/src/composables/useAutoSave.ts#L59)、[#L89](../apps/editor/src/composables/useAutoSave.ts#L89)                    | 大 schema 下评估增量/节流序列化                   |

> 说明：分包含策略（[vite.config.ts#L111-L121](../apps/editor/vite.config.ts#L111-L121) 仅拆 axios）、401 静默续期队列（[request.ts#L53-L82](../apps/editor/src/api/request.ts#L53-L82)）经核对为**已正确处理/刻意优化**，不计入问题。

---

## 五、体验优化需求清单（迭代执行依据）

| 需求ID | 优先级 | 维度     | 需求描述                                                                      | 验收要点                                                       |
| ------ | ------ | -------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------- |
| REQ-01 | P0     | 核心流程 | 决策并落地"幽灵功能"（历史面板/AI/动画/导出图片/主题/快捷键/对齐线/项目管理） | 每个功能「生产可触达」或「代码已移除」二选一，无中间态         |
| REQ-02 | P0     | 交互逻辑 | 导出改为可视化格式选择弹窗                                                    | 无原生 prompt；支持取消/重选；成功有反馈                       |
| REQ-03 | P0     | 性能     | 编辑器首屏请求并行化                                                          | 项目信息+页面列表并行；首屏可交互时间下降                      |
| REQ-04 | P1     | 性能     | 前后端超时对齐                                                                | 前端超时 ≥ 后端；慢请求不误报失败                              |
| REQ-05 | P1     | 反馈     | 保存状态强化                                                                  | 保存中有全局指示；离开未保存拦截                               |
| REQ-06 | P1     | 流程     | 登录消费 redirect                                                             | 直达受保护路由后登录回原页                                     |
| REQ-07 | P1     | 流程     | 预览通道健壮化                                                                | 隐私模式/多标签下预览正常                                      |
| REQ-08 | P1     | 视觉     | 深色模式补全或移除                                                            | 无割裂；无残留 dark: 类                                        |
| REQ-09 | P1     | 交互     | 原生弹窗内置化                                                                | prompt/confirm 全部替换为内置 Modal（含删除/重命名/新建/覆盖） |
| REQ-10 | P2     | 交互     | 图层树能力补齐                                                                | 子项可见/锁定；拖拽排序；重命名                                |
| REQ-11 | P2     | 交互     | 右键菜单边界处理                                                              | 任意位置菜单完整可见                                           |
| REQ-12 | P2     | 交互     | 多选与剪贴板反馈                                                              | 多选可操作或移除；复制/粘贴有提示                              |
| REQ-13 | P2     | 性能     | 首页分页/虚拟滚动                                                             | >50 项目可用                                                   |
| REQ-14 | P2     | 交互     | 历史步数提升+可视回退                                                         | 上限提升；可跳转历史点                                         |
| REQ-15 | P2     | 视觉     | 设计 token 与图标统一                                                         | 集中 theme 扩展；图标库统一                                    |
| REQ-16 | P2     | 视觉     | 布局响应式                                                                    | 右侧面板可折叠/调宽                                            |
| REQ-17 | P2     | 引导     | 画布空态引导                                                                  | 首次进入有引导插画与提示                                       |

---

## 六、附：疑似未接入功能清单（P0-1 决策结果）

> 「处置」列为 P0-1 决策落地后的状态。

| 组件                                  | 生产引用 | 仅测试引用               | 处置                                                       |
| ------------------------------------- | -------- | ------------------------ | ---------------------------------------------------------- |
| HistoryPanel                          | 无       | modal-components.test.ts | 已接入（编辑器工具栏）                                     |
| AIAssistant (+useAIAssistant)         | 无       | modal-components.test.ts | 已接入（编辑器工具栏）                                     |
| AnimationPanel (+useAnimation)        | 无       | modal-components.test.ts | 已移除（实现 + 单测）                                      |
| ExportImageModal                      | 无       | modal-components.test.ts | 已接入（编辑器工具栏，导出实现仍为占位，需接 html2canvas） |
| ThemeSwitcher (+useTheme)             | 无       | components.test.ts       | 已接入（编辑器工具栏）                                     |
| ShortcutsModal                        | 无       | components.test.ts       | 已接入（编辑器工具栏）                                     |
| AlignmentGuides (+useAlignmentGuides) | 无       | 无（完全孤立）           | 已移除（实现 + 单测）                                      |
| ProjectManager (+useProjectManager)   | 无       | modal-components.test.ts | 已移除（实现 + 单测）                                      |

**已确认正常接入**：`LayerPanel`（经 PageConfigPanel→PropertyPanel）、`DeviceSwitcher`/`ContextMenu`（经 Canvas）、`ComponentItem`（经 ComponentPanel）、`StyleSection`（经各属性面板）、`PreviewNode`（经 PreviewPage）。

---

## 七、优先级分级汇总

| 分级                         | 条目                                                                                                             | 数量 |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------- | ---- |
| **阻塞性核心问题（P0）**     | P0-1 幽灵功能未接入 / P0-2 导出用 prompt / P0-3 首屏串行请求                                                     | 3    |
| **影响体验的次要问题（P1）** | P1-1 保存反馈弱 / P1-2 超时不一致 / P1-3 redirect 丢失 / P1-4 预览通道脆弱 / P1-5 深色模式半成品 / P1-6 原生弹窗 | 6    |
| **可优化的细节问题（P2）**   | P2-1 ~ P2-11                                                                                                     | 11   |
