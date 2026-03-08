// 試験データレジストリ
// data/{examType}/ 配下のJSONデータを集約管理する
// 新しい試験データを追加する場合は examSets 配列に追加する

import eikenPre120221 from "./eiken/pre1-2022-1.json";
import eikenPre120222 from "./eiken/pre1-2022-2.json";
import eikenPre120223 from "./eiken/pre1-2022-3.json";
import eikenPre120231 from "./eiken/pre1-2023-1.json";
import eikenPre120232 from "./eiken/pre1-2023-2.json";
import eikenPre120233 from "./eiken/pre1-2023-3.json";
import eikenPre120241 from "./eiken/pre1-2024-1.json";
import eikenPre120242 from "./eiken/pre1-2024-2.json";

const examSets = [eikenPre120221, eikenPre120222, eikenPre120223, eikenPre120231, eikenPre120232, eikenPre120233, eikenPre120241, eikenPre120242];

// examType ごとにグルーピングしたマップを構築
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
