// 面接（英検二次試験）の練習履歴（localStorage）
// リスニングの学習履歴（history.js の bestScore など）とは別のキーに保存し、互いに影響しない。
//
// キー: `${examId}__${cardId}`
// 値: {
//   lastAttempt: ISO 日時,
//   practiceCount: 練習形式で回答した回数（パート（ナレーション・No.1〜4）ごとに1回。のべ回数）,
//   practiceSteps: { [stepId]: count }             // 練習形式で回答したパートと回数（あとから追加。古い記録にはない）
//   practiceScores: { [stepId]: { score, at } }   // 練習形式での直近の自己採点
//   exams: [{ id, at, scores: { [partId]: score }, total?, maxTotal? }]
//          // 本番形式を最後まで通した回（新しい順・最大 MAX_EXAMS 件）。partId はステップの id と 'attitude'
//          // total / maxTotal は全パートを採点したときだけ入る（アティチュードを採点するようになる前の回は 35 点満点）
// }
//
// 古い記録との互換: practiceSteps がない記録は practiceScores のキーと本番形式の回から実施したパートを推定する。

import { INTERVIEW_CONFIG } from './examConfig';

const STORAGE_KEY = 'listening-lab-interview-history';
const MAX_EXAMS = 20;

/** 本番形式の自己採点で、パートと並べて採点するアティチュードの ID */
export const ATTITUDE_ID = 'attitude';

function readStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : {};
    return data && typeof data === 'object' ? data : {};
  } catch {
    return {};
  }
}

function writeStore(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // 容量超過・プライベートモードなどでは保存をあきらめる（練習自体は続けられる）
  }
}

function key(examId, cardId) {
  return `${examId}__${cardId}`;
}

function update(examId, cardId, fn) {
  const store = readStore();
  const prev = store[key(examId, cardId)] || {};
  const next = fn({
    practiceCount: 0,
    practiceScores: {},
    exams: [],
    ...prev,
  });
  store[key(examId, cardId)] = next;
  writeStore(store);
  return next;
}

/** ステップの満点（ナレーション 15、No.1〜4 は各 5） */
export function maxScoreOf(question) {
  return question.type === 'narration' ? INTERVIEW_CONFIG.maxScores.narration : INTERVIEW_CONFIG.maxScores.qa;
}

/**
 * 本番形式で採点するパートの一覧: [{ id, max }]。
 * ナレーション・No.1〜4 にアティチュード（0〜3）を加え、合計 38 点満点にする。
 */
export function examScoreParts(steps) {
  return [
    ...steps.map((q) => ({ id: q.id, max: maxScoreOf(q) })),
    { id: ATTITUDE_ID, max: INTERVIEW_CONFIG.maxScores.attitude },
  ];
}

/** 自己採点の合計。parts（[{ id, max }] または問題の配列）がすべて採点済みのときだけ数値を返す */
export function totalScore(scores, parts) {
  if (!scores || parts.some((p) => typeof scores[p.id] !== 'number')) return null;
  return parts.reduce((sum, p) => sum + scores[p.id], 0);
}

/** 満点の合計（parts は examScoreParts の結果） */
export function maxTotalOf(parts) {
  return parts.reduce((sum, p) => sum + p.max, 0);
}

export function getInterviewRecord(examId, cardId) {
  const rec = readStore()[key(examId, cardId)];
  return rec && rec.lastAttempt ? rec : null;
}

/** 練習形式で1つのパートに1回答えた（録音の有無は問わない） */
export function recordPracticeAttempt(examId, cardId, stepId) {
  update(examId, cardId, (rec) => {
    const practiceSteps = { ...rec.practiceSteps };
    if (stepId) practiceSteps[stepId] = (practiceSteps[stepId] || 0) + 1;
    return {
      ...rec,
      practiceCount: (rec.practiceCount || 0) + 1,
      practiceSteps,
      lastAttempt: new Date().toISOString(),
    };
  });
}

/** 練習形式での自己採点（null で取り消し） */
export function setPracticeScore(examId, cardId, stepId, score) {
  update(examId, cardId, (rec) => {
    const practiceScores = { ...rec.practiceScores };
    if (typeof score === 'number') practiceScores[stepId] = { score, at: new Date().toISOString() };
    else delete practiceScores[stepId];
    return { ...rec, practiceScores, lastAttempt: rec.lastAttempt || new Date().toISOString() };
  });
}

/** 本番形式を最後まで通した。自己採点を書き込むための回の ID を返す */
export function recordExamFinished(examId, cardId) {
  const at = new Date().toISOString();
  const id = `${Date.now()}`;
  update(examId, cardId, (rec) => ({
    ...rec,
    lastAttempt: at,
    exams: [{ id, at, scores: {} }, ...(rec.exams || [])].slice(0, MAX_EXAMS),
  }));
  return id;
}

/**
 * 本番形式のある回の自己採点（null で取り消し）。
 * parts（examScoreParts の結果）を渡すと、全パート採点済みのときの合計と満点も保存する。
 */
export function setExamScore(examId, cardId, examRunId, partId, score, parts) {
  update(examId, cardId, (rec) => ({
    ...rec,
    exams: (rec.exams || []).map((e) => {
      if (e.id !== examRunId) return e;
      const scores = { ...e.scores };
      if (typeof score === 'number') scores[partId] = score;
      else delete scores[partId];
      const total = totalScore(scores, parts);
      return { ...e, scores, total, maxTotal: maxTotalOf(parts) };
    }),
  }));
}

/** 実施したパート（ナレーション・No.1〜4）の数。本番形式を1回でも通していれば全パート */
function countDoneParts(record, totalParts) {
  if (!record) return 0;
  if ((record.exams || []).length > 0) return totalParts;
  const ids = new Set([...Object.keys(record.practiceSteps || {}), ...Object.keys(record.practiceScores || {})]);
  return Math.min(ids.size, totalParts);
}

function scoredExam(e) {
  return typeof e?.total === 'number' && typeof e.maxTotal === 'number' && e.maxTotal > 0;
}

/**
 * 一覧に出す要約（未練習なら null）。totalParts はカードのパート数（ナレーション + No.1〜4 = 5）
 * {
 *   doneParts, totalParts, complete（全パート実施した）,
 *   practiceCount（練習形式でののべ回答数）, examCount（本番形式を通した回数）,
 *   lastExam / bestExam: { total, maxTotal } | null（全パートを自己採点した回のうち最新 / 最高）,
 *   lastExamScored（最新の本番形式を採点し終えたか）, lastAttempt
 * }
 */
export function summarizeInterview(record, totalParts = 5) {
  if (!record) return null;
  const exams = record.exams || [];
  const scored = exams.filter(scoredExam);
  const best = scored.reduce(
    (b, e) => (!b || e.total / e.maxTotal > b.total / b.maxTotal ? e : b),
    null
  );
  const doneParts = countDoneParts(record, totalParts);
  return {
    doneParts,
    totalParts,
    complete: totalParts > 0 && doneParts >= totalParts,
    examCount: exams.length,
    practiceCount: record.practiceCount || 0,
    lastExam: scored[0] ? { total: scored[0].total, maxTotal: scored[0].maxTotal } : null,
    bestExam: best ? { total: best.total, maxTotal: best.maxTotal } : null,
    lastExamScored: exams.length > 0 && scoredExam(exams[0]),
    lastAttempt: record.lastAttempt,
  };
}

/** カードを全パート練習済みか（一覧の「済」・練習済みの枚数に使う） */
export function isCardComplete(examId, card) {
  const summary = summarizeInterview(getInterviewRecord(examId, card.id), card.questionCount ?? 5);
  return !!summary?.complete;
}
