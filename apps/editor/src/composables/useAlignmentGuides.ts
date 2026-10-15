import { ref, computed } from 'vue';
import type { ComponentSchema } from '@page-builder/shared';

export interface AlignmentGuide {
  type: 'horizontal' | 'vertical';
  position: number;
  components: string[];
}

export function useAlignmentGuides() {
  const guides = ref<AlignmentGuide[]>([]);
  const showGuides = ref(true);
  const snapThreshold = ref(5); // 吸附阈值（像素）

  // 计算组件的位置信息
  const getComponentBounds = (component: ComponentSchema, canvasRect: DOMRect) => {
    const element = document.getElementById(component.id);
    if (!element) return null;

    const rect = element.getBoundingClientRect();
    return {
      id: component.id,
      left: rect.left - canvasRect.left,
      right: rect.right - canvasRect.left,
      top: rect.top - canvasRect.top,
      bottom: rect.bottom - canvasRect.top,
      centerX: (rect.left + rect.right) / 2 - canvasRect.left,
      centerY: (rect.top + rect.bottom) / 2 - canvasRect.top,
    };
  };

  // 检测对齐
  const detectAlignment = (
    draggingComponent: ComponentSchema,
    allComponents: ComponentSchema[],
    canvasRect: DOMRect
  ) => {
    if (!showGuides.value) {
      guides.value = [];
      return;
    }

    const draggingBounds = getComponentBounds(draggingComponent, canvasRect);
    if (!draggingBounds) return;

    const newGuides: AlignmentGuide[] = [];
    const positions = {
      horizontal: new Map<number, string[]>(),
      vertical: new Map<number, string[]>(),
    };

    // 收集所有组件的对齐位置
    allComponents.forEach(comp => {
      if (comp.id === draggingComponent.id) return;

      const bounds = getComponentBounds(comp, canvasRect);
      if (!bounds) return;

      // 垂直对齐线（左边、右边、中心）
      [bounds.left, bounds.right, bounds.centerX].forEach(x => {
        if (!positions.vertical.has(x)) {
          positions.vertical.set(x, []);
        }
        positions.vertical.get(x)!.push(comp.id);
      });

      // 水平对齐线（顶部、底部、中心）
      [bounds.top, bounds.bottom, bounds.centerY].forEach(y => {
        if (!positions.horizontal.has(y)) {
          positions.horizontal.set(y, []);
        }
        positions.horizontal.get(y)!.push(comp.id);
      });
    });

    // 检测拖拽组件是否对齐
    const draggingPositions = {
      vertical: [draggingBounds.left, draggingBounds.right, draggingBounds.centerX],
      horizontal: [draggingBounds.top, draggingBounds.bottom, draggingBounds.centerY],
    };

    // 检测垂直对齐
    draggingPositions.vertical.forEach(x => {
      positions.vertical.forEach((components, posX) => {
        if (Math.abs(x - posX) < snapThreshold.value) {
          newGuides.push({
            type: 'vertical',
            position: posX,
            components: [draggingComponent.id, ...components],
          });
        }
      });
    });

    // 检测水平对齐
    draggingPositions.horizontal.forEach(y => {
      positions.horizontal.forEach((components, posY) => {
        if (Math.abs(y - posY) < snapThreshold.value) {
          newGuides.push({
            type: 'horizontal',
            position: posY,
            components: [draggingComponent.id, ...components],
          });
        }
      });
    });

    guides.value = newGuides;
  };

  // 清除辅助线
  const clearGuides = () => {
    guides.value = [];
  };

  // 切换辅助线显示
  const toggleGuides = () => {
    showGuides.value = !showGuides.value;
    if (!showGuides.value) {
      clearGuides();
    }
  };

  return {
    guides,
    showGuides,
    snapThreshold,
    detectAlignment,
    clearGuides,
    toggleGuides,
  };
}
