import { ref } from 'vue';
import { useEditorStore } from '../stores/editorStore';
import { generateId } from '@page-builder/shared';

export interface AIRecommendation {
  id: string;
  type: 'text' | 'layout' | 'component';
  title: string;
  description: string;
  action: () => void;
}

// 智能文案模板
const textTemplates = {
  hero: [
    '欢迎来到我们的产品',
    '开启全新体验',
    '创新改变生活',
    '品质成就未来',
  ],
  cta: [
    '立即开始',
    '了解更多',
    '免费试用',
    '联系我们',
  ],
  feature: [
    '简单易用',
    '安全可靠',
    '性能卓越',
    '专业服务',
  ],
};

// 布局推荐
const layoutRecommendations = [
  {
    name: '产品介绍',
    description: '适合展示产品特点和优势',
    components: ['text', 'image', 'text', 'button'],
  },
  {
    name: '服务展示',
    description: '适合展示服务内容和流程',
    components: ['text', 'card', 'card', 'card'],
  },
  {
    name: '团队介绍',
    description: '适合展示团队成员',
    components: ['text', 'image', 'text', 'divider', 'text'],
  },
];

export function useAIAssistant() {
  const { addComponent, page } = useEditorStore();
  const showAIPanel = ref(false);
  const recommendations = ref<AIRecommendation[]>([]);

  // 生成智能文案
  const generateText = (type: keyof typeof textTemplates) => {
    const templates = textTemplates[type];
    return templates[Math.floor(Math.random() * templates.length)];
  };

  // 分析当前页面并给出建议
  const analyzePage = () => {
    const suggestions: AIRecommendation[] = [];
    const components = page.value.children;

    // 如果没有组件，推荐添加标题
    if (components.length === 0) {
      suggestions.push({
        id: generateId(),
        type: 'component',
        title: '添加页面标题',
        description: '一个好的标题能吸引用户注意力',
        action: () => {
          addComponent('text', 'root', 0, {
            content: generateText('hero'),
            color: '#000000',
            fontSize: '24px',
            fontWeight: 'bold',
            textAlign: 'center',
          }, {
            padding: '24px',
            margin: '0 0 16px 0',
          });
        },
      });
    }

    // 如果没有按钮，推荐添加 CTA
    const hasButton = components.some(c => c.type === 'button');
    if (!hasButton && components.length > 0) {
      suggestions.push({
        id: generateId(),
        type: 'component',
        title: '添加行动按钮',
        description: '引导用户采取行动',
        action: () => {
          addComponent('button', 'root', components.length, {
            text: generateText('cta'),
            type: 'primary',
            size: 'large',
            block: true,
          }, {
            margin: '16px',
          });
        },
      });
    }

    // 如果没有图片，推荐添加
    const hasImage = components.some(c => c.type === 'image');
    if (!hasImage && components.length > 0) {
      suggestions.push({
        id: generateId(),
        type: 'component',
        title: '添加图片',
        description: '图片能让页面更生动',
        action: () => {
          addComponent('image', 'root', 1, {
            src: 'https://via.placeholder.com/375x200',
            alt: '配图',
            width: '100%',
            height: '200px',
            objectFit: 'cover',
          }, {});
        },
      });
    }

    // 推荐布局模板
    if (components.length < 3) {
      suggestions.push({
        id: generateId(),
        type: 'layout',
        title: '使用布局模板',
        description: '快速搭建专业页面',
        action: () => {
          showAIPanel.value = true;
        },
      });
    }

    recommendations.value = suggestions;
  };

  // 应用布局模板
  const applyLayout = (layoutIndex: number) => {
    const layout = layoutRecommendations[layoutIndex];
    if (!layout) return;

    const defaultProps: Record<string, any> = {
      text: { content: '请输入内容', color: '#333333', fontSize: '14px' },
      image: { src: 'https://via.placeholder.com/375x200', alt: '图片', width: '100%' },
      button: { text: '按钮', type: 'primary', size: 'medium' },
      card: { title: '卡片标题', backgroundColor: '#ffffff', padding: '16px' },
      divider: { color: '#e8e8e8', thickness: '1px', style: 'solid' },
    };

    layout.components.forEach((type, index) => {
      addComponent(type, 'root', index, defaultProps[type] || {}, {});
    });

    showAIPanel.value = false;
  };

  // 智能优化
  const optimizePage = () => {
    // 自动添加间距
    const components = page.value.children;
    components.forEach((comp, index) => {
      if (index > 0 && !comp.styles.margin) {
        // 这里应该调用 updateComponent，但为了简化，只给出建议
      }
    });
  };

  return {
    showAIPanel,
    recommendations,
    layoutRecommendations,
    generateText,
    analyzePage,
    applyLayout,
    optimizePage,
  };
}
