// 从 Stryker 原始报告（coverage/mutation/mutation.json）提炼出一份「确定性、可 review」的变异基线。
//
// 为什么需要它：coverage/ 是构建产物（已被 .gitignore 忽略），而完整 Stryker 报告 400KB+、
// 且含 execution duration 等易变字段，无法字节级复现，不适合入库做证据。
// 因此这里只保留与质量结论相关、且与运行机器/耗时无关的字段：
//   - 每个被 mutate 文件的 killed / survived / noCoverage / ignored / timeout / 错误计数
//   - 被忽略（Ignored）的变异体清单及其理由——这是唯一需要人工复核的部分
//   - 产生该结果的 stryker 配置与工具版本
// 同一份源码 + 同一份测试，重复运行应产出字节级一致的基线；若基线发生变化，
// 说明变异分或忽略规则被动过，可在 code review 中被显式发现。
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const reportPath = path.join(appRoot, 'coverage', 'mutation', 'mutation.json');
const strykerConfigPath = path.join(appRoot, 'stryker.config.json');
const pkgPath = path.join(appRoot, 'package.json');
const outPath = path.join(appRoot, 'mutation-baseline.json');

if (!fs.existsSync(reportPath)) {
  console.error(
    `未找到 Stryker 原始报告：${path.relative(appRoot, reportPath)}\n请先运行 \`pnpm test:mutation\`。`,
  );
  process.exit(1);
}

const require = createRequire(import.meta.url);
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const strykerConfig = JSON.parse(fs.readFileSync(strykerConfigPath, 'utf8'));
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

/** 已安装版本；解析 package.json 失败时回退到声明的依赖范围 */
const resolvedVersion = (name) => {
  try {
    return JSON.parse(fs.readFileSync(require.resolve(`${name}/package.json`), 'utf8')).version;
  } catch {
    return pkg.devDependencies?.[name] ?? pkg.dependencies?.[name] ?? 'unknown';
  }
};

/** Stryker mutant.status -> 基线字段名 */
const STATUS_KEYS = {
  Killed: 'killed',
  Survived: 'survived',
  NoCoverage: 'noCoverage',
  Ignored: 'ignored',
  Timeout: 'timeout',
  RuntimeError: 'runtimeError',
  CompileError: 'compileError',
};

const newCounts = () => ({
  killed: 0,
  survived: 0,
  noCoverage: 0,
  ignored: 0,
  timeout: 0,
  runtimeError: 0,
  compileError: 0,
  other: 0,
});

const totals = newCounts();
const files = {};
const ignoredMutants = [];

for (const file of Object.keys(report.files).sort()) {
  const counts = newCounts();
  for (const mutant of report.files[file].mutants) {
    const key = STATUS_KEYS[mutant.status] ?? 'other';
    counts[key] += 1;
    totals[key] += 1;
    if (mutant.status === 'Ignored') {
      const { start } = mutant.location;
      ignoredMutants.push({
        file,
        mutator: mutant.mutatorName,
        location: `${start.line}:${start.column}`,
        replacement: mutant.replacement,
        reason: mutant.statusReason ?? '',
      });
    }
  }
  files[file] = counts;
}

ignoredMutants.sort(
  (a, b) =>
    a.file.localeCompare(b.file) ||
    Number(a.location.split(':')[0]) - Number(b.location.split(':')[0]) ||
    a.mutator.localeCompare(b.mutator),
);

// 与 Stryker / mutation-testing-metrics 一致的评分口径：
// 分母排除 Ignored 与 CompileError，分子为 Killed + Timeout。
const detected = totals.killed + totals.timeout;
const undetected = totals.survived + totals.noCoverage + totals.runtimeError;
const mutationScore =
  detected + undetected === 0 ? 100 : (detected / (detected + undetected)) * 100;

const baseline = {
  generatedBy: 'scripts/mutation-baseline.mjs',
  tooling: {
    stryker: resolvedVersion('@stryker-mutator/core'),
    vitest: resolvedVersion('vitest'),
    'fast-check': resolvedVersion('fast-check'),
  },
  config: {
    mutate: strykerConfig.mutate,
    coverageAnalysis: strykerConfig.coverageAnalysis,
    // ignoreStatic：跳过「模块初始化期即执行」的变异体（多为 animationPresets / devices /
    // textTemplates 等纯数据表），它们需为每个变异体重跑整套用例、占单次运行 ~84% 耗时，
    // 且产生的多为等价变异。真正承载分支逻辑的变异体仍全部计入。
    ignoreStatic: strykerConfig.ignoreStatic ?? false,
    thresholds: strykerConfig.thresholds,
  },
  totals: {
    mutants: Object.values(totals).reduce((sum, n) => sum + n, 0),
    ...totals,
    mutationScore: Number(mutationScore.toFixed(2)),
  },
  files,
  ignored: ignoredMutants,
};

fs.writeFileSync(
  outPath,
  // 用仓库自身的 prettier 格式化（含 .prettierrc 的 printWidth / 缩进 / LF 换行），
  // 使生成结果与 `pnpm format:check` 一致；否则 CI 的基线漂移门禁会因纯格式差异误报。
  await formatWithRepoPrettier(JSON.stringify(baseline, null, 2)),
  'utf8',
);
console.log(
  `已生成 ${path.relative(appRoot, outPath)}：变异分 ${baseline.totals.mutationScore}% ` +
    `(killed ${totals.killed} / survived ${totals.survived} / ignored ${totals.ignored})`,
);

async function formatWithRepoPrettier(json) {
  const repoRoot = path.resolve(appRoot, '..', '..');
  const entry = createRequire(path.join(repoRoot, 'package.json')).resolve('prettier');
  const prettierModule = await import(pathToFileURL(entry).href);
  const prettier = prettierModule.default ?? prettierModule;
  return prettier.format(json, { filepath: outPath });
}
