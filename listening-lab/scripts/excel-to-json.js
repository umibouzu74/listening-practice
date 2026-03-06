#!/usr/bin/env node
/**
 * excel-to-json.js
 * Excelテンプレートから統一JSONフォーマットの問題データを生成する
 *
 * 使い方:
 *   node scripts/excel-to-json.js path/to/template.xlsx
 *   node scripts/excel-to-json.js path/to/template.xlsx --out src/data/eiken/
 *   node scripts/excel-to-json.js path/to/template.xlsx --dry-run
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { resolve, dirname, join } from "path";

// --- Minimal XLSX parser (no npm dependency needed) ---
// Uses the SheetJS-compatible approach of reading the xlsx as a zip
// For simplicity, we use a lightweight approach with the 'xlsx' npm package
// Install: npm install xlsx (in scripts context, not app dependency)

let XLSX;
try {
  XLSX = await import("xlsx");
} catch {
  console.error(
    "xlsx パッケージが必要です。以下を実行してください:\n  npm install --save-dev xlsx"
  );
  process.exit(1);
}

// --- CLI args ---
const args = process.argv.slice(2);
const inputFile = args.find((a) => !a.startsWith("--"));
const outDir = args.includes("--out")
  ? args[args.indexOf("--out") + 1]
  : null;
const dryRun = args.includes("--dry-run");

if (!inputFile) {
  console.error("使い方: node scripts/excel-to-json.js <excel-file> [--out dir] [--dry-run]");
  process.exit(1);
}

// --- Read Excel ---
const wb = XLSX.readFile(resolve(inputFile));

function getSheet(name) {
  const ws = wb.Sheets[name];
  if (!ws) {
    console.error(`シート「${name}」が見つかりません`);
    process.exit(1);
  }
  // Skip row 2 (description row) by reading all then filtering
  const raw = XLSX.utils.sheet_to_json(ws, { defval: "" });
  return raw;
}

function getMetaSheet() {
  const ws = wb.Sheets["meta"];
  if (!ws) {
    console.error('シート「meta」が見つかりません');
    process.exit(1);
  }
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  const meta = {};
  for (const row of rows.slice(1)) {
    // row[0] = field name, row[1] = value
    if (row[0] && String(row[0]).trim()) {
      meta[String(row[0]).trim()] = row[1] !== undefined ? row[1] : "";
    }
  }
  return meta;
}

// --- Parse meta ---
const metaRaw = getMetaSheet();

const examType = String(metaRaw.examType || "").trim();
const examId =
  String(metaRaw.examId || "").trim() ||
  `${examType}-${metaRaw.grade || ""}${metaRaw.grade ? "-" : ""}${metaRaw.session || metaRaw.year || "unknown"}`;

if (!examType) {
  console.error("examType が未入力です（meta シートの examType 行）");
  process.exit(1);
}

// Determine audio base path
let audioBase;
const audioDirVal = String(metaRaw.audioDir || "auto").trim();
if (audioDirVal === "auto" || audioDirVal === "") {
  audioBase = `audio/${examType}/${examId}`;
} else {
  audioBase = audioDirVal.replace(/\/$/, "");
}

const meta = {
  title: String(metaRaw.title || ""),
  subtitle: String(metaRaw.subtitle || "") || undefined,
  year: metaRaw.year ? Number(metaRaw.year) : undefined,
  grade: String(metaRaw.grade || "") || undefined,
  session: String(metaRaw.session || "") || undefined,
  prefecture: String(metaRaw.prefecture || "") || undefined,
  icon: String(metaRaw.icon || "") || undefined,
  totalTime: metaRaw.totalTime ? Number(metaRaw.totalTime) : undefined,
};

// Clean undefined values
Object.keys(meta).forEach((k) => {
  if (meta[k] === undefined || meta[k] === "") delete meta[k];
});

// --- Parse sections ---
const sectionsRaw = getSheet("sections").filter(
  (r) => r.sectionId && !String(r.sectionId).startsWith("セクション")
);

const sectionsMap = new Map();
for (const row of sectionsRaw) {
  const id = String(row.sectionId).trim();
  if (!id) continue;
  sectionsMap.set(id, {
    id,
    title: String(row.title || ""),
    description: String(row.description || "") || undefined,
    playCount: String(row.playCount || "") || undefined,
    instructionAudio: String(row.instructionAudio || "") || undefined,
    subtitle: String(row.subtitle || "") || undefined,
    questions: [],
  });
}

// --- Parse questions ---
const questionsRaw = getSheet("questions").filter(
  (r) => r.sectionId && r.number && !String(r.sectionId).startsWith("所属")
);

for (const row of questionsRaw) {
  const secId = String(row.sectionId).trim();
  if (!sectionsMap.has(secId)) {
    console.warn(
      `警告: 問題 ${row.number} の sectionId「${secId}」は sections シートに定義されていません。自動作成します。`
    );
    sectionsMap.set(secId, {
      id: secId,
      title: secId,
      questions: [],
    });
  }

  const section = sectionsMap.get(secId);

  // Build audio path
  let audioPath = String(row.audio || "").trim();
  if (audioPath && !audioPath.includes("/")) {
    // Just a filename → prepend audioBase
    audioPath = `${audioBase}/${audioPath}`;
  }

  let passageAudioPath = String(row.passageAudio || "").trim();
  if (passageAudioPath && !passageAudioPath.includes("/")) {
    passageAudioPath = `${audioBase}/${passageAudioPath}`;
  }

  // Build choices
  const choices = [];
  for (let i = 1; i <= 4; i++) {
    const text = String(row[`choice${i}`] || "").trim();
    if (!text) continue;
    const label =
      String(row[`choiceLabel${i}`] || "").trim() || String(i);
    choices.push({ label, text });
  }

  const question = {
    id: `q${row.number}`,
    number: Number(row.number),
    audio: audioPath || undefined,
    passageAudio: passageAudioPath || undefined,
    passageLabel: String(row.passageLabel || "").trim() || undefined,
    prompt: String(row.prompt || "").trim() || undefined,
    promptJa: String(row.promptJa || "").trim() || undefined,
    choices,
    answer: String(row.answer || "").trim(),
    explanation: String(row.explanation || "").trim() || undefined,
    script: String(row.script || "").trim() || undefined,
  };

  // Clean undefined
  Object.keys(question).forEach((k) => {
    if (question[k] === undefined || question[k] === "") delete question[k];
  });

  // Ensure answer exists
  if (!question.answer) {
    console.warn(`警告: 問題 ${row.number} に正解(answer)が未入力です`);
  }

  section.questions.push(question);
}

// --- Build output ---
const sections = [];
for (const [, sec] of sectionsMap) {
  const out = { ...sec };
  Object.keys(out).forEach((k) => {
    if (out[k] === undefined || out[k] === "") delete out[k];
  });
  if (out.questions.length > 0) {
    sections.push(out);
  }
}

const output = {
  examType,
  id: examId,
  meta,
  sections,
};

const jsonStr = JSON.stringify(output, null, 2);

// --- Output ---
if (dryRun) {
  console.log("=== DRY RUN: 以下の内容が生成されます ===\n");
  console.log(`examType: ${examType}`);
  console.log(`examId:   ${examId}`);
  console.log(`audio:    ${audioBase}/`);
  console.log(`sections: ${sections.length}`);
  console.log(
    `questions: ${sections.reduce((s, sec) => s + sec.questions.length, 0)}`
  );
  console.log(`\n${jsonStr.substring(0, 500)}...`);
  process.exit(0);
}

// Determine output path
let outputPath;
if (outDir) {
  mkdirSync(outDir, { recursive: true });
  outputPath = join(outDir, `${examId.replace(`${examType}-`, "")}.json`);
} else {
  // Default: src/data/{examType}/
  const defaultDir = resolve(`src/data/${examType}`);
  mkdirSync(defaultDir, { recursive: true });
  const fileName = examId.replace(`${examType}-`, "");
  outputPath = join(defaultDir, `${fileName}.json`);
}

writeFileSync(outputPath, jsonStr, "utf-8");
console.log(`✅ JSON生成完了: ${outputPath}`);
console.log(`   examType:  ${examType}`);
console.log(`   examId:    ${examId}`);
console.log(`   sections:  ${sections.length}`);
console.log(
  `   questions: ${sections.reduce((s, sec) => s + sec.questions.length, 0)}`
);
console.log(`   audioBase: ${audioBase}/`);
console.log(`\n次のステップ:`);
console.log(`  1. 音声ファイルを public/${audioBase}/ に配置`);
console.log(`  2. node scripts/build-registry.js を実行して registry.js を更新`);
