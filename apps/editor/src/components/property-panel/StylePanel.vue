<template>
  <!-- 尺寸 -->
  <StyleSection title="尺寸" icon="📐">
    <div class="grid grid-cols-2 gap-2">
      <StyleField
        label="宽"
        :value="styles.width"
        placeholder="auto"
        @change="emitStyleChange('width', $event)"
      />
      <StyleField
        label="高"
        :value="styles.height"
        placeholder="auto"
        @change="emitStyleChange('height', $event)"
      />
      <StyleField
        label="最小宽"
        :value="styles.minWidth"
        placeholder="0"
        @change="emitStyleChange('minWidth', $event)"
      />
      <StyleField
        label="最大宽"
        :value="styles.maxWidth"
        placeholder="none"
        @change="emitStyleChange('maxWidth', $event)"
      />
    </div>
  </StyleSection>

  <!-- 间距 -->
  <StyleSection title="间距" icon="📏">
    <div class="space-y-2">
      <StyleField
        label="内边距 (padding)"
        :value="styles.padding"
        placeholder="0px"
        @change="emitStyleChange('padding', $event)"
      />
      <StyleField
        label="外边距 (margin)"
        :value="styles.margin"
        placeholder="0px"
        @change="emitStyleChange('margin', $event)"
      />
    </div>
  </StyleSection>

  <!-- 排版 -->
  <StyleSection title="排版" icon="🔤">
    <div class="space-y-2">
      <div class="grid grid-cols-2 gap-2">
        <StyleField
          label="字号"
          :value="styles.fontSize"
          placeholder="14px"
          @change="emitStyleChange('fontSize', $event)"
        />
        <div>
          <label class="block text-[10px] text-gray-400 mb-0.5">字重</label>
          <select
            :value="styles.fontWeight || ''"
            class="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
            @change="emitStyleChange('fontWeight', ($event.target as HTMLSelectElement).value)"
          >
            <option value="">默认</option>
            <option v-for="w in fontWeightOptions" :key="w.value" :value="w.value">
              {{ w.label }}
            </option>
          </select>
        </div>
      </div>
      <div>
        <label class="block text-[10px] text-gray-400 mb-0.5">文字颜色</label>
        <input
          type="color"
          :value="styles.color || '#000000'"
          class="w-full h-7 border border-gray-200 rounded cursor-pointer"
          @input="emitStyleChange('color', ($event.target as HTMLInputElement).value)"
        />
      </div>
      <div class="grid grid-cols-2 gap-2">
        <StyleField
          label="行高"
          :value="styles.lineHeight"
          placeholder="1.5"
          @change="emitStyleChange('lineHeight', $event)"
        />
        <StyleField
          label="字间距"
          :value="styles.letterSpacing"
          placeholder="normal"
          @change="emitStyleChange('letterSpacing', $event)"
        />
      </div>
      <div>
        <label class="block text-[10px] text-gray-400 mb-0.5">对齐</label>
        <div class="flex gap-1">
          <button
            v-for="align in textAlignOptions"
            :key="align.value"
            class="flex-1 py-1 text-xs rounded border transition-colors"
            :class="
              styles.textAlign === align.value
                ? 'bg-blue-50 border-blue-300 text-blue-600'
                : 'border-gray-200 text-gray-500 hover:bg-gray-50'
            "
            @click="emitStyleChange('textAlign', align.value)"
          >
            {{ align.label }}
          </button>
        </div>
      </div>
    </div>
  </StyleSection>

  <!-- 边框 -->
  <StyleSection title="边框" icon="🔲">
    <div class="space-y-2">
      <div class="grid grid-cols-3 gap-2">
        <StyleField
          label="宽度"
          :value="styles.borderWidth"
          placeholder="0px"
          @change="emitStyleChange('borderWidth', $event)"
        />
        <div>
          <label class="block text-[10px] text-gray-400 mb-0.5">样式</label>
          <select
            :value="styles.borderStyle || ''"
            class="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
            @change="emitStyleChange('borderStyle', ($event.target as HTMLSelectElement).value)"
          >
            <option value="">无</option>
            <option v-for="s in borderStyleOptions" :key="s.value" :value="s.value">
              {{ s.label }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-[10px] text-gray-400 mb-0.5">颜色</label>
          <input
            type="color"
            :value="styles.borderColor || '#000000'"
            class="w-full h-7 border border-gray-200 rounded cursor-pointer"
            @input="emitStyleChange('borderColor', ($event.target as HTMLInputElement).value)"
          />
        </div>
      </div>
      <StyleField
        label="圆角"
        :value="styles.borderRadius"
        placeholder="0px"
        @change="emitStyleChange('borderRadius', $event)"
      />
    </div>
  </StyleSection>

  <!-- 背景 -->
  <StyleSection title="背景" icon="🎨">
    <div class="space-y-2">
      <div>
        <label class="block text-[10px] text-gray-400 mb-0.5">背景颜色</label>
        <input
          type="color"
          :value="styles.backgroundColor || '#ffffff'"
          class="w-full h-7 border border-gray-200 rounded cursor-pointer"
          @input="emitStyleChange('backgroundColor', ($event.target as HTMLInputElement).value)"
        />
      </div>
      <StyleField
        label="背景图片"
        :value="styles.backgroundImage"
        placeholder="url(...)"
        @change="emitStyleChange('backgroundImage', $event)"
      />
    </div>
  </StyleSection>

  <!-- 效果 -->
  <StyleSection title="效果" icon="✨">
    <div class="space-y-2">
      <div>
        <label class="block text-[10px] text-gray-400 mb-0.5"
          >透明度: {{ styles.opacity || '1' }}</label
        >
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          :value="styles.opacity || '1'"
          class="w-full h-1.5 accent-blue-500"
          @input="emitStyleChange('opacity', ($event.target as HTMLInputElement).value)"
        />
      </div>
      <StyleField
        label="阴影"
        :value="styles.boxShadow"
        placeholder="none"
        @change="emitStyleChange('boxShadow', $event)"
      />
    </div>
  </StyleSection>

  <!-- 布局 (仅容器类组件显示) -->
  <StyleSection v-if="isContainer" title="布局" icon="📋">
    <div class="space-y-2">
      <div>
        <label class="block text-[10px] text-gray-400 mb-0.5">显示方式</label>
        <select
          :value="styles.display || ''"
          class="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
          @change="emitStyleChange('display', ($event.target as HTMLSelectElement).value)"
        >
          <option value="">默认</option>
          <option v-for="d in displayOptions" :key="d.value" :value="d.value">{{ d.label }}</option>
        </select>
      </div>
      <div v-if="styles.display === 'flex'" class="grid grid-cols-2 gap-2">
        <div>
          <label class="block text-[10px] text-gray-400 mb-0.5">方向</label>
          <select
            :value="styles.flexDirection || ''"
            class="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
            @change="emitStyleChange('flexDirection', ($event.target as HTMLSelectElement).value)"
          >
            <option value="">默认</option>
            <option v-for="dir in flexDirectionOptions" :key="dir.value" :value="dir.value">
              {{ dir.label }}
            </option>
          </select>
        </div>
        <StyleField
          label="间距"
          :value="styles.gap"
          placeholder="0px"
          @change="emitStyleChange('gap', $event)"
        />
      </div>
      <div v-if="styles.display === 'flex'" class="grid grid-cols-2 gap-2">
        <div>
          <label class="block text-[10px] text-gray-400 mb-0.5">主轴对齐</label>
          <select
            :value="styles.justifyContent || ''"
            class="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
            @change="emitStyleChange('justifyContent', ($event.target as HTMLSelectElement).value)"
          >
            <option value="">默认</option>
            <option v-for="j in justifyContentOptions" :key="j.value" :value="j.value">
              {{ j.label }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-[10px] text-gray-400 mb-0.5">交叉轴对齐</label>
          <select
            :value="styles.alignItems || ''"
            class="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
            @change="emitStyleChange('alignItems', ($event.target as HTMLSelectElement).value)"
          >
            <option value="">默认</option>
            <option v-for="a in alignItemsOptions" :key="a.value" :value="a.value">
              {{ a.label }}
            </option>
          </select>
        </div>
      </div>
    </div>
  </StyleSection>
</template>

<script setup lang="ts">
import StyleSection from '../StyleSection.vue';
import StyleField from '../StyleField.vue';

defineProps<{
  styles: Record<string, string | undefined>;
  isContainer: boolean;
}>();

const emit = defineEmits<{
  (e: 'styleChange', styleName: string, value: string): void;
}>();

const emitStyleChange = (styleName: string, value: string) => {
  emit('styleChange', styleName, value);
};

// 静态选项数据（提取为常量，避免每次渲染重建）
const fontWeightOptions = [
  { value: '', label: '默认' },
  { value: 'normal', label: '正常' },
  { value: 'bold', label: '粗体' },
  { value: '100', label: '100' },
  { value: '200', label: '200' },
  { value: '300', label: '300' },
  { value: '400', label: '400' },
  { value: '500', label: '500' },
  { value: '600', label: '600' },
  { value: '700', label: '700' },
  { value: '800', label: '800' },
  { value: '900', label: '900' },
];

const textAlignOptions = [
  { value: 'left', label: '左' },
  { value: 'center', label: '中' },
  { value: 'right', label: '右' },
  { value: 'justify', label: '两端' },
];

const borderStyleOptions = [
  { value: 'solid', label: '实线' },
  { value: 'dashed', label: '虚线' },
  { value: 'dotted', label: '点线' },
  { value: 'double', label: '双线' },
];

const displayOptions = [
  { value: 'block', label: '块级' },
  { value: 'flex', label: '弹性' },
  { value: 'grid', label: '网格' },
  { value: 'inline', label: '行内' },
  { value: 'none', label: '隐藏' },
];

const flexDirectionOptions = [
  { value: 'row', label: '水平' },
  { value: 'column', label: '垂直' },
  { value: 'row-reverse', label: '水平反转' },
  { value: 'column-reverse', label: '垂直反转' },
];

const justifyContentOptions = [
  { value: 'flex-start', label: '起始' },
  { value: 'center', label: '居中' },
  { value: 'flex-end', label: '末尾' },
  { value: 'space-between', label: '两端' },
  { value: 'space-around', label: '分散' },
];

const alignItemsOptions = [
  { value: 'flex-start', label: '起始' },
  { value: 'center', label: '居中' },
  { value: 'flex-end', label: '末尾' },
  { value: 'stretch', label: '拉伸' },
];
</script>
