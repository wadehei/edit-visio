// 根 package.json 声明了 "type": "module"，因此这里必须使用 ESM 导出
export default {
  // 覆盖 monorepo 内所有源码：原 glob `src/**/*` 在仓库根目录下匹配 0 个文件
  '{apps,packages}/**/*.{ts,tsx,vue}': ['eslint --fix', 'prettier --write'],
  '**/*.{json,md}': ['prettier --write'],
};
