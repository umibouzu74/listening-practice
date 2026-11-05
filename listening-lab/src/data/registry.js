// 試験データレジストリ
// src/data/{examType}/*.json を自動で読み込む（JSONを置くだけで登録される）
//
// - 一覧画面用の「目次」（meta・セクション名・問題数）は vite.config.js の
//   exam-index プラグインがビルド時に作るので、最初の表示は軽い
// - 問題本文は回ごとに別ファイルに分割し、演習画面を開いたときに読み込む

import examIndex from 'virtual:exam-index';

const loaders = import.meta.glob('./*/*.json', { import: 'default' });

const byType = {};
const byId = {};
for (const entry of examIndex) {
  (byType[entry.examType] ||= []).push(entry);
  byId[entry.id] = entry;
}

/** データが揃っていない（下書き）試験セットか */
export function isDraft(examSet) {
  return examSet?.meta?.status === 'draft';
}

/** 英検二次試験（面接）形式の試験セットか。format がなければリスニング */
export function isInterview(examSet) {
  return examSet?.format === 'interview';
}

/** 指定した試験種別の全試験セット（目次）を返す */
export function getExamSets(examType) {
  return byType[examType] || [];
}

/** examId で試験セットの目次を返す（問題本文は含まない） */
export function getExamSummary(examId) {
  return byId[examId] || null;
}

/** 指定した試験種別の「演習可能な」試験セット件数を返す */
export function getExamCount(examType) {
  return getExamSets(examType).filter((s) => !isDraft(s)).length;
}

/** 試験セット内の総問題数（目次・本文どちらでも可） */
export function countQuestions(examSet) {
  return (examSet?.sections || []).reduce(
    (sum, s) => sum + (s.questionCount ?? s.questions?.length ?? 0),
    0
  );
}

const cache = new Map();

/** 問題本文を含む試験データを読み込む（読み込み済みならキャッシュを返す） */
export function loadExamSet(examId) {
  const entry = byId[examId];
  if (!entry || !loaders[entry.path]) return Promise.resolve(null);
  if (!cache.has(examId)) {
    const promise = loaders[entry.path]().catch((err) => {
      cache.delete(examId); // 通信エラー時は次回リトライできるように
      throw err;
    });
    cache.set(examId, promise);
  }
  return cache.get(examId);
}
