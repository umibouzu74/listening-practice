// 試験データレジストリ
// src/data/{examType}/*.json を自動で読み込む（JSONを置くだけで登録される）

const modules = import.meta.glob('./*/*.json', { eager: true, import: 'default' });

const examSets = Object.entries(modules)
  .map(([path, data]) => {
    if (!data || !data.examType || !data.id || !Array.isArray(data.sections)) {
      if (import.meta.env.DEV) {
        console.warn(`[registry] スキップ: ${path}（examType / id / sections が不足）`);
      }
      return null;
    }
    return data;
  })
  .filter(Boolean);

const byType = {};
const byId = {};
for (const examSet of examSets) {
  (byType[examSet.examType] ||= []).push(examSet);
  byId[examSet.id] = examSet;
}

/** データが揃っていない（下書き）試験セットか */
export function isDraft(examSet) {
  return examSet?.meta?.status === 'draft';
}

/** 指定した試験種別の全試験セットを返す */
export function getExamSets(examType) {
  return byType[examType] || [];
}

/** examId で特定の試験セットを返す */
export function getExamSet(examId) {
  return byId[examId] || null;
}

/** 指定した試験種別の「演習可能な」試験セット件数を返す */
export function getExamCount(examType) {
  return getExamSets(examType).filter((s) => !isDraft(s)).length;
}

/** 試験セット内の総問題数 */
export function countQuestions(examSet) {
  return (examSet?.sections || []).reduce((sum, s) => sum + (s.questions?.length || 0), 0);
}
