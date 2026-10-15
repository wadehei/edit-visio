import type { PageSchema, ComponentSchema } from '@page-builder/shared';

/**
 * 将组件 Schema 转换为 HTML
 */
function componentToHTML(component: ComponentSchema): string {
  const styles = Object.entries(component.styles)
    .map(([key, value]) => `${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value}`)
    .join('; ');

  const styleAttr = styles ? ` style="${styles}"` : '';

  switch (component.type) {
    case 'text': {
      const props = component.props as any;
      return `<div${styleAttr}>${props.content || ''}</div>`;
    }

    case 'button': {
      const props = component.props as any;
      return `<button${styleAttr}>${props.text || '按钮'}</button>`;
    }

    case 'image': {
      const props = component.props as any;
      return `<img src="${props.src || ''}" alt="${props.alt || ''}"${styleAttr} />`;
    }

    case 'container': {
      const children = component.children?.map(componentToHTML).join('') || '';
      return `<div${styleAttr}>${children}</div>`;
    }

    case 'divider': {
      return `<hr${styleAttr} />`;
    }

    case 'spacer': {
      return `<div${styleAttr}></div>`;
    }

    case 'card': {
      const props = component.props as any;
      const children = component.children?.map(componentToHTML).join('') || '';
      let html = `<div${styleAttr}>`;
      if (props.title) {
        html += `<div style="padding: 16px; font-size: 16px; font-weight: 600; border-bottom: 1px solid #f0f0f0;">${props.title}</div>`;
      }
      html += `<div style="padding: 16px;">${children}</div>`;
      if (props.footer) {
        html += `<div style="padding: 16px; border-top: 1px solid #f0f0f0;">${props.footer}</div>`;
      }
      html += '</div>';
      return html;
    }

    case 'badge': {
      const props = component.props as any;
      return `<span${styleAttr}>${props.text || ''}</span>`;
    }

    case 'richText': {
      const props = component.props as any;
      return `<div${styleAttr}>${props.content || ''}</div>`;
    }

    case 'input': {
      const props = component.props as any;
      let html = `<div${styleAttr}>`;
      if (props.label) {
        html += `<label style="display: block; margin-bottom: 4px; font-size: 14px;">${props.label}</label>`;
      }
      html += `<input type="${props.inputType || 'text'}" placeholder="${props.placeholder || ''}" />`;
      html += '</div>';
      return html;
    }

    default:
      return `<div${styleAttr}>Unknown component: ${component.type}</div>`;
  }
}

/**
 * 导出为 HTML
 */
export function exportToHTML(page: PageSchema): string {
  const children = page.children.map(componentToHTML).join('\n    ');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${page.props.title}</title>
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

/**
 * 将组件 Schema 转换为 Vue 模板
 */
function componentToVueTemplate(component: ComponentSchema, indent: number = 4): string {
  const indentStr = ' '.repeat(indent);
  const styles = Object.entries(component.styles)
    .map(([key, value]) => `${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value}`)
    .join('; ');

  const styleAttr = styles ? ` style="${styles}"` : '';

  switch (component.type) {
    case 'text': {
      const props = component.props as any;
      return `${indentStr}<div${styleAttr}>${props.content || ''}</div>`;
    }

    case 'button': {
      const props = component.props as any;
      return `${indentStr}<button${styleAttr}>${props.text || '按钮'}</button>`;
    }

    case 'image': {
      const props = component.props as any;
      return `${indentStr}<img src="${props.src || ''}" alt="${props.alt || ''}"${styleAttr} />`;
    }

    case 'container': {
      const children = component.children?.map(c => componentToVueTemplate(c, indent + 2)).join('\n') || '';
      return `${indentStr}<div${styleAttr}>\n${children}\n${indentStr}</div>`;
    }

    case 'divider': {
      return `${indentStr}<hr${styleAttr} />`;
    }

    case 'spacer': {
      return `${indentStr}<div${styleAttr}></div>`;
    }

    case 'card': {
      const props = component.props as any;
      const children = component.children?.map(c => componentToVueTemplate(c, indent + 2)).join('\n') || '';
      let html = `${indentStr}<div${styleAttr}>\n`;
      if (props.title) {
        html += `${indentStr}  <div style="padding: 16px; font-size: 16px; font-weight: 600; border-bottom: 1px solid #f0f0f0;">${props.title}</div>\n`;
      }
      html += `${indentStr}  <div style="padding: 16px;">\n${children}\n${indentStr}  </div>\n`;
      if (props.footer) {
        html += `${indentStr}  <div style="padding: 16px; border-top: 1px solid #f0f0f0;">${props.footer}</div>\n`;
      }
      html += `${indentStr}</div>`;
      return html;
    }

    case 'badge': {
      const props = component.props as any;
      return `${indentStr}<span${styleAttr}>${props.text || ''}</span>`;
    }

    case 'richText': {
      const props = component.props as any;
      return `${indentStr}<div${styleAttr} v-html="'${(props.content || '').replace(/'/g, "\\'")}'"></div>`;
    }

    case 'input': {
      const props = component.props as any;
      let html = `${indentStr}<div${styleAttr}>\n`;
      if (props.label) {
        html += `${indentStr}  <label style="display: block; margin-bottom: 4px; font-size: 14px;">${props.label}</label>\n`;
      }
      html += `${indentStr}  <input type="${props.inputType || 'text'}" placeholder="${props.placeholder || ''}" />\n`;
      html += `${indentStr}</div>`;
      return html;
    }

    default:
      return `${indentStr}<div${styleAttr}>Unknown component: ${component.type}</div>`;
  }
}

/**
 * 导出为 Vue 组件
 */
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
