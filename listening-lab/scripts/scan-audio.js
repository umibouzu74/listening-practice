#!/usr/bin/env node
/**
 * scan-audio.js
 * 音声ファイルを自動検出し、JSONデータとの整合性をチェックする
 *
 * 使い方:
 *   node scripts/scan-audio.js                  # 全体チェック
 *   node scripts/scan-audio.js --fix            # JSONのaudioパスを実ファイルに合わせて修正
 *   node scripts/scan-audio.js --exam eiken-pre1-2024-1  # 特定の試験だけチェック
 */

import { readdirSync, readFileSync, writeFileSync, statSync, existsSync } from "fs";
import { resolve, join, relative, basename } from "path";
import { globSync } from "fs";

const args = process.argv.slice(2);
const doFix = args.includes("--fix");
const targetExam = args.includes("--exam")
  ? args[args.indexOf("--exam") + 1]
  : null;

const ROOT = resolve(".");
const AUDIO_DIR = join(ROOT, "public", "audio");
const DATA_DIR = join(ROOT, "src", "data");

// --- 1. Scan all audio files ---
function scanAudioFiles(dir) {
  const files = [];
  if (!existsSync(dir)) return files;

  function walk(d) {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const full = join(d, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith(".mp3") || entry.name.endsWith(".wav") || entry.name.endsWith(".ogg")) {
        // Path relative to public/ (how Vite serves it)
        const rel = relative(join(ROOT, "public"), full);
        files.push({ absolute: full, relative: rel, filename: entry.name });
      }
    }
  }
  walk(dir);
  return files;
}

// --- 2. Scan all JSON data files ---
function scanJsonFiles() {
  const files = [];
  if (!existsSync(DATA_DIR)) return files;

  function walk(d) {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const full = join(d, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith(".json")) {
        try {
          const data = JSON.parse(readFileSync(full, "utf-8"));
          if (data.examType && data.id && data.sections) {
            files.push({ path: full, data });
          }
        } catch {}
      }
    }
  }
  walk(DATA_DIR);
  return files;
}

// --- 3. Extract all audio references from a JSON exam ---
function getAudioRefs(exam) {
  const refs = [];
  for (const section of exam.sections || []) {
    if (section.audioFile) refs.push({ field: `${section.id}.audioFile`, path: section.audioFile });
    if (section.instructionAudio) refs.push({ field: `${section.id}.instructionAudio`, path: section.instructionAudio });
    for (const q of section.questions || []) {
      if (q.audio) refs.push({ field: `${section.id}.q${q.number}.audio`, path: q.audio });
      if (q.passageAudio) refs.push({ field: `${section.id}.q${q.number}.passageAudio`, path: q.passageAudio });
    }
  }
  return refs;
}

// --- Main ---
console.log("🔍 Listening Lab — Audio Scan\n");

const audioFiles = scanAudioFiles(AUDIO_DIR);
const audioByRelative = new Map(audioFiles.map((f) => [f.relative, f]));
const audioByFilename = new Map();
for (const f of audioFiles) {
  if (!audioByFilename.has(f.filename)) audioByFilename.set(f.filename, []);
  audioByFilename.get(f.filename).push(f);
}

console.log(`📁 音声ファイル: ${audioFiles.length} 件検出\n`);

// Group by directory
const audioDirs = {};
for (const f of audioFiles) {
  const dir = f.relative.split("/").slice(0, -1).join("/");
  if (!audioDirs[dir]) audioDirs[dir] = 0;
  audioDirs[dir]++;
}
for (const [dir, count] of Object.entries(audioDirs).sort()) {
  console.log(`   ${dir}/ — ${count} ファイル`);
}
console.log();

const jsonFiles = scanJsonFiles();
console.log(`📄 試験データ: ${jsonFiles.length} 件\n`);

let totalRefs = 0;
let totalMissing = 0;
let totalFixed = 0;
let totalOrphan = 0;

const usedAudioPaths = new Set();

for (const { path: jsonPath, data: exam } of jsonFiles) {
  if (targetExam && exam.id !== targetExam) continue;

  const refs = getAudioRefs(exam);
  let missing = 0;
  let fixed = 0;
  let modified = false;

  for (const ref of refs) {
    totalRefs++;
    usedAudioPaths.add(ref.path);

    if (audioByRelative.has(ref.path)) {
      // OK — file exists at expected path
      continue;
    }

    // Try to find by filename
    const fname = basename(ref.path);
    const candidates = audioByFilename.get(fname) || [];

    if (candidates.length === 1 && doFix) {
      // Auto-fix: update path in JSON
      const newPath = candidates[0].relative;
      // Deep replace in the JSON object
      const jsonStr = readFileSync(jsonPath, "utf-8");
      const updated = jsonStr.replaceAll(ref.path, newPath);
      writeFileSync(jsonPath, updated, "utf-8");
      usedAudioPaths.add(newPath);
      fixed++;
      totalFixed++;
      modified = true;
    } else if (candidates.length > 0) {
      missing++;
      totalMissing++;
      console.log(`   ⚠️  ${ref.field}: 「${ref.path}」が見つかりません`);
      console.log(`       候補: ${candidates.map((c) => c.relative).join(", ")}`);
    } else {
      missing++;
      totalMissing++;
      console.log(`   ❌ ${ref.field}: 「${ref.path}」— 音声ファイルなし`);
    }
  }

  const status = missing > 0 ? "⚠️ " : "✅";
  const fixNote = fixed > 0 ? ` (${fixed}件修正)` : "";
  console.log(
    `${status} ${exam.id}: ${refs.length} 参照, ${missing} 欠落${fixNote}`
  );
}

// --- Orphan audio files (in audio dir but not referenced) ---
console.log(`\n--- 未参照の音声ファイル ---`);
const orphans = audioFiles.filter((f) => !usedAudioPaths.has(f.relative));
if (orphans.length === 0) {
  console.log("なし（全ファイルがJSONから参照されています）");
} else {
  for (const f of orphans) {
    console.log(`   🔇 ${f.relative}`);
    totalOrphan++;
  }
}

// --- Summary ---
console.log(`\n========== サマリー ==========`);
console.log(`音声ファイル総数:   ${audioFiles.length}`);
console.log(`JSON参照総数:       ${totalRefs}`);
console.log(`欠落:               ${totalMissing}`);
if (doFix) console.log(`自動修正:           ${totalFixed}`);
console.log(`未参照の音声:       ${totalOrphan}`);

if (totalMissing > 0 && !doFix) {
  console.log(`\n💡 --fix オプションで自動修正を試みることができます`);
}
