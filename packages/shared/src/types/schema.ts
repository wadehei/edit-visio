// 组件 Schema 定义
export interface ComponentSchema {
  id: string;
  type: string;
  props: Record<string, unknown>;
  styles: Partial<CSSStyleDeclaration>;
  events?: EventConfig[];
  children?: ComponentSchema[];
  /** 是否锁定（锁定后不可选中/拖拽） */
  locked?: boolean;
  /** 是否可见（隐藏后编辑时半透明显示，预览时不渲染） */
  visible?: boolean;
}

// ========== 各组件 Props 类型定义 ==========

export interface TextProps {
  content: string;
  color?: string;
  fontSize?: string;
  fontWeight?: string;
  textAlign?: string;
}

export interface ButtonProps {
  text: string;
  type?: 'primary' | 'secondary' | 'default';
  size?: 'small' | 'medium' | 'large';
  block?: boolean;
}

export interface ImageProps {
  src: string;
  alt: string;
  width?: string;
  height?: string;
  objectFit?: string;
}

export interface ContainerProps {
  direction?: 'row' | 'column';
  gap?: string;
  padding?: string;
}

export interface CardProps {
  title?: string;
  footer?: string;
  backgroundColor?: string;
  borderRadius?: string;
  padding?: string;
  shadow?: 'small' | 'medium' | 'large';
}

export interface BadgeProps {
  text: string;
  type?: 'primary' | 'success' | 'warning' | 'danger';
  size?: 'small' | 'medium' | 'large';
}

export interface RichTextProps {
  content: string;
}

export interface InputProps {
  label?: string;
  inputType?: 'text' | 'number' | 'email' | 'password' | 'tel' | 'url';
  placeholder?: string;
}

export interface DividerProps {
  color?: string;
  thickness?: string;
  margin?: string;
}

export interface SpacerProps {
  height?: string;
}

/** 组件类型 → Props 映射表（类型安全的 props 访问） */
export interface ComponentPropsMap {
  text: TextProps;
  button: ButtonProps;
  image: ImageProps;
  container: ContainerProps;
  card: CardProps;
  badge: BadgeProps;
  richText: RichTextProps;
  input: InputProps;
  divider: DividerProps;
  spacer: SpacerProps;
}

/**
 * 安全获取组件 props（带默认值）
 * 避免在导出/渲染代码中使用 as any
 */
export function getComponentProps<T extends string>(
  component: ComponentSchema,
  type: T,
  defaults: T extends keyof ComponentPropsMap ? ComponentPropsMap[T] : Record<string, unknown>
): T extends keyof ComponentPropsMap ? ComponentPropsMap[T] : Record<string, unknown> {
  return { ...defaults, ...component.props } as any;
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
