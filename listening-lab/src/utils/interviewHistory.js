// 面接（英検二次試験）の練習履歴（localStorage）
// リスニングの学習履歴（history.js の bestScore など）とは別のキーに保存し、互いに影響しない。
//
// キー: `${examId}__${cardId}`
// 値: {
//   lastAttempt: ISO 日時,
//   practiceCount: 練習形式で回答した回数（ステップ単位）,
//   practiceScores: { [stepId]: { score, at } }   // 練習形式での直近の自己採点
//   exams: [{ id, at, scores: { [stepId]: score } }] // 本番形式を最後まで通した回（新しい順・最大 MAX_EXAMS 件）
// }

import { INTERVIEW_CONFIG } from './examConfig';

const STORAGE_KEY = 'listening-lab-interview-history';
const MAX_EXAMS = 20;

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

/** 自己採点の合計。すべてのステップが採点済みのときだけ数値を返す */
export function totalScore(scores, steps) {
  if (!scores || steps.some((q) => typeof scores[q.id] !== 'number')) return null;
  return steps.reduce((sum, q) => sum + scores[q.id], 0);
}

export function getInterviewRecord(examId, cardId) {
  const rec = readStore()[key(examId, cardId)];
  return rec && rec.lastAttempt ? rec : null;
}

/** 練習形式で1回答えた（録音の有無は問わない） */
export function recordPracticeAttempt(examId, cardId) {
  update(examId, cardId, (rec) => ({
    ...rec,
    practiceCount: (rec.practiceCount || 0) + 1,
    lastAttempt: new Date().toISOString(),
  }));
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
 * steps（カードのナレーション〜No.4）を渡すと、全ステップ採点済みのときの合計も保存する。
 */
export function setExamScore(examId, cardId, examRunId, stepId, score, steps) {
  update(examId, cardId, (rec) => ({
    ...rec,
    exams: (rec.exams || []).map((e) => {
      if (e.id !== examRunId) return e;
      const scores = { ...e.scores };
      if (typeof score === 'number') scores[stepId] = score;
      else delete scores[stepId];
      return {
        ...e,
        scores,
        total: totalScore(scores, steps),
        maxTotal: steps.reduce((sum, q) => sum + maxScoreOf(q), 0),
      };
    }),
  }));
}

/**
 * 一覧に出す要約: { examCount, practiceCount, bestTotal, lastTotal, maxTotal, lastAttempt }
 * bestTotal / lastTotal は、本番形式で全ステップを自己採点した回だけから計算する
 */
export function summarizeInterview(record) {
  if (!record) return null;
  const exams = record.exams || [];
  const scored = exams.filter((e) => typeof e.total === 'number');
  return {
    examCount: exams.length,
    practiceCount: record.practiceCount || 0,
    bestTotal: scored.length ? Math.max(...scored.map((e) => e.total)) : null,
    lastTotal: scored.length ? scored[0].total : null,
    maxTotal: scored[0]?.maxTotal ?? null,
    lastAttempt: record.lastAttempt,
  };
}
