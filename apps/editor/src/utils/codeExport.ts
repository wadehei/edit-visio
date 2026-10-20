import type {
  PageSchema,
  ComponentSchema,
  TextProps,
  ButtonProps,
  ImageProps,
  CardProps,
  BadgeProps,
  RichTextProps,
  InputProps,
} from '@page-builder/shared';
import { escapeHTML, getComponentProps } from '@page-builder/shared';

// ========== 公共工具 ==========

/** 将 camelCase CSS 属性转为 kebab-case 并构建 style 属性字符串 */
function buildStyleAttr(component: ComponentSchema): string {
  const styles = Object.entries(component.styles)
    .map(([key, value]) => `${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value}`)
    .join('; ');
  return styles ? ` style="${styles}"` : '';
}

/** 递归渲染子组件为 HTML */
function renderChildrenHTML(components: ComponentSchema[] | undefined): string {
  return components?.map(componentToHTML).join('') || '';
}

/** 递归渲染子组件为 Vue 模板 */
function renderChildrenVue(components: ComponentSchema[] | undefined, indent: number): string {
  return components?.map(c => componentToVueTemplate(c, indent)).join('\n') || '';
}

// ========== HTML 导出 ==========

/** 单组件 → HTML 片段 */
function componentToHTML(component: ComponentSchema): string {
  const styleAttr = buildStyleAttr(component);

  switch (component.type) {
    case 'text': {
      const props = getComponentProps<TextProps>(component, 'text', { content: '' });
      return `<div${styleAttr}>${escapeHTML(props.content)}</div>`;
    }

    case 'button': {
      const props = getComponentProps<ButtonProps>(component, 'button', { text: '按钮' });
      return `<button${styleAttr}>${escapeHTML(props.text)}</button>`;
    }

    case 'image': {
      const props = getComponentProps<ImageProps>(component, 'image', { src: '', alt: '' });
      return `<img src="${escapeHTML(props.src)}" alt="${escapeHTML(props.alt)}"${styleAttr} />`;
    }

    case 'container':
      return `<div${styleAttr}>${renderChildrenHTML(component.children)}</div>`;

    case 'divider':
      return `<hr${styleAttr} />`;

    case 'spacer':
      return `<div${styleAttr}></div>`;

    case 'card': {
      const props = getComponentProps<CardProps>(component, 'card', {});
      const children = renderChildrenHTML(component.children);
      let html = `<div${styleAttr}>`;
      if (props.title) {
        html += `<div style="padding: 16px; font-size: 16px; font-weight: 600; border-bottom: 1px solid #f0f0f0;">${escapeHTML(props.title)}</div>`;
      }
      html += `<div style="padding: 16px;">${children}</div>`;
      if (props.footer) {
        html += `<div style="padding: 16px; border-top: 1px solid #f0f0f0;">${escapeHTML(props.footer)}</div>`;
      }
      html += '</div>';
      return html;
    }

    case 'badge': {
      const props = getComponentProps<BadgeProps>(component, 'badge', { text: '' });
      return `<span${styleAttr}>${escapeHTML(props.text)}</span>`;
    }

    case 'richText': {
      const props = getComponentProps<RichTextProps>(component, 'richText', { content: '' });
      return `<div${styleAttr}>${escapeHTML(props.content)}</div>`;
    }

    case 'input': {
      const props = getComponentProps<InputProps>(component, 'input', { inputType: 'text', placeholder: '' });
      let html = `<div${styleAttr}>`;
      if (props.label) {
        html += `<label style="display: block; margin-bottom: 4px; font-size: 14px;">${escapeHTML(props.label)}</label>`;
      }
      html += `<input type="${escapeHTML(props.inputType)}" placeholder="${escapeHTML(props.placeholder)}" />`;
      html += '</div>';
      return html;
    }

    default:
      return `<div${styleAttr}>Unknown component: ${component.type}</div>`;
  }
}

/** 将完整页面导出为独立 HTML 文件 */
export function exportToHTML(page: PageSchema): string {
  const children = page.children.map(componentToHTML).join('\n    ');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHTML(page.props.title)}</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: ${page.props.backgroundColor};
      ${page.props.backgroundImage ? `background-image: url(${page.props.backgroundImage});` : ''}
    }
    button {
      cursor: pointer;
      border: none;
      outline: none;
    }
    img {
      max-width: 100%;
      height: auto;
    }
    input {
      outline: none;
    }
  </style>
</head>
<body>
  <div style="max-width: 375px; margin: 0 auto; min-height: 100vh;">
    ${children}
  </div>
</body>
</html>`;
}

// ========== Vue SFC 导出 ==========

/** 单组件 → Vue 模板片段（带缩进） */
function componentToVueTemplate(component: ComponentSchema, indent: number = 4): string {
  const pad = ' '.repeat(indent);
  const styleAttr = buildStyleAttr(component);

  switch (component.type) {
    case 'text': {
      const props = getComponentProps<TextProps>(component, 'text', { content: '' });
      return `${pad}<div${styleAttr}>${escapeHTML(props.content)}</div>`;
    }

    case 'button': {
      const props = getComponentProps<ButtonProps>(component, 'button', { text: '按钮' });
      return `${pad}<button${styleAttr}>${escapeHTML(props.text)}</button>`;
    }

    case 'image': {
      const props = getComponentProps<ImageProps>(component, 'image', { src: '', alt: '' });
      return `${pad}<img src="${escapeHTML(props.src)}" alt="${escapeHTML(props.alt)}"${styleAttr} />`;
    }

    case 'container': {
      const children = renderChildrenVue(component.children, indent + 2);
      return `${pad}<div${styleAttr}>\n${children}\n${pad}</div>`;
    }

    case 'divider':
      return `${pad}<hr${styleAttr} />`;

    case 'spacer':
      return `${pad}<div${styleAttr}></div>`;

    case 'card': {
      const props = getComponentProps<CardProps>(component, 'card', {});
      const children = renderChildrenVue(component.children, indent + 2);
      let html = `${pad}<div${styleAttr}>\n`;
      if (props.title) {
        html += `${pad}  <div style="padding: 16px; font-size: 16px; font-weight: 600; border-bottom: 1px solid #f0f0f0;">${escapeHTML(props.title)}</div>\n`;
      }
      html += `${pad}  <div style="padding: 16px;">\n${children}\n${pad}  </div>\n`;
      if (props.footer) {
        html += `${pad}  <div style="padding: 16px; border-top: 1px solid #f0f0f0;">${escapeHTML(props.footer)}</div>\n`;
      }
      html += `${pad}</div>`;
      return html;
    }

    case 'badge': {
      const props = getComponentProps<BadgeProps>(component, 'badge', { text: '' });
      return `${pad}<span${styleAttr}>${escapeHTML(props.text)}</span>`;
    }

    case 'richText': {
      const props = getComponentProps<RichTextProps>(component, 'richText', { content: '' });
      // NOTE: v-html 存在 XSS 风险，确保 content 来源可信
      return `${pad}<div${styleAttr} v-html="'${escapeHTML(props.content).replace(/'/g, "\\'")}'"></div>`;
    }

    case 'input': {
      const props = getComponentProps<InputProps>(component, 'input', { inputType: 'text', placeholder: '' });
      let html = `${pad}<div${styleAttr}>\n`;
      if (props.label) {
        html += `${pad}  <label style="display: block; margin-bottom: 4px; font-size: 14px;">${escapeHTML(props.label)}</label>\n`;
      }
      html += `${pad}  <input type="${escapeHTML(props.inputType)}" placeholder="${escapeHTML(props.placeholder)}" />\n`;
      html += `${pad}</div>`;
      return html;
    }

    default:
      return `${pad}<div${styleAttr}>Unknown component: ${component.type}</div>`;
  }
}

/** 将完整页面导出为 Vue SFC 文件 */
export function exportToVue(page: PageSchema): string {
  const children = page.children.map(c => componentToVueTemplate(c)).join('\n');

  return `<template>
  <div class="page-container">
${children}
  </div>
</template>

<script setup lang="ts">
// 页面: ${page.name}
// 版本: ${page.version}
</script>

<style scoped>
.page-container {
  max-width: 375px;
  margin: 0 auto;
  min-height: 100vh;
  background-color: ${page.props.backgroundColor};
  ${page.props.backgroundImage ? `background-image: url(${page.props.backgroundImage});` : ''}
}
</style>
`;
}
