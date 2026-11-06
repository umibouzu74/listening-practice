#!/usr/bin/env node
/**
 * validate-data.js
 * src/data/ 配下の試験データJSONを検証する（CI でも実行される）
 *
 * エラー（終了コード 1）:
 *   - JSON 構文エラー、必須項目の欠落、ID の重複
 *   - 正解（answer）が選択肢のラベルに存在しない
 *   - 参照している音声・画像ファイルが public/ に存在しない
 *   - 面接形式（"format": "interview"）: カード画像・指示文・最初の一文の欠落、
 *     ナレーションと No.1〜4 がそろっていない、質問文（prompt）の欠落
 * 警告（終了コードには影響しない）:
 *   - script / explanation / scriptJa の欠落
 *   - 英文スクリプトと和訳の段落数の不一致
 *   - 面接形式: modelAnswer / modelAnswerJa / explanation の欠落、面接官の音声（audio / cues）が一部だけ
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
// format を省略したデータはリスニング（"listening"）として扱う
const FORMATS = ["listening", "interview"];
// 面接形式で必要な質問（ナレーション + No.1〜4）
const INTERVIEW_QA_NUMBERS = [1, 2, 3, 4];
// 面接形式の section.cues に書ける、面接官の決まり文句の音声（examConfig.js の phrases に対応）
const INTERVIEW_CUE_KEYS = ["prep", "narrationStart", "qaIntro", "turnOver"];
const quiet = process.argv.includes("--quiet");

const errors = [];
const warnings = [];
const examIds = new Map();

const nonEmptyLines = (s) => (s || "").split("\n").filter((l) => l.trim());

function checkPublicFile(where, path, kind) {
  if (!path) return;
  if (/^https?:\/\//.test(path)) return;
  if (path.startsWith("/")) {
    errors.push(`${where}: ${kind}パスは先頭に / を付けない相対パスにしてください（${path}）`);
    return;
  }
  const full = join(PUBLIC_DIR, path);
  if (!existsSync(full) || !statSync(full).isFile()) {
    errors.push(`${where}: ${kind}ファイルが見つかりません: public/${path}`);
  }
}

const checkAudio = (where, path) => checkPublicFile(where, path, "音声");
const checkImage = (where, path) => checkPublicFile(where, path, "画像");

/**
 * 面接形式（英検二次試験）のセクション（問題カード1枚）を検証する。
 * 選択肢・正解はないので、カードと質問がそろっているかを見る。
 */
function validateInterviewSection(sw, section, draft, missing) {
  const card = section.card;
  if (!card || typeof card !== "object") {
    errors.push(`${sw}: card（問題カード）がありません`);
  } else {
    if (!card.image) errors.push(`${sw}: card.image（カード画像）がありません`);
    checkImage(sw, card.image);
    if (!card.instruction?.trim()) errors.push(`${sw}: card.instruction（カードの指示文）がありません`);
    if (!card.firstSentence?.trim()) errors.push(`${sw}: card.firstSentence（ナレーションの最初の一文）がありません`);
  }

  const questions = section.questions || [];

  // 面接官の音声は、質問（audio）と決まり文句（cues）がそろっているか、どちらもないかのどちらか
  const cues = section.cues;
  if (cues !== undefined) {
    if (!cues || typeof cues !== "object") {
      errors.push(`${sw}: cues は { "prep": "audio/…" } の形式にしてください`);
    } else {
      for (const [key, path] of Object.entries(cues)) {
        if (!INTERVIEW_CUE_KEYS.includes(key)) {
          errors.push(`${sw}: cues のキー "${key}" は ${INTERVIEW_CUE_KEYS.join(" / ")} のいずれかにしてください`);
        }
        checkAudio(`${sw} cues.${key}`, path);
      }
    }
  }
  const qasWithAudio = questions.filter((q) => q.type === "qa" && q.audio).length;
  const qaCount = questions.filter((q) => q.type === "qa").length;
  const cueCount = INTERVIEW_CUE_KEYS.filter((key) => cues?.[key]).length;
  if ((qasWithAudio > 0 || cueCount > 0) && (qasWithAudio !== qaCount || cueCount !== INTERVIEW_CUE_KEYS.length)) {
    warnings.push(`${sw}: 面接官の音声が一部だけです（質問 ${qasWithAudio}/${qaCount}、決まり文句 ${cueCount}/${INTERVIEW_CUE_KEYS.length}）。足りない分は読み上げになります`);
  }

  const questionIds = new Set();
  const narrations = questions.filter((q) => q.type === "narration");
  if (narrations.length !== 1) {
    errors.push(`${sw}: type "narration" の問題がちょうど1つ必要です（現在 ${narrations.length} 個）`);
  }
  const qaNumbers = [];

  for (const q of questions) {
    const qw = `${sw} ${q.id ?? "(id なし)"}`;
    if (!q.id) errors.push(`${qw}: id がありません`);
    if (questionIds.has(q.id)) errors.push(`${qw}: 問題IDが重複しています`);
    questionIds.add(q.id);
    checkAudio(qw, q.audio);

    if (q.type === "qa") {
      if (typeof q.number !== "number") errors.push(`${qw}: number（No.1〜4 の番号）は数値にしてください`);
      else qaNumbers.push(q.number);
      if (!q.prompt?.trim()) errors.push(`${qw}: prompt（面接官の質問文）がありません`);
    } else if (q.type !== "narration") {
      errors.push(`${qw}: type は "narration" か "qa" にしてください（${q.type ?? "なし"}）`);
    }
    if (q.checkpoints !== undefined && (!Array.isArray(q.checkpoints) || q.checkpoints.some((c) => typeof c !== "string"))) {
      errors.push(`${qw}: checkpoints は文字列の配列にしてください`);
    }

    if (draft) continue;
    if (!q.modelAnswer) missing.modelAnswer.push(`${section.id}/${q.id}`);
    if (!q.modelAnswerJa) missing.modelAnswerJa.push(`${section.id}/${q.id}`);
    if (!q.explanation) missing.explanation.push(`${section.id}/${q.id}`);
  }

  const sorted = [...qaNumbers].sort((a, b) => a - b);
  if (sorted.join(",") !== INTERVIEW_QA_NUMBERS.join(",")) {
    errors.push(`${sw}: type "qa" の問題は No.${INTERVIEW_QA_NUMBERS.join("・")} が1つずつ必要です（現在: ${sorted.join(",") || "なし"}）`);
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
  if (data.format !== undefined && !FORMATS.includes(data.format)) {
    errors.push(`${rel}: format "${data.format}" は ${FORMATS.join(" / ")} のいずれかにしてください（省略時は listening）`);
  }
  if (!Array.isArray(data.sections) || data.sections.length === 0) {
    errors.push(`${rel}: sections が空です`);
    return;
  }

  const draft = data.meta?.status === "draft";
  const interview = data.format === "interview";
  const missing = interview
    ? { modelAnswer: [], modelAnswerJa: [], explanation: [] }
    : { script: [], explanation: [], scriptJa: [] };
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

    if (interview) {
      validateInterviewSection(sw, section, draft, missing);
      continue;
    }

    const questionIds = new Set();
    for (const q of section.questions || []) {
      const qw = `${sw} ${q.id ?? "(id なし)"}`;
      if (!q.id) errors.push(`${qw}: id がありません`);
      if (questionIds.has(q.id)) errors.push(`${qw}: 問題IDが重複しています`);
      questionIds.add(q.id);
      if (typeof q.number !== "number") errors.push(`${qw}: number（問題番号）は数値にしてください`);

      checkAudio(qw, q.audio);
      checkAudio(qw, q.passageAudio);
      checkImage(qw, q.image);

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
