// 组件 Schema 定义
export interface ComponentSchema {
  id: string;
  type: string;
  props: Record<string, unknown>;
  styles: Partial<CSSStyleDeclaration>;
  events?: EventConfig[];
  children?: ComponentSchema[];
}

// 事件配置
export interface EventConfig {
  type: string;
  action: EventAction;
}

// 事件动作
export interface EventAction {
  type: 'link' | 'script' | 'emit';
  payload: Record<string, unknown>;
}

// 页面 Schema
export interface PageSchema {
  id: string;
  name: string;
  version: string;
  props: PageProps;
  children: ComponentSchema[];
}

// 页面属性
export interface PageProps {
  title: string;
  backgroundColor: string;
  backgroundImage?: string;
  padding?: string;
}

// 组件元数据
export interface ComponentMeta {
  type: string;
  label: string;
  category: 'basic' | 'business' | 'custom';
  icon?: string;
  defaultProps: Record<string, unknown>;
  defaultStyles: Partial<CSSStyleDeclaration>;
  allowChildren: boolean;
  propDefinitions: PropDefinition[];
}

// 属性定义
export interface PropDefinition {
  name: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'color' | 'image' | 'select' | 'textarea';
  defaultValue?: unknown;
  required?: boolean;
  options?: Array<{ label: string; value: string }>;
  placeholder?: string;
}

// 拖拽数据类型
export interface DragData {
  type: 'new-component' | 'existing-component';
  componentType?: string;
  componentId?: string;
}

// 放置位置
export interface DropPosition {
  parentId: string;
  index: number;
  position: 'before' | 'after' | 'inside';
}

// 编辑器状态
export interface EditorState {
  page: PageSchema;
  selectedId: string | null;
  hoveredId: string | null;
  isDragging: boolean;
  history: {
    past: PageSchema[];
    future: PageSchema[];
  };
}
