import { ref, computed } from 'vue';

export type AnimationType =
  | 'none'
  | 'fadeIn'
  | 'fadeInUp'
  | 'fadeInDown'
  | 'fadeInLeft'
  | 'fadeInRight'
  | 'slideInUp'
  | 'slideInDown'
  | 'slideInLeft'
  | 'slideInRight'
  | 'zoomIn'
  | 'bounceIn'
  | 'rotateIn'
  | 'flipIn';

export interface AnimationConfig {
  type: AnimationType;
  duration: number;
  delay: number;
  easing: string;
  iteration: 'once' | 'infinite';
}

export const animationPresets: Record<AnimationType, string> = {
  none: '',
  fadeIn: 'fadeIn 0.5s ease-in',
  fadeInUp: 'fadeInUp 0.5s ease-out',
  fadeInDown: 'fadeInDown 0.5s ease-out',
  fadeInLeft: 'fadeInLeft 0.5s ease-out',
  fadeInRight: 'fadeInRight 0.5s ease-out',
  slideInUp: 'slideInUp 0.5s ease-out',
  slideInDown: 'slideInDown 0.5s ease-out',
  slideInLeft: 'slideInLeft 0.5s ease-out',
  slideInRight: 'slideInRight 0.5s ease-out',
  zoomIn: 'zoomIn 0.5s ease-out',
  bounceIn: 'bounceIn 0.6s ease-out',
  rotateIn: 'rotateIn 0.5s ease-out',
  flipIn: 'flipIn 0.5s ease-out',
};

export const animationCategories = [
  {
    name: '淡入',
    animations: ['fadeIn', 'fadeInUp', 'fadeInDown', 'fadeInLeft', 'fadeInRight'],
  },
  {
    name: '滑入',
    animations: ['slideInUp', 'slideInDown', 'slideInLeft', 'slideInRight'],
  },
  {
    name: '特殊',
    animations: ['zoomIn', 'bounceIn', 'rotateIn', 'flipIn'],
  },
];

export function useAnimation() {
  const currentAnimation = ref<AnimationConfig>({
    type: 'none',
    duration: 500,
    delay: 0,
    easing: 'ease-out',
    iteration: 'once',
  });

  const animationStyle = computed(() => {
    if (currentAnimation.value.type === 'none') {
      return {};
    }

    const preset = animationPresets[currentAnimation.value.type];
    const duration = currentAnimation.value.duration / 1000;
    const delay = currentAnimation.value.delay / 1000;
    const iteration = currentAnimation.value.iteration === 'infinite' ? 'infinite' : '1';

    return {
      animation: `${preset.replace(/[\d.]+s/, `${duration}s`)} ${delay}s ${iteration}`,
    };
  });

  const setAnimation = (type: AnimationType) => {
    currentAnimation.value = { ...currentAnimation.value, type };
  };

  const setDuration = (duration: number) => {
    currentAnimation.value = { ...currentAnimation.value, duration };
  };

  const setDelay = (delay: number) => {
    currentAnimation.value = { ...currentAnimation.value, delay };
  };

  const setEasing = (easing: string) => {
    currentAnimation.value = { ...currentAnimation.value, easing };
  };

  const setIteration = (iteration: 'once' | 'infinite') => {
    currentAnimation.value = { ...currentAnimation.value, iteration };
  };

  return {
    currentAnimation,
    animationStyle,
    animationPresets,
    animationCategories,
    setAnimation,
    setDuration,
    setDelay,
    setEasing,
    setIteration,
  };
}
