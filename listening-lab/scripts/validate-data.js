#!/usr/bin/env node
/**
 * validate-data.js
 * src/data/ 配下の試験データJSONを検証する（CI でも実行される）
 *
 * エラー（終了コード 1）:
 *   - JSON 構文エラー、必須項目の欠落、ID の重複
 *   - 正解（answer）が選択肢のラベルに存在しない
 *   - 参照している音声ファイルが public/ に存在しない
 * 警告（終了コードには影響しない）:
 *   - script / explanation / scriptJa の欠落
 *   - 英文スクリプトと和訳の段落数の不一致
 *
 * 使い方:
 *   npm run validate
 *   npm run validate -- --quiet   # 警告の詳細を省略
 */

import { readdirSync, readFileSync, existsSync, statSync } from "fs";
import { join, relative, resolve } from "path";

const ROOT = resolve(".");
const DATA_DIR = join(ROOT, "src", "data");
const PUBLIC_DIR = join(ROOT, "public");
const EXAM_TYPES = ["kyotsu", "eiken", "toeic", "nyushi", "custom"];
const quiet = process.argv.includes("--quiet");

const errors = [];
const warnings = [];
const examIds = new Map();

const nonEmptyLines = (s) => (s || "").split("\n").filter((l) => l.trim());

function checkAudio(where, path) {
  if (!path) return;
  if (/^https?:\/\//.test(path)) return;
  if (path.startsWith("/")) {
    errors.push(`${where}: 音声パスは先頭に / を付けない相対パスにしてください（${path}）`);
    return;
  }
  const full = join(PUBLIC_DIR, path);
  if (!existsSync(full) || !statSync(full).isFile()) {
    errors.push(`${where}: 音声ファイルが見つかりません: public/${path}`);
  }
}

function validateExam(file, data) {
  const rel = relative(ROOT, file);
  const dirType = file.split(/[\\/]/).at(-2);

  if (!EXAM_TYPES.includes(data.examType)) {
    errors.push(`${rel}: examType "${data.examType}" は ${EXAM_TYPES.join(" / ")} のいずれかにしてください`);
  } else if (data.examType !== dirType) {
    errors.push(`${rel}: examType "${data.examType}" とディレクトリ "${dirType}" が一致しません`);
  }
  if (!data.id) errors.push(`${rel}: id がありません`);
  else if (examIds.has(data.id)) errors.push(`${rel}: id "${data.id}" が ${examIds.get(data.id)} と重複しています`);
  else examIds.set(data.id, rel);

  if (!data.meta?.title) errors.push(`${rel}: meta.title がありません`);
  if (!Array.isArray(data.sections) || data.sections.length === 0) {
    errors.push(`${rel}: sections が空です`);
    return;
  }

  const draft = data.meta?.status === "draft";
  const missing = { script: [], explanation: [], scriptJa: [] };
  const sectionIds = new Set();

  for (const section of data.sections) {
    const sw = `${rel} [${section.id}]`;
    if (!section.id) errors.push(`${rel}: id のないセクションがあります`);
    if (section.id === "all") errors.push(`${sw}: セクションID "all" は全問通し演習用に予約されています`);
    if (sectionIds.has(section.id)) errors.push(`${sw}: セクションIDが重複しています`);
    sectionIds.add(section.id);
    if (!section.title) errors.push(`${sw}: title がありません`);
    checkAudio(sw, section.instructionAudio);
    checkAudio(sw, section.audioFile || section.audio);

    const questionIds = new Set();
    for (const q of section.questions || []) {
      const qw = `${sw} ${q.id ?? "(id なし)"}`;
      if (!q.id) errors.push(`${qw}: id がありません`);
      if (questionIds.has(q.id)) errors.push(`${qw}: 問題IDが重複しています`);
      questionIds.add(q.id);
      if (typeof q.number !== "number") errors.push(`${qw}: number（問題番号）は数値にしてください`);

      checkAudio(qw, q.audio);
      checkAudio(qw, q.passageAudio);

      if (!Array.isArray(q.choices) || q.choices.length < 2) {
        errors.push(`${qw}: choices が2つ以上必要です`);
        continue;
      }
      const labels = q.choices.map((c) => c.label);
      if (new Set(labels).size !== labels.length) errors.push(`${qw}: 選択肢ラベルが重複しています`);
      if (q.choices.some((c) => !c.label || typeof c.text !== "string")) {
        errors.push(`${qw}: 選択肢は { "label": "1", "text": "..." } の形式にしてください`);
      }
      if (!labels.includes(q.answer)) {
        errors.push(`${qw}: answer "${q.answer}" が選択肢ラベル（${labels.join(",")}）にありません`);
      }

      if (draft) continue;
      if (q.choices.some((c) => !c.text.trim() || /Listen to the audio/i.test(c.text))) {
        errors.push(`${qw}: 選択肢が未入力です（下書きなら meta.status を "draft" に）`);
      }
      if (!q.script) missing.script.push(q.id);
      if (!q.explanation) missing.explanation.push(q.id);
      if (q.script && !q.scriptJa) missing.scriptJa.push(q.id);
      if (q.script && q.scriptJa && nonEmptyLines(q.script).length !== nonEmptyLines(q.scriptJa).length) {
        warnings.push(`${qw}: 英文スクリプトと和訳の段落数が異なります（対訳表示がずれます）`);
      }
    }
  }

  for (const [field, ids] of Object.entries(missing)) {
    if (ids.length > 0) warnings.push(`${rel}: ${field} 未入力 ${ids.length}問${quiet ? "" : `（${ids.join(", ")}）`}`);
  }
  return draft;
}

// --- main ---
let fileCount = 0;
let draftCount = 0;
for (const type of readdirSync(DATA_DIR, { withFileTypes: true })) {
  if (!type.isDirectory()) continue;
  for (const entry of readdirSync(join(DATA_DIR, type.name), { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    const file = join(DATA_DIR, type.name, entry.name);
    fileCount++;
    let data;
    try {
      data = JSON.parse(readFileSync(file, "utf-8"));
    } catch (e) {
      errors.push(`${relative(ROOT, file)}: JSON 構文エラー: ${e.message}`);
      continue;
    }
    if (validateExam(file, data)) draftCount++;
  }
}

console.log(`📄 試験データ ${fileCount} 件を検証しました（うち下書き ${draftCount} 件）`);
if (warnings.length > 0) {
  console.log(`\n⚠️  警告 ${warnings.length} 件`);
  for (const w of warnings) console.log(`  - ${w}`);
}
if (errors.length > 0) {
  console.log(`\n❌ エラー ${errors.length} 件`);
  for (const e of errors) console.log(`  - ${e}`);
  process.exit(1);
}
console.log("\n✅ エラーはありません");
