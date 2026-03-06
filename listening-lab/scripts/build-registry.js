#!/usr/bin/env node
/**
 * build-registry.js
 * src/data/ 配下のJSONファイルを自動スキャンして registry.js を生成する
 *
 * 使い方:
 *   node scripts/build-registry.js
 *   node scripts/build-registry.js --dry-run
 */

import { readdirSync, readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, join, relative, basename } from "path";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");

const DATA_DIR = resolve("src/data");
const OUTPUT = join(DATA_DIR, "registry.js");

// --- Scan all exam JSON files ---
function scanExamFiles() {
  const files = [];
  const examTypes = ["kyotsu", "eiken", "toeic", "nyushi", "custom"];

  for (const type of examTypes) {
    const dir = join(DATA_DIR, type);
    if (!existsSync(dir)) continue;

    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith(".json")) continue;

      const fullPath = join(dir, entry.name);
      try {
        const data = JSON.parse(readFileSync(fullPath, "utf-8"));
        if (!data.examType || !data.id || !data.sections) {
          console.warn(`⚠️  スキップ: ${entry.name} — examType/id/sections が不足`);
          continue;
        }

        // Generate import variable name from examId
        const varName = data.id
          .replace(/[^a-zA-Z0-9]/g, "_")
          .replace(/^_+|_+$/g, "")
          .replace(/_+/g, "_");

        files.push({
          type,
          filename: entry.name,
          importPath: `./${type}/${entry.name}`,
          varName,
          examId: data.id,
          title: data.meta?.title || data.id,
          subtitle: data.meta?.subtitle || "",
          sectionCount: data.sections.length,
          questionCount: data.sections.reduce(
            (sum, s) => sum + (s.questions?.length || 0),
            0
          ),
        });
      } catch (e) {
        console.warn(`⚠️  スキップ: ${entry.name} — JSON解析エラー: ${e.message}`);
      }
    }
  }

  return files;
}

const files = scanExamFiles();

if (files.length === 0) {
  console.log("試験データが見つかりません");
  process.exit(0);
}

// --- Generate registry.js ---
const imports = files
  .map((f) => `import ${f.varName} from "${f.importPath}";`)
  .join("\n");

const examSetsArray = files.map((f) => f.varName).join(", ");

const registryCode = `// 試験データレジストリ（自動生成）
// このファイルは scripts/build-registry.js で生成されます
// 手動編集は上書きされるので注意してください
//
// 最終更新: ${new Date().toISOString()}
// 登録数: ${files.length} 試験セット

${imports}

const examSets = [${examSetsArray}];

function buildRegistry() {
  const registry = {};
  for (const examSet of examSets) {
    const type = examSet.examType;
    if (!registry[type]) {
      registry[type] = [];
    }
    registry[type].push(examSet);
  }
  return registry;
}

const registry = buildRegistry();

/**
 * 指定した試験種別の全試験セットを返す
 */
export function getExamSets(examType) {
  return registry[examType] || [];
}

/**
 * examId で特定の試験セットを返す
 */
export function getExamSet(examId) {
  return examSets.find((s) => s.id === examId) || null;
}

/**
 * examId と sectionId で特定のセクションを返す
 */
export function getSection(examId, sectionId) {
  const examSet = getExamSet(examId);
  if (!examSet || !examSet.sections) return null;
  return examSet.sections.find((s) => s.id === sectionId) || null;
}

/**
 * 指定した試験種別の試験セット件数を返す
 */
export function getExamCount(examType) {
  return (registry[examType] || []).length;
}

export default registry;
`;

// --- Output ---
if (dryRun) {
  console.log("=== DRY RUN ===\n");
  console.log(`検出した試験データ: ${files.length} 件\n`);
  for (const f of files) {
    console.log(
      `  ${f.examId} — ${f.title} ${f.subtitle} (${f.sectionCount}セクション, ${f.questionCount}問)`
    );
  }
  console.log(`\n生成されるインポート:\n`);
  console.log(imports);
  process.exit(0);
}

writeFileSync(OUTPUT, registryCode, "utf-8");

console.log(`✅ registry.js を更新しました: ${OUTPUT}`);
console.log(`   登録数: ${files.length} 試験セット\n`);
for (const f of files) {
  console.log(
    `   📄 ${f.examId} — ${f.title} ${f.subtitle} (${f.sectionCount}セクション, ${f.questionCount}問)`
  );
}
`;

