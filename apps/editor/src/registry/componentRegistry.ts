import type { Component as VueComponent } from 'vue';
import type { ComponentMeta } from '@page-builder/shared';
import {
  TextComponent, ButtonComponent, ImageComponent, ContainerComponent,
  DividerComponent, SpacerComponent, CardComponent, BadgeComponent,
  RichTextComponent, InputComponent, VideoComponent, AudioComponent, MapComponent,
  CarouselComponent, CountdownComponent, ProgressComponent,
} from '@page-builder/components';
import {
  TextMeta, ButtonMeta, ImageMeta, ContainerMeta,
  DividerMeta, SpacerMeta, CardMeta, BadgeMeta, RichTextMeta, InputMeta,
  VideoMeta, AudioMeta, MapMeta,
  CarouselMeta, CountdownMeta, ProgressMeta,
} from '@page-builder/components';

export interface ComponentRegistration {
  component: VueComponent;
  meta: ComponentMeta;
}

/**
 * 集中式组件注册表
 * 所有组件类型在此注册，消除多处重复的 componentMap / componentMetas
 */
const registry: Record<string, ComponentRegistration> = {
  text: { component: TextComponent, meta: TextMeta },
  button: { component: ButtonComponent, meta: ButtonMeta },
  image: { component: ImageComponent, meta: ImageMeta },
  container: { component: ContainerComponent, meta: ContainerMeta },
  divider: { component: DividerComponent, meta: DividerMeta },
  spacer: { component: SpacerComponent, meta: SpacerMeta },
  card: { component: CardComponent, meta: CardMeta },
  badge: { component: BadgeComponent, meta: BadgeMeta },
  richText: { component: RichTextComponent, meta: RichTextMeta },
  input: { component: InputComponent, meta: InputMeta },
  video: { component: VideoComponent, meta: VideoMeta },
  audio: { component: AudioComponent, meta: AudioMeta },
  map: { component: MapComponent, meta: MapMeta },
  carousel: { component: CarouselComponent, meta: CarouselMeta },
  countdown: { component: CountdownComponent, meta: CountdownMeta },
  progress: { component: ProgressComponent, meta: ProgressMeta },
};

/** 获取组件的 Vue 组件实例 */
export function getComponent(type: string): VueComponent | undefined {
  return registry[type]?.component;
}

/** 获取组件的元数据 */
export function getMeta(type: string): ComponentMeta | undefined {
  return registry[type]?.meta;
}

/** 获取所有已注册的 Meta 列表（用于组件面板） */
export function getAllMetas(): ComponentMeta[] {
  return Object.values(registry).map((r) => r.meta);
}

/** 获取所有已注册的组件类型 */
export function getRegisteredTypes(): string[] {
  return Object.keys(registry);
}

/** 判断组件类型是否支持子组件 */
export function isContainerType(type: string): boolean {
  return registry[type]?.meta.allowChildren === true;
}
