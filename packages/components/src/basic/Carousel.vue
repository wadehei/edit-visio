<template>
  <div :style="carouselStyles">
    <div class="relative overflow-hidden rounded" :style="containerStyles">
      <!-- 轮播容器 -->
      <div
        class="flex transition-transform duration-500 ease-in-out"
        :style="{ transform: `translateX(-${currentIndex * 100}%)` }"
      >
        <div
          v-for="(slide, index) in slides"
          :key="index"
          class="w-full flex-shrink-0"
        >
          <img
            :src="slide.image"
            :alt="slide.alt || ''"
            class="w-full h-full object-cover"
          />
        </div>
      </div>

      <!-- 导航按钮 -->
      <button
        v-if="showArrows && slides.length > 1"
        @click="prev"
        class="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-colors"
      >
        ‹
      </button>
      <button
        v-if="showArrows && slides.length > 1"
        @click="next"
        class="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-colors"
      >
        ›
      </button>

      <!-- 指示器 -->
      <div
        v-if="showIndicators && slides.length > 1"
        class="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1"
      >
        <button
          v-for="(slide, index) in slides"
          :key="index"
          @click="goTo(index)"
          class="w-2 h-2 rounded-full transition-colors"
          :class="index === currentIndex ? 'bg-white' : 'bg-white/50'"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import type { ComponentSchema } from '@page-builder/shared';

interface Props {
  schema: ComponentSchema;
}

const props = defineProps<Props>();

interface CarouselProps {
  slides: Array<{ image: string; alt?: string }>;
  autoplay?: boolean;
  interval?: number;
  showArrows?: boolean;
  showIndicators?: boolean;
  height?: string;
  borderRadius?: string;
}

const carouselProps = computed(() => props.schema.props as CarouselProps);

const slides = computed(() => carouselProps.value.slides || []);
const autoplay = computed(() => carouselProps.value.autoplay !== false);
const interval = computed(() => carouselProps.value.interval || 3000);
const showArrows = computed(() => carouselProps.value.showArrows !== false);
const showIndicators = computed(() => carouselProps.value.showIndicators !== false);
const height = computed(() => carouselProps.value.height || '200px');
const borderRadius = computed(() => carouselProps.value.borderRadius || '8px');

const currentIndex = ref(0);
let autoplayTimer: ReturnType<typeof setInterval> | null = null;

const carouselStyles = computed(() => ({
  width: '100%',
  ...props.schema.styles,
}));

const containerStyles = computed(() => ({
  height: height.value,
  borderRadius: borderRadius.value,
}));

const next = () => {
  currentIndex.value = (currentIndex.value + 1) % slides.value.length;
};

const prev = () => {
  currentIndex.value = (currentIndex.value - 1 + slides.value.length) % slides.value.length;
};

const goTo = (index: number) => {
  currentIndex.value = index;
};

const startAutoplay = () => {
  if (autoplay.value && slides.value.length > 1) {
    autoplayTimer = setInterval(next, interval.value);
  }
};

const stopAutoplay = () => {
  if (autoplayTimer) {
    clearInterval(autoplayTimer);
    autoplayTimer = null;
  }
};

onMounted(() => {
  startAutoplay();
});

onUnmounted(() => {
  stopAutoplay();
});
</script>
