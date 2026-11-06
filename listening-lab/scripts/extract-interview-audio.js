#!/usr/bin/env node
/**
 * extract-interview-audio.js
 * 二次試験（面接）の音源から面接官の発話だけを切り出し、public/audio/ に置いて JSON に紐づける。
 *
 * 音源フォルダ（j1q_YYYY_NN）のファイルの中身:
 *   39/45_Card_X_instruct: （回の案内）→ Here's your card. … → 無音60秒 → Please begin your narration. … → 無音120秒
 *   40/46_Card_X_model:    市販の模範ナレーション（使わない。模範解答は独自に作成する方針）
 *   41/47_Card_X_No.1:     Now, I'm going to ask you four questions. → Number 1. … → 無音30秒
 *   42/48_Card_X_No.2:     Now, Mr./Ms. … please turn over the card … → Number 2. … → 無音30秒
 *   43/49, 44/50:          Number 3. … / Number 4. … → 無音30秒
 *
 * 切り出すもの（X = a / d）: X-prep / X-narration / X-intro / X-turnover / X-q1〜q4（.mp3）
 * 再エンコードせずフレーム単位で切るので音質は変わらない。切る位置は無音区間から決める。
 *
 * 使い方（デコーダーは必要なときだけ入れる）:
 *   npm i --no-save mpg123-decoder
 *   node scripts/extract-interview-audio.js <音源フォルダ> [--session 2024-3] [--dry-run]
 */

import { mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync } from "fs";
import { join, resolve } from "path";

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? null : args[i + 1];
};
const sourceRoot = args[0];
const onlySession = flag("--session");
const dryRun = args.includes("--dry-run");
if (!sourceRoot || sourceRoot.startsWith("--")) {
  console.error("使い方: node scripts/extract-interview-audio.js <音源フォルダ> [--session 2024-3] [--dry-run]");
  process.exit(1);
}

const ROOT = resolve(".");
const DATA_DIR = join(ROOT, "src", "data", "eiken");
const PUBLIC_DIR = join(ROOT, "public");

// 切り出しの余白（秒）。前は MP3 のビットリザーバで先頭フレームが欠けても発話にかからない長さにする
const LEAD_SEC = 0.18;
const TAIL_SEC = 0.3;
// 無音の判定
const WINDOW_SEC = 0.02;
const SILENCE_DB = -45;
const MIN_GAP_SEC = 0.45;
// 区切りの判定に使う無音の長さ（秒）
const PREP_SILENCE_SEC = 30; // 黙読の60秒
const INTRO_GAP_SEC = 1.0; // 「…four questions. (Are you ready?)」と「Number 1.」の間
const TURN_OVER_GAP_SEC = 1.8; // 「…put it down.」と「Number 2.」の間

// --- 無音区間の検出 ---
let decoder = null;
async function decode(file) {
  if (!decoder) {
    let MPEGDecoder;
    try {
      ({ MPEGDecoder } = await import("mpg123-decoder"));
    } catch {
      console.error("mpg123-decoder が見つかりません。先に npm i --no-save mpg123-decoder を実行してください");
      process.exit(1);
    }
    decoder = new MPEGDecoder();
    await decoder.ready;
  } else {
    await decoder.reset();
  }
  const { channelData, sampleRate } = decoder.decode(new Uint8Array(readFileSync(file)));
  const length = channelData[0].length;
  const pcm = new Float32Array(length);
  for (const data of channelData) {
    for (let i = 0; i < length; i++) pcm[i] += data[i] / channelData.length;
  }
  return { pcm, sampleRate };
}

/** 音のある区間を [開始秒, 終了秒] の配列で返す */
function findSounds({ pcm, sampleRate }) {
  const size = Math.round(sampleRate * WINDOW_SEC);
  const threshold = 10 ** (SILENCE_DB / 20);
  const sounds = [];
  let start = -1;
  let last = -1;
  for (let k = 0; (k + 1) * size <= pcm.length; k++) {
    let sum = 0;
    for (let i = k * size; i < (k + 1) * size; i++) sum += pcm[i] * pcm[i];
    if (Math.sqrt(sum / size) <= threshold) continue;
    if (start < 0) start = k;
    else if ((k - last) * WINDOW_SEC > MIN_GAP_SEC) {
      sounds.push([start * WINDOW_SEC, (last + 1) * WINDOW_SEC]);
      start = k;
    }
    last = k;
  }
  if (start >= 0) sounds.push([start * WINDOW_SEC, (last + 1) * WINDOW_SEC]);
  return sounds;
}

/** minGap 秒以上の無音の直後にある区間の番号（最初の1つ）。なければ -1 */
function indexAfterGap(sounds, minGap) {
  for (let i = 1; i < sounds.length; i++) {
    if (sounds[i][0] - sounds[i - 1][1] >= minGap) return i;
  }
  return -1;
}

// --- MP3 のフレーム単位の切り出し ---
const BITRATES = {
  1: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
  2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
};
const SAMPLE_RATES = { 3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000] };

function parseFrames(buf) {
  const frames = [];
  let i = 0;
  if (buf.subarray(0, 3).toString("latin1") === "ID3") {
    i = 10 + ((buf[6] << 21) | (buf[7] << 14) | (buf[8] << 7) | buf[9]);
  }
  let time = 0;
  while (i + 4 <= buf.length) {
    const version = (buf[i + 1] >> 3) & 3;
    const layer = (buf[i + 1] >> 1) & 3;
    const bitrateIndex = (buf[i + 2] >> 4) & 15;
    const rateIndex = (buf[i + 2] >> 2) & 3;
    const valid =
      buf[i] === 0xff && (buf[i + 1] & 0xe0) === 0xe0 && version !== 1 && layer === 1 &&
      bitrateIndex !== 0 && bitrateIndex !== 15 && rateIndex !== 3;
    if (!valid) {
      i++;
      continue;
    }
    const mpeg1 = version === 3;
    const bitrate = BITRATES[mpeg1 ? 1 : 2][bitrateIndex] * 1000;
    const rate = SAMPLE_RATES[version][rateIndex];
    const samples = mpeg1 ? 1152 : 576;
    const size = Math.floor(((samples / 8) * bitrate) / rate) + ((buf[i + 2] >> 1) & 1);
    frames.push({ offset: i, size, time });
    time += samples / rate;
    i += size;
  }
  return frames;
}

function cut(buf, frames, from, to) {
  const picked = frames.filter((f) => f.time >= from && f.time < to);
  return Buffer.concat(picked.map((f) => buf.subarray(f.offset, f.offset + f.size)));
}

/** ファイルから音の区間 sounds[first..last] を切り出した Buffer を返す */
function clip(source, sounds, first, last) {
  const previousEnd = first > 0 ? sounds[first - 1][1] : 0;
  const from = Math.max(previousEnd, sounds[first][0] - LEAD_SEC);
  return cut(source.buf, source.frames, from, sounds[last][1] + TAIL_SEC);
}

async function load(dir, prefix) {
  const name = readdirSync(dir).find((f) => f.startsWith(prefix));
  if (!name) throw new Error(`${dir} に ${prefix}* がありません`);
  const file = join(dir, name);
  const buf = readFileSync(file);
  return { name, buf, frames: parseFrames(buf), sounds: findSounds(await decode(file)) };
}

// --- カード1枚分の切り出し ---
async function extractCard(dir, base) {
  const out = {};

  // 指示: 60秒の無音の前の2区間（Here's your card. / You have one minute …）と、無音の後ろ全部
  const instruct = await load(dir, `${base}_`);
  const afterPrep = indexAfterGap(instruct.sounds, PREP_SILENCE_SEC);
  if (afterPrep < 2) throw new Error(`${instruct.name}: 黙読の無音が見つかりません`);
  out.prep = clip(instruct, instruct.sounds, afterPrep - 2, afterPrep - 1);
  out.narration = clip(instruct, instruct.sounds, afterPrep, instruct.sounds.length - 1);

  // No.1: 「Now, … four questions.」と「Number 1. …」に分ける
  const q1 = await load(dir, `${base + 2}_`);
  const afterIntro = indexAfterGap(q1.sounds, INTRO_GAP_SEC);
  if (afterIntro < 1) throw new Error(`${q1.name}: 導入と質問の区切りが見つかりません`);
  out.intro = clip(q1, q1.sounds, 0, afterIntro - 1);
  out.q1 = clip(q1, q1.sounds, afterIntro, q1.sounds.length - 1);

  // No.2: 「please turn over …」（呼びかけの Now, Mr./Ms. は除く）と「Number 2. …」に分ける
  const q2 = await load(dir, `${base + 3}_`);
  const afterTurnOver = indexAfterGap(q2.sounds, TURN_OVER_GAP_SEC);
  if (afterTurnOver < 1) throw new Error(`${q2.name}: 指示と質問の区切りが見つかりません`);
  out.turnover = clip(q2, q2.sounds, afterTurnOver - 1, afterTurnOver - 1);
  out.q2 = clip(q2, q2.sounds, afterTurnOver, q2.sounds.length - 1);

  // No.3・4: 発話の部分だけ（後ろの無音を除く）
  for (const [key, offset] of [["q3", 4], ["q4", 5]]) {
    const q = await load(dir, `${base + offset}_`);
    out[key] = clip(q, q.sounds, 0, q.sounds.length - 1);
  }
  return out;
}

// --- JSON への紐づけ ---
const CUE_FILES = { prep: "prep", narrationStart: "narration", qaIntro: "intro", turnOver: "turnover" };

function withAudio(q, path) {
  const next = {};
  for (const [key, value] of Object.entries(q)) {
    if (key === "audio") continue;
    next[key] = value;
    if (key === (q.promptJa ? "promptJa" : "prompt")) next.audio = path;
  }
  return next;
}

function linkSection(section, audioDir) {
  const path = (name) => `${audioDir}/${section.id}-${name}.mp3`;
  const next = {};
  for (const [key, value] of Object.entries(section)) {
    if (key === "cues") continue;
    next[key] = value;
    if (key === "card") {
      next.cues = Object.fromEntries(Object.entries(CUE_FILES).map(([k, name]) => [k, path(name)]));
    }
  }
  next.questions = section.questions.map((q) => (q.type === "qa" ? withAudio(q, path(`q${q.number}`)) : q));
  return next;
}

// --- main ---
let total = 0;
for (const folder of readdirSync(sourceRoot).sort()) {
  const match = folder.match(/^j1q_(\d{4})_0?(\d)$/);
  if (!match) continue;
  const session = `${match[1]}-${match[2]}`;
  if (onlySession && session !== onlySession) continue;

  const jsonPath = join(DATA_DIR, `pre1-${session}-interview.json`);
  if (!existsSync(jsonPath)) {
    console.log(`⏭️  ${session}: 面接データがないので飛ばします`);
    continue;
  }
  const raw = readFileSync(jsonPath, "utf-8");
  const eol = raw.includes("\r\n") ? "\r\n" : "\n"; // 差分が全行にならないよう改行コードを保つ
  const data = JSON.parse(raw);
  const audioDir = `audio/eiken/${data.id}`;
  let bytes = 0;

  // カードA は 39_、カードD は 45_ から始まる
  const cards = { a: 39, d: 45 };
  for (const section of data.sections) {
    const base = cards[section.id];
    if (!base) throw new Error(`${session}: カード "${section.id}" の音源の番号がわかりません`);
    const clips = await extractCard(join(sourceRoot, folder), base);
    if (!dryRun) mkdirSync(join(PUBLIC_DIR, audioDir), { recursive: true });
    for (const [name, buf] of Object.entries(clips)) {
      bytes += buf.length;
      if (!dryRun) writeFileSync(join(PUBLIC_DIR, audioDir, `${section.id}-${name}.mp3`), buf);
    }
  }

  data.sections = data.sections.map((s) => linkSection(s, audioDir));
  if (!dryRun) writeFileSync(jsonPath, JSON.stringify(data, null, 2).replace(/\n/g, eol) + eol, "utf-8");
  total += bytes;
  console.log(`✅ ${session}: ${(bytes / 1024 / 1024).toFixed(2)} MB`);
}
console.log(`\n合計 ${(total / 1024 / 1024).toFixed(1)} MB${dryRun ? "（--dry-run: 書き込みなし）" : ""}`);
