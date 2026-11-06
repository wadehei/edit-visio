import { describe, it, expect } from 'vitest';
import type { ComponentSchema, PageSchema } from '@page-builder/shared';
import { exportToHTML, exportToVue } from '../utils/codeExport';

/** 构造测试用组件（styles 放宽为任意键值，便于验证过滤逻辑） */
type LooseComponent = {
  id?: string;
  type: string;
  props?: Record<string, unknown>;
  styles?: Record<string, unknown>;
  children?: ComponentSchema[];
};

function comp(partial: LooseComponent): ComponentSchema {
  return {
    id: partial.id ?? 'comp-1',
    type: partial.type,
    props: partial.props ?? {},
    styles: (partial.styles ?? {}) as unknown as ComponentSchema['styles'],
    children: partial.children ?? [],
  };
}

function page(children: ComponentSchema[], props?: Partial<PageSchema['props']>): PageSchema {
  return {
    id: 'page-1',
    name: '测试页',
    version: '2.3.4',
    props: { title: '测试标题', backgroundColor: '#ffffff', ...props },
    children,
  };
}

describe('exportToHTML', () => {
  it('应输出完整文档骨架与页面属性', () => {
    const html = exportToHTML(page([], { title: '首页', backgroundColor: '#fafafa' }));

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<title>首页</title>');
    expect(html).toContain('background-color: #fafafa;');
    expect(html).not.toContain('background-image');
  });

  it('应对页面标题做 HTML 转义', () => {
    expect(exportToHTML(page([], { title: '<script>' }))).toContain(
      '<title>&lt;script&gt;</title>',
    );
  });

  it('存在背景图时应输出 background-image', () => {
    expect(exportToHTML(page([], { backgroundImage: 'bg.png' }))).toContain(
      'background-image: url(bg.png);',
    );
  });

  it('text 组件应转义内容', () => {
    const html = exportToHTML(page([comp({ type: 'text', props: { content: '<b>hi</b>' } })]));
    expect(html).toContain('<div>&lt;b&gt;hi&lt;/b&gt;</div>');
  });

  it('button 组件缺省文案为「按钮」', () => {
    expect(exportToHTML(page([comp({ type: 'button' })]))).toContain('<button>按钮</button>');
  });

  it('image 组件应生成 img 标签', () => {
    const html = exportToHTML(page([comp({ type: 'image', props: { src: 'a.png', alt: '图' } })]));
    expect(html).toContain('<img src="a.png" alt="图" />');
  });

  it('container 应递归渲染子节点', () => {
    const html = exportToHTML(
      page([
        comp({
          type: 'container',
          children: [comp({ type: 'text', props: { content: 'child' } })],
        }),
      ]),
    );
    expect(html).toContain('<div><div>child</div></div>');
  });

  it('divider 与 spacer 应生成对应标签', () => {
    expect(exportToHTML(page([comp({ type: 'divider' })]))).toContain('<hr />');
    expect(exportToHTML(page([comp({ type: 'spacer' })]))).toContain('<div></div>');
  });

  it('card 应根据 title/footer 可选渲染', () => {
    const withBoth = exportToHTML(
      page([comp({ type: 'card', props: { title: '标题', footer: '底部' } })]),
    );
    expect(withBoth).toContain('标题');
    expect(withBoth).toContain('底部');

    const bare = exportToHTML(page([comp({ type: 'card' })]));
    expect(bare).not.toContain('border-bottom');
    expect(bare).not.toContain('border-top');
  });

  it('badge 与 richText 应输出转义文本', () => {
    expect(exportToHTML(page([comp({ type: 'badge', props: { text: 'A&B' } })]))).toContain(
      '<span>A&amp;B</span>',
    );
    expect(
      exportToHTML(page([comp({ type: 'richText', props: { content: '<i>x</i>' } })])),
    ).toContain('<div>&lt;i&gt;x&lt;/i&gt;</div>');
  });

  it('input 应仅在提供 label 时渲染 label', () => {
    const withLabel = exportToHTML(
      page([
        comp({
          type: 'input',
          props: { label: '姓名', inputType: 'email', placeholder: '请输入' },
        }),
      ]),
    );
    expect(withLabel).toContain('>姓名</label>');
    expect(withLabel).toContain('<input type="email" placeholder="请输入" />');

    const noLabel = exportToHTML(page([comp({ type: 'input' })]));
    expect(noLabel).not.toContain('<label');
    expect(noLabel).toContain('<input type="text" placeholder="" />');
  });

  it('未知组件类型应输出占位说明', () => {
    expect(exportToHTML(page([comp({ type: 'mystery' })]))).toContain('Unknown component: mystery');
  });

  it('样式应转 kebab-case 且过滤非字符串/数字值', () => {
    const html = exportToHTML(
      page([
        comp({
          type: 'spacer',
          styles: { paddingTop: '8px', width: 100, onClick: () => undefined },
        }),
      ]),
    );
    expect(html).toContain('<div style="padding-top: 8px; width: 100"></div>');
  });

  it('无样式时不输出 style 属性', () => {
    expect(exportToHTML(page([comp({ type: 'spacer' })]))).toContain('<div></div>');
  });
});

describe('exportToVue', () => {
  it('应输出 template / script / style 三段式结构', () => {
    const sfc = exportToVue(page([]));

    expect(sfc).toContain('<template>');
    expect(sfc).toContain('class="page-container"');
    expect(sfc).toContain('// 页面: 测试页');
    expect(sfc).toContain('// 版本: 2.3.4');
    expect(sfc).toContain('<style scoped>');
    expect(sfc).toContain('background-color: #ffffff;');
  });

  it('richText 应转义后以 v-html 输出', () => {
    const sfc = exportToVue(page([comp({ type: 'richText', props: { content: "<b>it's</b>" } })]));
    // escapeHTML 会把单引号转为 &#39;，故 v-html 值内不再出现裸单引号
    expect(sfc).toContain(`v-html="'&lt;b&gt;it&#39;s&lt;/b&gt;'"`);
  });

  it('存在背景图时应写入 scoped 样式', () => {
    expect(exportToVue(page([], { backgroundImage: 'bg.png' }))).toContain(
      'background-image: url(bg.png);',
    );
  });

  it('container 子节点应缩进渲染', () => {
    const sfc = exportToVue(
      page([
        comp({
          type: 'container',
          children: [comp({ type: 'text', props: { content: 'x' } })],
        }),
      ]),
    );
    expect(sfc).toContain('<div>\n      <div>x</div>\n    </div>');
  });

  it('text / button / image 应生成对应标签', () => {
    const sfc = exportToVue(
      page([
        comp({ type: 'text', props: { content: 'hi' } }),
        comp({ type: 'button', props: { text: '提交' } }),
        comp({ type: 'image', props: { src: 'a.png', alt: '图' } }),
      ]),
    );
    expect(sfc).toContain('<div>hi</div>');
    expect(sfc).toContain('<button>提交</button>');
    expect(sfc).toContain('<img src="a.png" alt="图" />');
  });

  it('divider / spacer / badge 应生成对应标签', () => {
    const sfc = exportToVue(
      page([
        comp({ type: 'divider' }),
        comp({ type: 'spacer' }),
        comp({ type: 'badge', props: { text: 'A&B' } }),
      ]),
    );
    expect(sfc).toContain('<hr />');
    expect(sfc).toContain('<div></div>');
    expect(sfc).toContain('<span>A&amp;B</span>');
  });

  it('card 应根据 title/footer 可选渲染', () => {
    const withBoth = exportToVue(
      page([comp({ type: 'card', props: { title: '标题', footer: '底部' } })]),
    );
    expect(withBoth).toContain('标题');
    expect(withBoth).toContain('底部');

    const bare = exportToVue(page([comp({ type: 'card' })]));
    expect(bare).not.toContain('border-bottom');
    expect(bare).not.toContain('border-top');
  });

  it('input 应仅在提供 label 时渲染 label', () => {
    const withLabel = exportToVue(
      page([
        comp({
          type: 'input',
          props: { label: '姓名', inputType: 'email', placeholder: '请输入' },
        }),
      ]),
    );
    expect(withLabel).toContain('>姓名</label>');
    expect(withLabel).toContain('<input type="email" placeholder="请输入" />');

    const noLabel = exportToVue(page([comp({ type: 'input' })]));
    expect(noLabel).not.toContain('<label');
    expect(noLabel).toContain('<input type="text" placeholder="" />');
  });

  it('未知组件类型应输出占位说明', () => {
    expect(exportToVue(page([comp({ type: 'mystery' })]))).toContain('Unknown component: mystery');
  });
});
